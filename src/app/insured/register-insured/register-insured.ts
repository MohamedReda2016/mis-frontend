import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, startWith, switchMap } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DecimalPipe } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../auth/auth.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../core/confirm-dialog';
import { LanguageService } from '../../core/language/language.service';
import { EmployerContextService } from '../../employer/employer-context.service';
import { InsuredService } from '../insured.service';
import { EmployerService } from '../../employer/employer.service';
import { Insured, InsuredFieldConfig, InsuredFormControl, InsuredRequest } from '../insured.model';
import { SalaryConfig } from '../../employer/employer.model';
import { AttachmentUploadComponent } from '../../shared/attachment/attachment-upload/attachment-upload';
import { AttachmentApiService } from '../../shared/attachment/attachment.service';
import { CanDeactivateComponent } from '../../shared/attachment/draft-cleanup.guard';
import { UploadTrackingService } from '../../shared/attachment/upload-tracking.service';


const ARABIC_PATTERN = /^[\u0600-\u06FF\s\-]+$/;

function arabicOnly(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    return ARABIC_PATTERN.test(control.value) ? null : { arabicOnly: true };
  };
}

function pastDateValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const d = control.value instanceof Date ? control.value : new Date(control.value);
    return d < new Date() ? null : { futureDate: true };
  };
}

function ageRangeValidator(min: number, max: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const today = new Date();
    const dob = control.value instanceof Date ? control.value : new Date(control.value);
    let age = today.getFullYear() - dob.getFullYear();
    if (
      today.getMonth() < dob.getMonth() ||
      (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())
    ) age--;
    return age >= min && age <= max ? null : { ageRange: true };
  };
}

@Component({
  selector: 'app-register-insured',
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    MatButtonModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    TranslateModule,
    AttachmentUploadComponent,
  ],
  templateUrl: './register-insured.html',
  styleUrl: './register-insured.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterInsuredComponent implements OnInit, CanDeactivateComponent {
  protected authService   = inject(AuthService);
  private insuredService  = inject(InsuredService);
  private employerService = inject(EmployerService);
  private employerContext = inject(EmployerContextService);
  private router          = inject(Router);
  private dialog          = inject(MatDialog);
  private snackBar        = inject(MatSnackBar);
  private translate       = inject(TranslateService);
  private langService     = inject(LanguageService);
  private attachmentApi   = inject(AttachmentApiService);
  private uploadTracking  = inject(UploadTrackingService);

  protected employer = this.employerContext.selectedEmployer;

  // ── Language / direction ─────────────────────────────────
  /** Emits (as a number tick) each time ngx-translate finishes loading a new language. */
  private readonly _langTick = toSignal(
    this.translate.onLangChange.pipe(map(() => Date.now())),
    { initialValue: Date.now() },
  );

  /** True when the active UI language is Arabic (drives arrow icon + dir hints). */
  readonly isRtl = computed(() => this.langService.currentLang() === 'ar');

  /**
   * Reactive map of salary-component keys → translated labels.
   * Recomputes whenever the language changes so OnPush templates stay current.
   */
  readonly componentLabelMap = computed<Record<string, string>>(() => {
    this._langTick(); // establish reactivity dependency
    return {
      BASIC_SALARY:            this.translate.instant('REGISTER_INSURED.BASIC_SALARY'),
      CHILDREN_ALLOWANCE:      this.translate.instant('REGISTER_INSURED.CHILDREN_ALLOWANCE'),
      COMPLEMENTARY_ALLOWANCE: this.translate.instant('REGISTER_INSURED.COMPLEMENTARY_ALLOWANCE'),
      OTHER_ALLOWANCE:         this.translate.instant('REGISTER_INSURED.OTHER_ALLOWANCE'),
    };
  });

  // ── Inputs ──────────────────────────────────────────────
  /** Controls form behaviour: create (default), view (readonly), review (readonly + approve/reject), edit (editable + save/cancel). */
  control = input<InsuredFormControl>({ mode: 'create' });
  /** Raw JSON string (WorkflowInstance.dataJson) used to pre-fill the form in non-create modes. */
  dataJson = input<string | null>(null);
  /** When true, disables the Save button (e.g. parent is persisting data). */
  busy = input(false);

  // ── Outputs ─────────────────────────────────────────────
  approved = output<void>();
  rejected = output<void>();
  /** Emitted in edit mode when the user clicks Save and the form is valid. */
  saved = output<InsuredRequest>();

  // ── Mode helpers ────────────────────────────────────────
  readonly isCreate = computed(() => this.control().mode === 'create');
  readonly isReview = computed(() => this.control().mode === 'review');
  readonly isEdit   = computed(() => this.control().mode === 'edit');

  // ── State ───────────────────────────────────────────────
  initLoading = signal(true);
  submitting  = signal(false);
  /** Set to true on successful submission so the guard skips cleanup. */
  private submitted = signal(false);

  /** Stable UUID for this draft session — generated once on component creation. */
  readonly draftRequestId = crypto.randomUUID();

  salaryComponents = signal<SalaryConfig[]>([]);
  fieldConfig = signal<InsuredFieldConfig[]>([]);

  readonly today = new Date();
  readonly maxDob = new Date(new Date().setFullYear(new Date().getFullYear() - 18));
  readonly minDob = new Date(new Date().setFullYear(new Date().getFullYear() - 60));

  form = new FormGroup({
    memberIdSuffix: new FormControl('', { nonNullable: true }),
    emiratesId: new FormControl('', { nonNullable: true }),
    dateOfBirth: new FormControl<Date | null>(null),
    joiningDate: new FormControl<Date | null>(null),
    firstNameAr: new FormControl('', { nonNullable: true }),
    middleNameAr: new FormControl('', { nonNullable: true }),
    lastNameAr: new FormControl('', { nonNullable: true }),
    firstNameEn: new FormControl('', { nonNullable: true }),
    middleNameEn: new FormControl('', { nonNullable: true }),
    lastNameEn: new FormControl('', { nonNullable: true }),
    basicSalary: new FormControl<number | null>(null),
    childrenAllowance: new FormControl<number | null>(null),
    complementaryAllowance: new FormControl<number | null>(null),
    otherAllowance: new FormControl<number | null>(null),
    notes: new FormControl('', { nonNullable: true }),
  });

  private formValues = toSignal(
    this.form.valueChanges.pipe(startWith(this.form.value))
  );

  contributableBreakdown = computed(() => {
    const vals = this.formValues();
    const raw = this.form.getRawValue();
    return this.salaryComponents().map(comp => {
      const value = (() => {
        switch (comp.componentKey) {
          case 'BASIC_SALARY': return Number(vals?.basicSalary ?? raw.basicSalary) || 0;
          case 'CHILDREN_ALLOWANCE': return Number(vals?.childrenAllowance ?? raw.childrenAllowance) || 0;
          case 'COMPLEMENTARY_ALLOWANCE': return Number(vals?.complementaryAllowance ?? raw.complementaryAllowance) || 0;
          case 'OTHER_ALLOWANCE': return Number(vals?.otherAllowance ?? raw.otherAllowance) || 0;
          default: return 0;
        }
      })();
      const contribution = comp.enabled
        ? +(value * comp.percentage / 100).toFixed(2)
        : 0;
      return { comp, value, contribution };
    });
  });

  totalContributable = computed(() =>
    +this.contributableBreakdown()
      .reduce((sum, r) => sum + r.contribution, 0)
      .toFixed(2)
  );

  memberIdDuplicateError = signal(false);

  private initialized = false;

  constructor() {
    // Re-patch form when the parent reloads dataJson after a save (edit mode only).
    effect(() => {
      const raw = this.dataJson();
      if (this.initialized && this.isEdit()) {
        untracked(() => {
          this.patchFromInsured(this.parseDataJson(raw));
          this.form.markAsPristine();
        });
      }
    });
  }

  ngOnInit(): void {
    this.initialized = true;
    this.initForm();
  }

  // ── Init ────────────────────────────────────────────────

  private initForm(): void {
    if (this.isCreate()) {
      this.initFormCreate();
    } else {
      this.initFormNonCreate();
    }
  }

  private initFormCreate(): void {
    const employer = this.employer();
    if (!employer) {
      this.initLoading.set(false);
      return;
    }

    forkJoin({
      salary: this.employerService.getActiveSalaryConfig(employer.id).pipe(catchError(() => of([]))),
      fields: this.insuredService.getFieldConfig(employer.id).pipe(catchError(() => of([]))),
    }).subscribe(({ salary, fields }) => {
      this.salaryComponents.set(salary);
      this.fieldConfig.set(fields);
      this.applyValidators(fields);
      this.initLoading.set(false);
    });

    this.form.controls.dateOfBirth.addValidators([
      Validators.required,
      pastDateValidator(),
      ageRangeValidator(18, 60),
    ]);
    this.form.controls.joiningDate.addValidators([Validators.required, pastDateValidator()]);
    this.form.controls.basicSalary.addValidators([Validators.required, Validators.min(0.01)]);

    for (const key of ['firstNameAr', 'middleNameAr', 'lastNameAr'] as const) {
      this.form.controls[key].addValidators([Validators.maxLength(50), arabicOnly()]);
    }
    for (const key of ['firstNameEn', 'middleNameEn', 'lastNameEn'] as const) {
      this.form.controls[key].addValidators(Validators.maxLength(50));
    }

    const strategy = employer.memberIdStrategy;
    if (strategy === 'MANUAL_PREFIX') {
      this.form.controls.memberIdSuffix.addValidators([
        Validators.required,
        Validators.pattern(/^\d{4,10}$/),
      ]);
    } else if (strategy === 'EMIRATES_ID') {
      this.form.controls.emiratesId.addValidators([Validators.required]);
    }
  }

  private initFormNonCreate(): void {
    const data = this.parseDataJson(this.dataJson());
    this.patchFromInsured(data);

    if (this.isEdit()) {
      // Edit: keep form enabled, lock only the identifier field
      this.form.controls.memberIdSuffix.disable({ emitEvent: false });
      this.addEditValidators();
    } else {
      // View / Review: everything readonly
      this.form.disable({ emitEvent: false });
    }

    const employerId = data?.employerId;
    if (!employerId) {
      this.initLoading.set(false);
      return;
    }

    forkJoin({
      salary: this.employerService.getActiveSalaryConfig(employerId).pipe(catchError(() => of([]))),
      fields: this.insuredService.getFieldConfig(employerId).pipe(catchError(() => of([]))),
    }).subscribe(({ salary, fields }) => {
      this.salaryComponents.set(salary);
      this.fieldConfig.set(fields);
      if (this.isEdit()) {
        this.applyValidators(fields);
      }
      this.initLoading.set(false);
    });
  }

  private addEditValidators(): void {
    this.form.controls.dateOfBirth.addValidators([
      Validators.required, pastDateValidator(), ageRangeValidator(18, 60),
    ]);
    this.form.controls.joiningDate.addValidators([Validators.required, pastDateValidator()]);
    this.form.controls.basicSalary.addValidators([Validators.required, Validators.min(0.01)]);
    for (const key of ['firstNameAr', 'middleNameAr', 'lastNameAr'] as const) {
      this.form.controls[key].addValidators([Validators.maxLength(50), arabicOnly()]);
    }
    for (const key of ['firstNameEn', 'middleNameEn', 'lastNameEn'] as const) {
      this.form.controls[key].addValidators(Validators.maxLength(50));
    }
  }

  private applyValidators(fields: InsuredFieldConfig[]): void {
    const controlMap: Record<string, keyof typeof this.form.controls> = {
      first_name_ar: 'firstNameAr',
      middle_name_ar: 'middleNameAr',
      last_name_ar: 'lastNameAr',
      first_name_en: 'firstNameEn',
      middle_name_en: 'middleNameEn',
      last_name_en: 'lastNameEn',
    };
    for (const entry of fields) {
      const controlName = controlMap[entry.fieldKey];
      if (controlName && entry.mandatory) {
        this.form.controls[controlName].addValidators(Validators.required);
        this.form.controls[controlName].updateValueAndValidity({ emitEvent: false });
      }
    }
  }

  // ── Helpers ─────────────────────────────────────────────

  private parseDataJson(raw: string | null): Insured | null {
    if (!raw) return null;
    try { return JSON.parse(raw) as Insured; }
    catch { return null; }
  }

  private patchFromInsured(data: Insured | null): void {
    if (!data) return;
    this.form.patchValue({
      memberIdSuffix: data.memberId,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      joiningDate: data.joiningDate ? new Date(data.joiningDate) : null,
      firstNameAr: data.firstNameAr ?? '',
      middleNameAr: data.middleNameAr ?? '',
      lastNameAr: data.lastNameAr ?? '',
      firstNameEn: data.firstNameEn ?? '',
      middleNameEn: data.middleNameEn ?? '',
      lastNameEn: data.lastNameEn ?? '',
      basicSalary: data.basicSalary ?? null,
      childrenAllowance: data.childrenAllowance ?? null,
      complementaryAllowance: data.complementaryAllowance ?? null,
      otherAllowance: data.otherAllowance ?? null,
    });
  }

  // ── Actions ─────────────────────────────────────────────

  approve(): void { this.approved.emit(); }
  reject(): void { this.rejected.emit(); }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.saved.emit({
      memberId: v.memberIdSuffix,
      firstNameAr: v.firstNameAr || undefined,
      middleNameAr: v.middleNameAr || undefined,
      lastNameAr: v.lastNameAr || undefined,
      firstNameEn: v.firstNameEn || undefined,
      middleNameEn: v.middleNameEn || undefined,
      lastNameEn: v.lastNameEn || undefined,
      dateOfBirth: this.formatDate(v.dateOfBirth),
      joiningDate: this.formatDate(v.joiningDate),
      basicSalary: v.basicSalary ?? 0,
      childrenAllowance: v.childrenAllowance ?? undefined,
      complementaryAllowance: v.complementaryAllowance ?? undefined,
      otherAllowance: v.otherAllowance ?? undefined,
    });
  }

  cancelEdit(): void {
    this.patchFromInsured(this.parseDataJson(this.dataJson()));
    this.form.markAsPristine();
  }

  isMandatory(fieldKey: string): boolean {
    return this.fieldConfig().find(c => c.fieldKey === fieldKey)?.mandatory ?? false;
  }

  navigateBack(): void {
    // The canDeactivate guard handles the discard dialog and draft cleanup.
    this.router.navigate(['/dashboard/insureds']);
  }

  /**
   * Called by the `draftCleanupGuard` before any navigation away from this route.
   *
   * - If the form was already submitted the guard is a no-op (draft files are linked to the case).
   * - If an upload is in progress navigation is blocked with a snackbar — the user must wait.
   * - Otherwise a discard dialog is shown; on confirmation draft files are deleted immediately.
   */
  canDeactivate(): Observable<boolean> | boolean {
    // Already submitted — allow Angular to navigate freely.
    if (this.submitted()) return true;

    // Upload in progress — block silently with a feedback snackbar.
    if (this.uploadTracking.uploadsInProgress()) {
      this.snackBar.open(
        this.translate.instant('ATTACHMENTS.UPLOAD_IN_PROGRESS'),
        'OK',
        { duration: 3000 },
      );
      return false;
    }

    // Nothing to warn about — navigate freely.
    if (!this.form.dirty && !this.uploadTracking.hasDraftAttachments()) return true;

    // Show a single discard dialog covering both form changes and uploaded files.
    return this.dialog.open(ConfirmDialogComponent, {
      data: {
        titleKey:   'REGISTER_INSURED.DISCARD_TITLE',
        messageKey: 'REGISTER_INSURED.DISCARD_CONFIRM',
        confirmKey: 'REGISTER_INSURED.DISCARD_BTN',
        variant:    'warning',
      } satisfies ConfirmDialogData,
      panelClass:   'modern-confirm-dialog',
      disableClose: true,
    }).afterClosed().pipe(
      switchMap(confirmed => {
        if (!confirmed) return of(false);
        const draftId = this.uploadTracking.currentDraftId();
        if (draftId && this.uploadTracking.hasDraftAttachments()) {
          // Best-effort cleanup — navigate regardless of whether the call succeeds.
          return this.attachmentApi.discardDraft(draftId).pipe(
            map(() => true as boolean),
            catchError(() => of(true as boolean)),
          );
        }
        return of(true as boolean);
      }),
    );
  }

  submit(): void {
    this.form.markAllAsTouched();
    this.memberIdDuplicateError.set(false);

    if (this.form.invalid) return;

    const employer = this.employer();
    if (!employer) return;

    const strategy = employer.memberIdStrategy;
    const memberId = strategy === 'MANUAL_PREFIX'
      ? employer.code + this.form.value.memberIdSuffix
      : (this.form.value.emiratesId ?? '').replace(/-/g, '');

    const v = this.form.value;
    this.submitting.set(true);

    const submittedBy = this.authService.currentUser() ?? 'SYSTEM';

    this.insuredService.register(employer.id, {
      memberId,
      firstNameAr: v.firstNameAr || undefined,
      middleNameAr: v.middleNameAr || undefined,
      lastNameAr: v.lastNameAr || undefined,
      firstNameEn: v.firstNameEn || undefined,
      middleNameEn: v.middleNameEn || undefined,
      lastNameEn: v.lastNameEn || undefined,
      dateOfBirth: this.formatDate(v.dateOfBirth),
      joiningDate: this.formatDate(v.joiningDate),
      basicSalary: v.basicSalary ?? 0,
      childrenAllowance: v.childrenAllowance ?? undefined,
      complementaryAllowance: v.complementaryAllowance ?? undefined,
      otherAllowance: v.otherAllowance ?? undefined,
      notes: v.notes || undefined,
      draftRequestId: this.draftRequestId,
    }, submittedBy).subscribe({
      next: saved => {
        this.submitting.set(false);
        this.submitted.set(true);   // tell the guard: no cleanup needed, files are linked
        this.snackBar.open(
          this.translate.instant('REGISTER_INSURED.SUCCESS', { memberId: saved.memberId }),
          'OK',
          { duration: 4000 }
        );
        this.router.navigate(['/dashboard/insureds']);
      },
      error: (err) => {
        this.submitting.set(false);
        if (err.status === 409) {
          this.memberIdDuplicateError.set(true);
        } else {
          this.snackBar.open(
            err.error?.message ?? this.translate.instant('REGISTER_INSURED.ERROR_GENERIC'),
            'OK',
            { duration: 4000 }
          );
        }
      },
    });
  }

  get strategy(): string | undefined {
    return this.employer()?.memberIdStrategy;
  }

  get employerCode(): string {
    return this.employer()?.code ?? '';
  }

  /** @deprecated Use componentLabelMap() signal instead. Kept for template backward-compat. */
  componentLabel(key: string): string {
    return this.componentLabelMap()[key] ?? key;
  }

  private formatDate(d: Date | string | null | undefined): string {
    if (!d) return '';
    if (d instanceof Date) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    return String(d);
  }
}
