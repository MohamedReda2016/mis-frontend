import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
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
import { ActivatedRoute, Router } from '@angular/router';
import { startWith } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { EmployerContextService } from '../../employer/employer-context.service';
import { EmployerService } from '../../employer/employer.service';
import { InsuredService } from '../insured.service';
import { Insured } from '../insured.model';
import { SalaryConfig } from '../../employer/employer.model';
import { AttachmentUploadComponent } from '../../shared/attachment/attachment-upload/attachment-upload';
import { AuthService } from '../../auth/auth.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../core/confirm-dialog';

interface SalaryUpdatePayload {
  effectiveDate: string;
  basicSalary: number;
  childrenAllowance?: number;
  complementaryAllowance?: number;
  otherAllowance?: number;
  notes: string;
  draftRequestId: string;
}

function minDateValidator(getMinDate: () => Date | null): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const minDate = getMinDate();
    if (!minDate) return null;
    const val = control.value instanceof Date ? control.value : new Date(control.value);
    return val >= minDate ? null : { minDate: true };
  };
}

@Component({
  selector: 'app-update-salary',
  imports: [
    ReactiveFormsModule,
    DatePipe,
    DecimalPipe,
    MatButtonModule,
    MatDialogModule,
    MatDatepickerModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    TranslateModule,
    AttachmentUploadComponent,
  ],
  templateUrl: './update-salary.html',
  styleUrl: './update-salary.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpdateSalaryComponent {
  private insuredService = inject(InsuredService);
  private employerService = inject(EmployerService);
  private employerContext = inject(EmployerContextService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);

  /** Stable UUID for this draft session — generated once on component creation. */
  readonly draftRequestId = crypto.randomUUID();

  protected employer = this.employerContext.selectedEmployer;

  initLoading = signal(true);
  submitting = signal(false);

  insured = signal<Insured | null>(null);
  salaryComponents = signal<SalaryConfig[]>([]);

  identicalSalaryWarning = signal(false);

  form = new FormGroup({
    effectiveDate: new FormControl<Date | null>(null, [Validators.required]),
    basicSalary: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    childrenAllowance: new FormControl<number | null>(null, [Validators.min(0)]),
    complementaryAllowance: new FormControl<number | null>(null, [Validators.min(0)]),
    otherAllowance: new FormControl<number | null>(null, [Validators.min(0)]),
    notes: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(500)] }),
  });

  private formValues = toSignal(this.form.valueChanges.pipe(startWith(this.form.value)));

  /** Live contributable breakdown per component */
  contributableBreakdown = computed(() => {
    const vals = this.formValues();
    return this.salaryComponents().map(comp => {
      const raw = (() => {
        switch (comp.componentKey) {
          case 'BASIC_SALARY': return vals?.basicSalary ?? 0;
          case 'CHILDREN_ALLOWANCE': return vals?.childrenAllowance ?? 0;
          case 'COMPLEMENTARY_ALLOWANCE': return vals?.complementaryAllowance ?? 0;
          case 'OTHER_ALLOWANCE': return vals?.otherAllowance ?? 0;
          default: return 0;
        }
      })();
      const value = Number(raw) || 0;
      const contribution = comp.enabled ? +(value * comp.percentage / 100).toFixed(2) : 0;
      return { comp, value, contribution };
    });
  });

  newContributable = computed(() =>
    +this.contributableBreakdown().reduce((sum, r) => sum + r.contribution, 0).toFixed(2)
  );

  previousContributable = computed(() => this.insured()?.contributableSalary ?? 0);

  salaryDiff = computed(() => +(this.newContributable() - this.previousContributable()).toFixed(2));

  salaryDiffPercent = computed(() => {
    const prev = this.previousContributable();
    if (!prev) return 0;
    return +((this.salaryDiff() / prev) * 100).toFixed(1);
  });

  notesLength = computed(() => this.formValues()?.notes?.length ?? 0);

  joiningDate = computed(() => {
    const d = this.insured()?.joiningDate;
    return d ? new Date(d) : null;
  });

  currentUser = computed(() => this.authService.currentUser() ?? 'SYSTEM');

  constructor() {
    const insuredId = Number(this.route.snapshot.paramMap.get('insuredId'));
    const employer = this.employer();
    if (!employer || !insuredId) { this.initLoading.set(false); return; }

    forkJoin({
      insured: this.insuredService.getById(employer.id, insuredId),
      salary: this.employerService.getActiveSalaryConfig(employer.id).pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ insured, salary }) => {
        this.insured.set(insured);
        this.salaryComponents.set(salary);

        // Pre-fill with current salary values
        this.form.patchValue({
          basicSalary: insured.basicSalary,
          childrenAllowance: insured.childrenAllowance ?? null,
          complementaryAllowance: insured.complementaryAllowance ?? null,
          otherAllowance: insured.otherAllowance ?? null,
        });

        // Add joining date validator
        this.form.controls.effectiveDate.addValidators(
          minDateValidator(() => this.joiningDate())
        );
        this.form.controls.effectiveDate.updateValueAndValidity();

        this.initLoading.set(false);
      },
      error: () => {
        this.initLoading.set(false);
        this.snackBar.open(this.translate.instant('INSURED_PROFILE.LOADING_ERROR'), 'OK', { duration: 3000 });
      },
    });
  }

  componentLabel(key: string): string {
    const map: Record<string, string> = {
      BASIC_SALARY: 'REGISTER_INSURED.BASIC_SALARY',
      CHILDREN_ALLOWANCE: 'REGISTER_INSURED.CHILDREN_ALLOWANCE',
      COMPLEMENTARY_ALLOWANCE: 'REGISTER_INSURED.COMPLEMENTARY_ALLOWANCE',
      OTHER_ALLOWANCE: 'REGISTER_INSURED.OTHER_ALLOWANCE',
    };
    return this.translate.instant(map[key] ?? key);
  }

  navigateBack(): void {
    const insured = this.insured();
    if (!this.form.dirty) {
      this.goBack(insured);
      return;
    }
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          titleKey:   'REGISTER_INSURED.DISCARD_TITLE',
          messageKey: 'REGISTER_INSURED.DISCARD_CONFIRM',
          confirmKey: 'REGISTER_INSURED.DISCARD_BTN',
          variant:    'warning',
        } satisfies ConfirmDialogData,
        panelClass:   'modern-confirm-dialog',
        disableClose: true,
      })
      .afterClosed()
      .subscribe(confirmed => {
        if (confirmed) this.goBack(insured);
      });
  }

  private goBack(insured: Insured | null): void {
    if (insured) {
      this.router.navigate(['/dashboard/insureds', insured.id]);
    } else {
      this.router.navigate(['/dashboard/insureds']);
    }
  }

  submit(): void {
    this.form.markAllAsTouched();
    this.identicalSalaryWarning.set(false);

    if (this.form.invalid) return;

    const employer = this.employer();
    const insured = this.insured();
    if (!employer || !insured) return;

    const v = this.form.value;

    const payload: SalaryUpdatePayload = {
      effectiveDate: this.formatDate(v.effectiveDate),
      basicSalary: v.basicSalary ?? 0,
      childrenAllowance: v.childrenAllowance ?? undefined,
      complementaryAllowance: v.complementaryAllowance ?? undefined,
      otherAllowance: v.otherAllowance ?? undefined,
      notes: v.notes ?? '',
      draftRequestId: this.draftRequestId,
    };
    const displayDate = this.formatDateDisplay(v.effectiveDate);

    // Warn when new salary equals the current one
    const isIdentical =
      v.basicSalary === insured.basicSalary &&
      (v.childrenAllowance ?? 0) === (insured.childrenAllowance ?? 0) &&
      (v.complementaryAllowance ?? 0) === (insured.complementaryAllowance ?? 0) &&
      (v.otherAllowance ?? 0) === (insured.otherAllowance ?? 0);

    if (isIdentical) {
      this.identicalSalaryWarning.set(true);
      this.dialog
        .open(ConfirmDialogComponent, {
          data: {
            titleKey:   'UPDATE_SALARY.IDENTICAL_CONFIRM_TITLE',
            messageKey: 'UPDATE_SALARY.IDENTICAL_CONFIRM',
            confirmKey: 'UPDATE_SALARY.IDENTICAL_CONFIRM_BTN',
            variant:    'info',
          } satisfies ConfirmDialogData,
          panelClass:   'modern-confirm-dialog',
          disableClose: true,
        })
        .afterClosed()
        .subscribe(confirmed => {
          if (confirmed) this.doSubmit(employer.id, insured, displayDate, payload);
        });
      return;
    }

    this.doSubmit(employer.id, insured, displayDate, payload);
  }

  private doSubmit(employerId: number, insured: Insured, effectiveDateDisplay: string, payload: SalaryUpdatePayload): void {
    this.submitting.set(true);

    this.insuredService.submitSalaryUpdate(employerId, insured.id, payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.snackBar.open(
          this.translate.instant('UPDATE_SALARY.SUCCESS', {
            memberId: insured.memberId,
            date: effectiveDateDisplay,
          }),
          'OK',
          { duration: 5000 }
        );
        this.router.navigate(['/dashboard/insureds', insured.id], {
          queryParams: { tab: 'salary' },
        });
      },
      error: err => {
        this.submitting.set(false);
        if (err.status === 409) {
          this.form.controls.effectiveDate.setErrors({ duplicateDate: true });
        } else if (err.status === 422) {
          this.form.controls.effectiveDate.setErrors({ lockedPeriod: true });
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

  private formatDateDisplay(d: Date | string | null | undefined): string {
    if (!d) return '';
    const date = d instanceof Date ? d : new Date(d);
    return date.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
