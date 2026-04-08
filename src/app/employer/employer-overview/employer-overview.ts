import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EmployerContextService } from '../employer-context.service';
import { LanguageService } from '../../core/language/language.service';
import { AuthService } from '../../auth/auth.service';
import { InsuredService } from '../../insured/insured.service';
import { ActivityService } from '../../activity/activity.service';
import { WorkflowInstance } from '../../activity/activity.model';

@Component({
  selector: 'app-employer-overview',
  imports: [TranslateModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './employer-overview.html',
  styleUrl: './employer-overview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployerOverviewComponent {
  private router          = inject(Router);
  private employerContext = inject(EmployerContextService);
  private langService     = inject(LanguageService);
  private authService     = inject(AuthService);
  private insuredService  = inject(InsuredService);
  private activityService = inject(ActivityService);

  // ── Raw data ──────────────────────────────────────────────────────────────
  loading     = signal(true);
  actionItems = signal<WorkflowInstance[]>([]);

  // ── Employer context ──────────────────────────────────────────────────────
  employer = computed(() => this.employerContext.selectedEmployer());

  employerName = computed(() => {
    const e = this.employer();
    if (!e) return '';
    return this.langService.currentLang() === 'ar'
      ? (e.legalNameAr || e.legalNameEn)
      : e.legalNameEn;
  });

  // ── Insured statistics (populated from server-side page response) ──────────
  totalCount    = signal(0);
  activeCount   = signal(0);
  pendingCount  = signal(0);
  inactiveCount = signal(0);

  // ── Action required ───────────────────────────────────────────────────────
  actionCount = computed(() => this.actionItems().length);

  /**
   * Donut segment data using the CSS-tricks approach:
   * viewBox="0 0 36 36", r=15.9155 → circumference ≈ 100
   * dashoffset starts at 25 so the first segment begins at 12 o'clock.
   */
  donutSegments = computed(() => {
    const total = this.totalCount();
    if (total === 0) return null;

    const a = (this.activeCount()   / total) * 100;
    const p = (this.pendingCount()  / total) * 100;
    const i = (this.inactiveCount() / total) * 100;

    return {
      active:   { dasharray: `${a} ${100 - a}`,   dashoffset: 25 },
      pending:  { dasharray: `${p} ${100 - p}`,   dashoffset: 25 - a },
      inactive: { dasharray: `${i} ${100 - i}`,   dashoffset: 25 - a - p },
      hasActive:   a > 0,
      hasPending:  p > 0,
      hasInactive: i > 0,
    };
  });

  constructor() {
    const emp  = this.employer();
    const user = this.authService.currentUser() ?? '';

    if (emp) {
      // Fetch page 0 with size=1 — we only need the employer-wide stat counts,
      // not the actual content rows. The response always includes aggregated totals.
      this.insuredService.getPage(emp.id, { page: 0, size: 1 }).subscribe({
        next: page => {
          this.totalCount.set(page.employerTotal);
          this.activeCount.set(page.employerActive);
          this.pendingCount.set(page.employerPending);
          this.inactiveCount.set(page.employerInactive);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });

      // Load STAGE1 WORK queue items requiring this user's action
      this.activityService.getQueue('STAGE1_QUEUE', user).subscribe({
        next: items => this.actionItems.set(items),
        error: ()   => {},
      });
    } else {
      this.loading.set(false);
    }
  }

  goToProfile():   void { this.router.navigate(['/dashboard/profile']); }
  goToInsureds():  void { this.router.navigate(['/dashboard/insureds']); }
  goToActivity():  void { this.router.navigate(['/dashboard/activity']); }
}
