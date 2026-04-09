import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { switchMap } from 'rxjs/operators';
import { AuthService } from '../../auth/auth.service';
import { ActivityService } from '../activity.service';
import { CanDeactivateComponent } from '../../shared/attachment/draft-cleanup.guard';
import { UploadTrackingService } from '../../shared/attachment/upload-tracking.service';
import { CaseHistoryEntry, WorkflowInstance } from '../activity.model';
import { Insured, InsuredFormControl, InsuredRequest } from '../../insured/insured.model';
import { InsuredService } from '../../insured/insured.service';
import { RegisterInsuredComponent } from '../../insured/register-insured/register-insured';
import { AttachmentUploadComponent } from '../../shared/attachment/attachment-upload/attachment-upload';

export type CaseTab = 'workflow' | 'caseData' | 'documents' | 'history';
export type PendingAction = 'APPROVE' | 'REJECT' | 'RETURN';

/** Maps an action name to a Material icon and colour class. */
export interface ActionMeta { icon: string; colorClass: string; }

const ACTION_META: Record<string, ActionMeta> = {
  APPROVE: { icon: 'check_circle',  colorClass: 'action-approve' },
  SUBMIT:  { icon: 'send',          colorClass: 'action-submit'  },
  RETURN:  { icon: 'undo',          colorClass: 'action-return'  },
  REJECT:  { icon: 'cancel',        colorClass: 'action-reject'  },
  CLAIM:   { icon: 'lock',          colorClass: 'action-claim'   },
};
const DEFAULT_ACTION_META: ActionMeta = { icon: 'change_circle', colorClass: 'action-default' };

interface FieldRow { label: string; value: string; }

const EDITABLE_QUEUE = 'STAGE1_QUEUE';

@Component({
  selector: 'app-case-detail',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslateModule,
    RegisterInsuredComponent,
    AttachmentUploadComponent,
  ],
  templateUrl: './case-detail.html',
  styleUrl: './case-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CaseDetailComponent implements CanDeactivateComponent {
  private activityService  = inject(ActivityService);
  private insuredService   = inject(InsuredService);
  private authService      = inject(AuthService);
  private route            = inject(ActivatedRoute);
  private router           = inject(Router);
  private snackBar         = inject(MatSnackBar);
  private translate        = inject(TranslateService);
  private uploadTracking   = inject(UploadTrackingService);

  protected readonly currentUser = this.authService.currentUser;

  // ── State ──────────────────────────────────────────────────────────────────

  loading   = signal(true);
  saving    = signal(false);
  submitting = signal(false);   // in-flight confirm request
  instance  = signal<WorkflowInstance | null>(null);
  activeTab = signal<CaseTab>('workflow');

  historyLoading = signal(false);
  historyLoaded  = signal(false);
  history        = signal<CaseHistoryEntry[]>([]);

  /**
   * Set to a non-null action when the user clicks Approve / Reject / Return.
   * The inline confirmation panel is visible while this is set.
   */
  pendingAction = signal<PendingAction | null>(null);

  /** Free-text notes the user types in the confirmation panel. */
  actionNotes = signal('');

  // ── Derived ───────────────────────────────────────────────────────────────

  readonly isEditable = computed(() =>
    this.instance()?.currentState.queue?.code === EDITABLE_QUEUE
  );

  readonly caseControl = computed((): InsuredFormControl =>
    this.isEditable() ? { mode: 'edit' } : { mode: 'review' }
  );

  readonly isInsuredRegistration = computed(() =>
    this.instance()?.workflowDefinition.name === 'InsuredRegistration'
  );

  /** Service type derived from the workflow definition name — used for the Documents tab. */
  readonly documentsServiceType = computed((): string =>
    this.instance()?.workflowDefinition.name ?? 'General'
  );

  /**
   * Documents tab is read-only once the case reaches a final state.
   * During active workflow stages anyone can add supporting documents.
   */
  readonly docsReadonly = computed(() =>
    !!this.instance()?.currentState.finalState
  );

  /** True when the current user holds the lock and the case is not in a final state. */
  readonly canAct = computed(() => {
    const inst = this.instance();
    const user = this.currentUser();
    return !!inst && !!user
      && inst.locked
      && inst.assignedToUser === user
      && !inst.currentState.finalState;
  });

  readonly workflowRows = computed((): FieldRow[] => {
    const i = this.instance();
    if (!i) return [];
    return [
      { label: this.translate.instant('CASE_DETAIL.INSTANCE_ID'),  value: i.id },
      { label: this.translate.instant('CASE_DETAIL.WORKFLOW'),      value: `${i.workflowDefinition.name} v${i.definitionVersion}` },
      { label: this.translate.instant('CASE_DETAIL.BUSINESS_KEY'), value: i.businessKey },
      { label: this.translate.instant('CASE_DETAIL.CURRENT_STAGE'),value: i.currentState.key },
      { label: this.translate.instant('CASE_DETAIL.QUEUE'),        value: i.currentState.queue?.code ?? '—' },
      { label: this.translate.instant('CASE_DETAIL.STATUS'),       value: i.locked
          ? this.translate.instant('ACTIVITY.STATUS_CLAIMED')
          : this.translate.instant('ACTIVITY.STATUS_FREE') },
      { label: this.translate.instant('CASE_DETAIL.ASSIGNED_TO'),  value: i.assignedToUser ?? '—' },
      { label: this.translate.instant('CASE_DETAIL.ASSIGNED_AT'),  value: this.formatDate(i.assignedAt) },
      { label: this.translate.instant('CASE_DETAIL.CREATED_AT'),   value: this.formatDate(i.createdAt) },
      { label: this.translate.instant('CASE_DETAIL.UPDATED_AT'),   value: this.formatDate(i.updatedAt) },
    ];
  });

  readonly caseDataRows = computed((): FieldRow[] => {
    const raw = this.instance()?.dataJson;
    if (!raw) return [];
    try {
      return this.flattenToRows(JSON.parse(raw));
    } catch {
      return [{ label: 'Raw', value: raw }];
    }
  });

  // ── Init ──────────────────────────────────────────────────────────────────

  constructor() {
    const id = this.route.snapshot.paramMap.get('instanceId');
    if (!id) { this.loading.set(false); return; }

    this.activityService.getInstance(id).subscribe({
      next:  i  => { this.instance.set(i); this.loading.set(false); },
      error: () => {
        this.loading.set(false);
        this.snackBar.open(this.translate.instant('CASE_DETAIL.LOAD_ERROR'), 'OK', { duration: 3000 });
      },
    });
  }

  // ── Navigation / helpers ──────────────────────────────────────────────────

  setTab(tab: CaseTab): void {
    this.activeTab.set(tab);
    if (tab === 'history' && !this.historyLoaded()) this.loadHistory();
  }

  goBack(): void { this.router.navigate(['/dashboard/activity']); }

  /**
   * Blocks navigation only when a file is currently being transmitted.
   * Unlike the form routes there is no draft cleanup here — case-mode uploads
   * are linked directly to the case the moment they succeed, so there are no
   * orphan files to discard.
   */
  canDeactivate(): boolean {
    if (this.uploadTracking.uploadsInProgress()) {
      this.snackBar.open(
        this.translate.instant('ATTACHMENTS.UPLOAD_IN_PROGRESS'),
        'OK',
        { duration: 3000 },
      );
      return false;
    }
    return true;
  }

  actionMeta(action: string): ActionMeta {
    return ACTION_META[action.toUpperCase()] ?? DEFAULT_ACTION_META;
  }

  isLastHistoryEntry(index: number): boolean {
    return index === this.history().length - 1;
  }

  // ── Action confirmation flow ──────────────────────────────────────────────

  /**
   * Called when the user clicks Approve / Reject / Return.
   * Opens the inline notes panel — does NOT submit anything yet.
   */
  requestAction(action: PendingAction): void {
    this.pendingAction.set(action);
    this.actionNotes.set('');
  }

  cancelAction(): void {
    this.pendingAction.set(null);
    this.actionNotes.set('');
  }

  updateNotes(value: string): void {
    this.actionNotes.set(value);
  }

  /**
   * Fired when the user clicks "Confirm" in the notes panel.
   * Triggers the workflow action, passes the notes, then reloads.
   */
  confirmAction(): void {
    const action = this.pendingAction();
    const inst   = this.instance();
    const user   = this.currentUser();
    if (!action || !inst || !user) return;

    this.submitting.set(true);
    this.activityService.trigger(inst.id, action, user, this.actionNotes()).pipe(
      switchMap(() => this.activityService.getInstance(inst.id))
    ).subscribe({
      next: refreshed => {
        this.instance.set(refreshed);
        this.submitting.set(false);
        this.pendingAction.set(null);
        this.actionNotes.set('');
        // Invalidate cached history so the new entry loads on next tab open
        this.historyLoaded.set(false);
        this.history.set([]);
        const key = action === 'APPROVE' ? 'CASE_DETAIL.APPROVE_SUCCESS'
                  : action === 'REJECT'  ? 'CASE_DETAIL.REJECT_SUCCESS'
                  :                        'CASE_DETAIL.RETURN_SUCCESS';
        this.snackBar.open(this.translate.instant(key), 'OK', { duration: 3000 });
      },
      error: err => {
        this.submitting.set(false);
        this.snackBar.open(
          err.error?.message ?? this.translate.instant('CASE_DETAIL.ACTION_ERROR'),
          'OK',
          { duration: 4000 },
        );
      },
    });
  }

  // ── Form events from pluggable sub-components ─────────────────────────────

  /** Called by RegisterInsuredComponent when the reviewer clicks its Approve button. */
  onApproved(): void { this.requestAction('APPROVE'); }

  /** Called by RegisterInsuredComponent when the reviewer clicks its Reject button. */
  onRejected(): void { this.requestAction('REJECT'); }

  onSaved(request: InsuredRequest): void {
    const inst = this.instance();
    if (!inst) return;

    const insuredId = Number(inst.businessKey);
    const parsed    = this.parseDataJson(inst.dataJson ?? null);
    if (!parsed?.employerId) return;

    this.saving.set(true);
    this.insuredService.update(parsed.employerId, insuredId, request).pipe(
      switchMap(updated => this.activityService.updateInstanceData(inst.id, updated))
    ).subscribe({
      next: () => {
        this.activityService.getInstance(inst.id).subscribe(refreshed => {
          this.instance.set(refreshed);
          this.saving.set(false);
          this.snackBar.open(this.translate.instant('CASE_DETAIL.SAVE_SUCCESS'), 'OK', { duration: 3000 });
        });
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.open(this.translate.instant('CASE_DETAIL.SAVE_ERROR'), 'OK', { duration: 4000 });
      },
    });
  }

  // ── Formatting ─────────────────────────────────────────────────────────────

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    return new Date(value).toLocaleString(undefined, {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private loadHistory(): void {
    const inst = this.instance();
    if (!inst) return;
    this.historyLoading.set(true);
    this.activityService.getHistory(inst.id).subscribe({
      next: entries => {
        this.history.set(entries);
        this.historyLoaded.set(true);
        this.historyLoading.set(false);
      },
      error: () => {
        this.historyLoading.set(false);
        this.snackBar.open(this.translate.instant('CASE_DETAIL.HISTORY_LOAD_ERROR'), 'OK', { duration: 3000 });
      },
    });
  }

  private parseDataJson(raw: string | null): Insured | null {
    if (!raw) return null;
    try { return JSON.parse(raw) as Insured; }
    catch { return null; }
  }

  /**
   * Fields that are intentionally omitted from the Case Data tab because they
   * are surfaced more meaningfully elsewhere (e.g. notes → History timeline).
   */
  private static readonly CASE_DATA_EXCLUDED = new Set(['notes']);

  private flattenToRows(obj: Record<string, unknown>, prefix = ''): FieldRow[] {
    const rows: FieldRow[] = [];
    for (const [key, val] of Object.entries(obj)) {
      if (val === null || val === undefined) continue;
      if (CaseDetailComponent.CASE_DATA_EXCLUDED.has(key)) continue;
      const label = this.toLabel(prefix ? `${prefix}.${key}` : key);
      if (typeof val === 'object' && !Array.isArray(val)) {
        rows.push(...this.flattenToRows(val as Record<string, unknown>, key));
      } else {
        rows.push({ label, value: String(val) });
      }
    }
    return rows;
  }

  private toLabel(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/\./g, ' › ')
      .replace(/^./, s => s.toUpperCase())
      .trim();
  }
}
