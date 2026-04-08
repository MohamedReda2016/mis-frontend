import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EmployerContextService } from '../../employer/employer-context.service';
import { AuthService } from '../../auth/auth.service';
import { InsuredService } from '../insured.service';
import { InsuredProfile, SalaryRecord } from '../insured.model';

export type ProfileTab = 'personal' | 'employment' | 'salary' | 'contributions';

const AVATAR_COLORS = ['#1A3C6E', '#C09A3A', '#2E7D32', '#7B1FA2', '#C62828', '#00838F', '#E65100'];

@Component({
  selector: 'app-insured-profile',
  imports: [
    DecimalPipe,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    TranslateModule,
  ],
  templateUrl: './insured-profile.html',
  styleUrl: './insured-profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InsuredProfileComponent {
  private insuredService = inject(InsuredService);
  private employerContext = inject(EmployerContextService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);

  readonly employer = this.employerContext.selectedEmployer;
  readonly role = this.authService.currentRole;

  loading = signal(true);
  profile = signal<InsuredProfile | null>(null);
  activeTab = signal<ProfileTab>('personal');

  readonly insured = computed(() => this.profile()?.insured ?? null);
  readonly salaryHistory = computed(() => this.profile()?.salaryHistory ?? []);

  readonly isAdmin1 = computed(() => this.role() === 'ADMIN1');
  readonly isActive = computed(() => this.insured()?.status === 'ACTIVE');
  readonly showActions = computed(() => this.isAdmin1() && this.isActive());

  readonly fullNameEn = computed(() => {
    const i = this.insured();
    if (!i) return '';
    return [i.firstNameEn, i.middleNameEn, i.lastNameEn].filter(Boolean).join(' ');
  });

  readonly fullNameAr = computed(() => {
    const i = this.insured();
    if (!i) return '';
    return [i.firstNameAr, i.middleNameAr, i.lastNameAr].filter(Boolean).join(' ');
  });

  readonly initials = computed(() => {
    const i = this.insured();
    if (!i) return '??';
    const first = i.firstNameEn?.[0] ?? i.firstNameAr?.[0] ?? '';
    const last = i.lastNameEn?.[0] ?? i.lastNameAr?.[0] ?? '';
    return (first + last).toUpperCase() || '??';
  });

  readonly avatarColor = computed(() => {
    const id = this.insured()?.memberId ?? '';
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  });

  readonly age = computed(() => {
    const dob = this.insured()?.dateOfBirth;
    if (!dob) return null;
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    if (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate())) age--;
    return age;
  });

  readonly daysInService = computed(() => {
    const i = this.insured();
    if (!i?.joiningDate) return null;
    const start = new Date(i.joiningDate);
    const end = i.endDate ? new Date(i.endDate) : new Date();
    return Math.floor((end.getTime() - start.getTime()) / 86_400_000);
  });

  readonly serviceYearsMonths = computed(() => {
    const i = this.insured();
    if (!i?.joiningDate) return null;
    const start = new Date(i.joiningDate);
    const end = i.endDate ? new Date(i.endDate) : new Date();
    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    if (months < 0) { years--; months += 12; }
    return { years, months };
  });

  readonly salaryColumns = ['effectiveDate', 'endDate', 'basicSalary', 'contributableSalary', 'status', 'source', 'createdBy'];

  constructor() {
    const insuredId = Number(this.route.snapshot.paramMap.get('insuredId'));
    const tabParam = this.route.snapshot.queryParamMap.get('tab') as ProfileTab | null;
    if (tabParam) this.activeTab.set(tabParam);

    const employer = this.employer();
    if (!employer || !insuredId) { this.loading.set(false); return; }

    this.insuredService.getProfile(employer.id, insuredId).subscribe({
      next: p => { this.profile.set(p); this.loading.set(false); },
      error: () => {
        this.loading.set(false);
        this.snackBar.open(this.translate.instant('INSURED_PROFILE.LOADING_ERROR'), 'OK', { duration: 3000 });
      },
    });
  }

  setTab(tab: ProfileTab): void { this.activeTab.set(tab); }

  goBack(): void { this.router.navigate(['/dashboard/insureds']); }

  updateSalary(): void {
    const insured = this.insured();
    if (!insured) return;
    this.router.navigate(['/dashboard/insureds', insured.id, 'update-salary']);
  }

  recordEOS(): void {
    this.snackBar.open(this.translate.instant('INSURED_PROFILE.COMING_SOON'), 'OK', { duration: 2000 });
  }

  statusClass(status: string): string {
    return 'badge-' + status.toLowerCase().replace('_', '-');
  }

  formatDate(date: string | null | undefined): string {
    if (!date) return '—';
    const d = new Date(date);
    return d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  strategyLabel(strategy: string | undefined): string {
    if (!strategy) return '—';
    return strategy === 'EMIRATES_ID' ? 'Emirates ID' : 'Manual Prefix';
  }
}
