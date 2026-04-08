import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EmployerContextService } from '../employer-context.service';
import { EmployerService } from '../employer.service';
import { SalaryConfig } from '../employer.model';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../core/confirm-dialog';
import { LanguageService } from '../../core/language/language.service';
import { InsuredService } from '../../insured/insured.service';

type Strategy = 'EMIRATES_ID' | 'MANUAL_PREFIX';

const FIELD_KEYS = [
  { key: 'first_name_ar', translationKey: 'EMPLOYER_PROFILE.FIELD_CONFIG.FIRST_NAME_AR', group: 'arabic' },
  { key: 'middle_name_ar', translationKey: 'EMPLOYER_PROFILE.FIELD_CONFIG.MIDDLE_NAME_AR', group: 'arabic' },
  { key: 'last_name_ar', translationKey: 'EMPLOYER_PROFILE.FIELD_CONFIG.LAST_NAME_AR', group: 'arabic' },
  { key: 'first_name_en', translationKey: 'EMPLOYER_PROFILE.FIELD_CONFIG.FIRST_NAME_EN', group: 'english' },
  { key: 'middle_name_en', translationKey: 'EMPLOYER_PROFILE.FIELD_CONFIG.MIDDLE_NAME_EN', group: 'english' },
  { key: 'last_name_en', translationKey: 'EMPLOYER_PROFILE.FIELD_CONFIG.LAST_NAME_EN', group: 'english' },
] as const;

interface FieldConfigEntry { key: string; translationKey: string; group: string; mandatory: boolean; }
type ComponentKey = 'BASIC_SALARY' | 'CHILDREN_ALLOWANCE' | 'COMPLEMENTARY_ALLOWANCE' | 'OTHER_ALLOWANCE';

interface SalaryComponentState {
  enabled: boolean;
  percentage: number;
}

interface SalaryHistoryRow {
  startDate: string;
  endDate: string | null;
  BASIC_SALARY?: SalaryComponentState;
  CHILDREN_ALLOWANCE?: SalaryComponentState;
  COMPLEMENTARY_ALLOWANCE?: SalaryComponentState;
  OTHER_ALLOWANCE?: SalaryComponentState;
}

const DEFAULT_SALARY_COMPONENTS: SalaryConfig[] = [
  { componentKey: 'BASIC_SALARY', enabled: true, percentage: 100 },
  { componentKey: 'CHILDREN_ALLOWANCE', enabled: true, percentage: 100 },
  { componentKey: 'COMPLEMENTARY_ALLOWANCE', enabled: false, percentage: 0 },
  { componentKey: 'OTHER_ALLOWANCE', enabled: false, percentage: 0 },
];

@Component({
  selector: 'app-employer-profile',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    TranslateModule,
  ],
  templateUrl: './employer-profile.html',
  styleUrl: './employer-profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployerProfileComponent {
  private employerService = inject(EmployerService);
  private insuredService = inject(InsuredService);
  private employerContext = inject(EmployerContextService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  protected langService = inject(LanguageService);

  protected employer = this.employerContext.selectedEmployer;

  editingDetails = signal(false);
  detailsSaving = signal(false);
  detailsForm = new FormGroup({
    email: new FormControl('', { nonNullable: true }),
    iban: new FormControl('', { nonNullable: true }),
    pocMobileNumber: new FormControl('', { nonNullable: true }),
  });

  strategyControl = new FormControl<Strategy>('MANUAL_PREFIX', { nonNullable: true });
  savedStrategy = signal<Strategy | null>(null);

  editingSalary = signal(false);
  salaryLoading = signal(true);
  salaryComponents = signal<SalaryConfig[]>(DEFAULT_SALARY_COMPONENTS.map(c => ({ ...c })));

  salaryHistory = signal<SalaryConfig[]>([]);
  historyLoading = signal(false);

  fieldConfigLoading = signal(false);
  fieldConfigEntries = signal<FieldConfigEntry[]>(
    FIELD_KEYS.map(f => ({ ...f, mandatory: false }))
  );
  arabicFields = computed(() => this.fieldConfigEntries().filter(e => e.group === 'arabic'));
  englishFields = computed(() => this.fieldConfigEntries().filter(e => e.group === 'english'));

  groupedHistory = computed<SalaryHistoryRow[]>(() => {
    const groupMap = new Map<string, SalaryHistoryRow>();

    for (const config of this.salaryHistory()) {
      if (!config.effectiveDate) continue;
      const key = config.effectiveDate;
      if (!groupMap.has(key)) {
        groupMap.set(key, { startDate: key, endDate: config.endDate ?? null });
      }
      const row = groupMap.get(key)!;
      row[config.componentKey as ComponentKey] = {
        enabled: config.enabled,
        percentage: config.percentage,
      };
    }

    return Array.from(groupMap.values()).sort((a, b) =>
      b.startDate.localeCompare(a.startDate)
    );
  });

  constructor() {
    const saved = this.employer()?.memberIdStrategy as Strategy | undefined;
    if (saved) {
      this.strategyControl.setValue(saved);
      this.savedStrategy.set(saved);
    }
    this.loadSalaryConfig();
    this.loadSalaryHistory();
    this.loadFieldConfig();
  }

  private loadSalaryConfig(): void {
    const employer = this.employer();
    if (!employer) {
      this.salaryLoading.set(false);
      return;
    }
    this.employerService.getActiveSalaryConfig(employer.id).subscribe({
      next: configs => {
        if (configs.length > 0) {
          this.salaryComponents.update(defaults =>
            defaults.map(d => {
              const found = configs.find(c => c.componentKey === d.componentKey);
              return found
                ? { ...d, enabled: found.enabled, percentage: found.percentage, effectiveDate: found.effectiveDate }
                : d;
            })
          );
        }
        this.salaryLoading.set(false);
      },
      error: () => this.salaryLoading.set(false),
    });
  }

  private loadSalaryHistory(): void {
    const employer = this.employer();
    if (!employer) return;
    this.historyLoading.set(true);
    this.employerService.getSalaryConfigHistory(employer.id).subscribe({
      next: history => {
        this.salaryHistory.set(history);
        this.historyLoading.set(false);
      },
      error: () => this.historyLoading.set(false),
    });
  }

  private loadFieldConfig(): void {
    const employer = this.employer();
    if (!employer) return;
    this.fieldConfigLoading.set(true);
    this.insuredService.getFieldConfig(employer.id).subscribe({
      next: configs => {
        if (configs.length > 0) {
          this.fieldConfigEntries.update(entries =>
            entries.map(e => ({
              ...e,
              mandatory: configs.find(c => c.fieldKey === e.key)?.mandatory ?? false,
            }))
          );
        }
        this.fieldConfigLoading.set(false);
      },
      error: () => this.fieldConfigLoading.set(false),
    });
  }

  updateFieldEntry(key: string, mandatory: boolean): void {
    this.fieldConfigEntries.update(entries =>
      entries.map(e => (e.key === key ? { ...e, mandatory } : e))
    );
  }

  openFieldConfigDialog(): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          titleKey:   'EMPLOYER_PROFILE.FIELD_CONFIG.CONFIRM_TITLE',
          messageKey: 'EMPLOYER_PROFILE.FIELD_CONFIG.CONFIRM_MESSAGE',
          variant:    'info',
        } satisfies ConfirmDialogData,
        panelClass:   'modern-confirm-dialog',
        disableClose: true,
      })
      .afterClosed()
      .subscribe(confirmed => {
        if (confirmed) this.saveFieldConfig();
      });
  }

  private saveFieldConfig(): void {
    const employer = this.employer();
    if (!employer) return;
    const fields = this.fieldConfigEntries().map(e => ({ fieldKey: e.key, mandatory: e.mandatory }));
    this.insuredService.updateFieldConfig(employer.id, fields).subscribe({
      next: () => {
        this.snackBar.open(
          this.translate.instant('EMPLOYER_PROFILE.FIELD_CONFIG.SAVE_SUCCESS'),
          'OK',
          { duration: 3000 }
        );
      },
    });
  }

  startEditDetails(): void {
    const employer = this.employer();
    this.detailsForm.setValue({
      email: employer?.email ?? '',
      iban: employer?.iban ?? '',
      pocMobileNumber: employer?.pocMobileNumber ?? '',
    });
    this.editingDetails.set(true);
  }

  cancelEditDetails(): void {
    this.editingDetails.set(false);
  }

  saveDetails(): void {
    const employer = this.employer();
    if (!employer) return;
    this.detailsSaving.set(true);
    this.employerService.updateDetails(employer.id, this.detailsForm.getRawValue()).subscribe({
      next: updated => {
        this.employerContext.setSelectedEmployer(updated);
        this.editingDetails.set(false);
        this.detailsSaving.set(false);
        this.snackBar.open(
          this.translate.instant('EMPLOYER_PROFILE.INFO.SAVE_SUCCESS'),
          'OK', { duration: 3000 }
        );
      },
      error: () => this.detailsSaving.set(false),
    });
  }

  openSaveDialog(): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          titleKey:   'EMPLOYER_PROFILE.MEMBER_ID.CONFIRM_TITLE',
          messageKey: 'EMPLOYER_PROFILE.MEMBER_ID.CONFIRM_WARNING',
          cancelKey:  'EMPLOYER_PROFILE.MEMBER_ID.CONFIRM_CANCEL',
          confirmKey: 'EMPLOYER_PROFILE.MEMBER_ID.CONFIRM_SAVE',
          variant:    'warning',
        } satisfies ConfirmDialogData,
        panelClass:   'modern-confirm-dialog',
        disableClose: true,
      })
      .afterClosed()
      .subscribe(confirmed => {
        if (confirmed) this.saveMemberIdConfig();
      });
  }

  private saveMemberIdConfig(): void {
    const employer = this.employer();
    if (!employer) return;
    this.employerService.updateConfig(employer.id, this.strategyControl.value).subscribe({
      next: updated => {
        this.savedStrategy.set(this.strategyControl.value);
        this.employerContext.setSelectedEmployer(updated);
        this.snackBar.open(
          this.translate.instant('EMPLOYER_PROFILE.MEMBER_ID.SAVE_SUCCESS'),
          'OK', { duration: 3000 }
        );
      },
    });
  }

  toggleEditSalary(): void {
    if (this.editingSalary()) {
      this.saveSalaryConfig();
    } else {
      this.editingSalary.set(true);
    }
  }

  private saveSalaryConfig(): void {
    const employer = this.employer();
    if (!employer) return;
    const requests = this.salaryComponents().map(c => ({
      componentKey: c.componentKey,
      enabled: c.enabled,
      percentage: c.percentage,
    }));
    this.employerService.updateSalaryConfig(employer.id, requests).subscribe({
      next: saved => {
        this.salaryComponents.update(defaults =>
          defaults.map(d => {
            const updated = saved.find(s => s.componentKey === d.componentKey);
            return updated ? { ...d, ...updated } : d;
          })
        );
        this.editingSalary.set(false);
        this.snackBar.open(
          this.translate.instant('EMPLOYER_PROFILE.SALARY.SAVE_SUCCESS'),
          'OK', { duration: 3000 }
        );
        this.loadSalaryHistory();
      },
    });
  }

  updateComponent(index: number, changes: Partial<SalaryConfig>): void {
    this.salaryComponents.update(list =>
      list.map((c, i) => (i === index ? { ...c, ...changes } : c))
    );
  }
}
