import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../auth/auth.service';
import { ActivityService } from './activity.service';
import { WorkflowInstance } from './activity.model';

// ── Queue definitions ───────────────────────────────────────────────────────

export type QueueTab = 'admin1' | 'admin2' | 'admin3' | 'completed' | 'rejected';

interface QueueMeta {
  code: string;
  labelKey: string;
  icon: string;
  /** false for terminal monitor-only queues (COMPLETED / REJECTED) */
  actionable: boolean;
}

const QUEUE_META: Record<QueueTab, QueueMeta> = {
  admin1:    { code: 'STAGE1_QUEUE',     labelKey: 'ACTIVITY.ADMIN1_QUEUE',    icon: 'person_pin',   actionable: true  },
  admin2:    { code: 'STAGE2_QUEUE',     labelKey: 'ACTIVITY.ADMIN2_QUEUE',    icon: 'verified_user', actionable: true  },
  admin3:    { code: 'STAGE3_QUEUE',     labelKey: 'ACTIVITY.ADMIN3_QUEUE',    icon: 'manage_accounts', actionable: true  },
  completed: { code: 'COMPLETED_QUEUE',  labelKey: 'ACTIVITY.COMPLETED_QUEUE', icon: 'check_circle', actionable: false },
  rejected:  { code: 'REJECTED_QUEUE',   labelKey: 'ACTIVITY.REJECTED_QUEUE',  icon: 'cancel',       actionable: false },
};

const ALL_TABS: QueueTab[] = ['admin1', 'admin2', 'admin3', 'completed', 'rejected'];

// ── Column sets ─────────────────────────────────────────────────────────────
const WORK_COLUMNS    = ['serviceType', 'businessKey', 'currentState', 'status', 'assignedTo', 'submitted', 'actions'];
const MONITOR_COLUMNS = ['serviceType', 'businessKey', 'currentState', 'finalStatus', 'submitted'];

// ── Service-type filter options ──────────────────────────────────────────────
interface ServiceTypeOption { value: string; labelKey: string; }
const SERVICE_TYPE_OPTIONS: ServiceTypeOption[] = [
  { value: 'ALL',                 labelKey: 'ACTIVITY.FILTER_TYPE_ALL' },
  { value: 'InsuredRegistration', labelKey: 'ACTIVITY.CASE_TYPE.INSURED_REGISTRATION' },
  { value: 'UpdateSalary',        labelKey: 'ACTIVITY.CASE_TYPE.SALARY_UPDATE' },
];

@Component({
  selector: 'app-activity',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    TranslateModule,
  ],
  templateUrl: './activity.html',
  styleUrl: './activity.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityComponent {
  private activityService = inject(ActivityService);
  private authService     = inject(AuthService);
  private router          = inject(Router);
  private snackBar        = inject(MatSnackBar);
  private translate       = inject(TranslateService);

  readonly currentUser = this.authService.currentUser;

  // Expose to template
  readonly allTabs  = ALL_TABS;
  readonly queueMeta = QUEUE_META;

  activeTab = signal<QueueTab>('admin1');

  /** Per-tab loading flags */
  private readonly loading = signal<Record<QueueTab, boolean>>({
    admin1: true, admin2: true, admin3: true, completed: true, rejected: true,
  });

  /** Per-tab task lists */
  private readonly tasks = signal<Record<QueueTab, WorkflowInstance[]>>({
    admin1: [], admin2: [], admin3: [], completed: [], rejected: [],
  });

  claiming = signal<string | null>(null);

  /** Text typed in the search box (matches businessKey). */
  filterSearch = signal('');
  /** Workflow definition name to filter by, or 'ALL'. */
  filterType   = signal('ALL');

  // Expose filter options to template
  readonly serviceTypeOptions = SERVICE_TYPE_OPTIONS;

  // ── Derived ───────────────────────────────────────────────────────────────

  readonly activeTasks = computed(() => this.tasks()[this.activeTab()]);

  readonly activeLoading = computed(() => this.loading()[this.activeTab()]);

  readonly isActiveMonitor = computed(() => !QUEUE_META[this.activeTab()].actionable);

  readonly columns = computed(() =>
    this.isActiveMonitor() ? MONITOR_COLUMNS : WORK_COLUMNS
  );

  /** activeTasks narrowed by the current search and type filter. */
  readonly filteredTasks = computed(() => {
    const search = this.filterSearch().trim().toLowerCase();
    const type   = this.filterType();
    return this.activeTasks().filter(t => {
      const matchSearch = !search || t.businessKey.toLowerCase().includes(search);
      const matchType   = type === 'ALL' || t.workflowDefinition.name === type;
      return matchSearch && matchType;
    });
  });

  taskCount = (tab: QueueTab) => this.tasks()[tab].length;
  isLoading  = (tab: QueueTab) => this.loading()[tab];

  // ── Init ──────────────────────────────────────────────────────────────────

  constructor() {
    ALL_TABS.forEach(tab => this.loadQueue(tab));
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  setTab(tab: QueueTab): void {
    this.activeTab.set(tab);
    this.clearFilters();
  }

  clearFilters(): void {
    this.filterSearch.set('');
    this.filterType.set('ALL');
  }

  setFilterSearch(value: string): void { this.filterSearch.set(value); }
  setFilterType(value: string): void   { this.filterType.set(value); }

  /** Maps a workflow definition name to its i18n label key. */
  serviceTypeLabelKey(name: string): string {
    switch (name) {
      case 'InsuredRegistration': return 'ACTIVITY.CASE_TYPE.INSURED_REGISTRATION';
      case 'UpdateSalary':        return 'ACTIVITY.CASE_TYPE.SALARY_UPDATE';
      default:                    return name;
    }
  }

  /** Returns a CSS modifier class for the service-type badge. */
  serviceTypeBadgeClass(name: string): string {
    switch (name) {
      case 'InsuredRegistration': return 'svc-insured-reg';
      case 'UpdateSalary':        return 'svc-salary-update';
      default:                    return 'svc-default';
    }
  }

  claim(instance: WorkflowInstance): void {
    const user = this.currentUser();
    if (!user) return;

    this.claiming.set(instance.id);
    this.activityService.claim(instance.id, user).subscribe({
      next: () => {
        this.claiming.set(null);
        this.snackBar.open(this.translate.instant('ACTIVITY.CLAIMED_SUCCESS'), 'OK', { duration: 3000 });
        this.loadQueue(this.activeTab());
      },
      error: err => {
        this.claiming.set(null);
        this.snackBar.open(
          err.error?.message ?? this.translate.instant('ACTIVITY.CLAIM_ERROR'),
          'OK',
          { duration: 4000 },
        );
      },
    });
  }

  openCase(instance: WorkflowInstance): void {
    this.router.navigate(['/dashboard/activity', instance.id]);
  }

  canClaim(instance: WorkflowInstance): boolean { return !instance.locked; }

  isClaimedByMe(instance: WorkflowInstance): boolean {
    return instance.locked && instance.assignedToUser === this.currentUser();
  }

  formatDate(date: string | null | undefined): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString(undefined, {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private loadQueue(tab: QueueTab): void {
    const user  = this.currentUser() ?? 'SYSTEM';
    const queue = QUEUE_META[tab].code;

    this.loading.update(s => ({ ...s, [tab]: true }));
    this.activityService.getQueue(queue, user).subscribe({
      next:  items => this.setQueue(tab, items, false),
      error: ()    => this.setQueue(tab, [],    false),
    });
  }

  private setQueue(tab: QueueTab, items: WorkflowInstance[], loading: boolean): void {
    this.tasks.update(s   => ({ ...s, [tab]: items   }));
    this.loading.update(s => ({ ...s, [tab]: loading }));
  }
}
