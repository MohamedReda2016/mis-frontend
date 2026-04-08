import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../auth/auth.service';
import { EmployerContextService } from '../employer/employer-context.service';
import { LanguageService } from '../core/language/language.service';
import { LangSwitcherComponent } from '../core/language/lang-switcher';

@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    LangSwitcherComponent,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatMenuModule,
    MatTabsModule,
    MatTooltipModule,
    TranslateModule,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  protected authService = inject(AuthService);
  protected employerContext = inject(EmployerContextService);
  protected langService = inject(LanguageService);
  private router = inject(Router);

  mobileNavOpen = signal(false);

  readonly userInitials = computed(() => {
    const name = this.authService.currentUser() ?? '';
    return name
      .split(/[\s._@-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(p => p[0].toUpperCase())
      .join('') || '?';
  });

  readonly employerDisplayName = computed(() => {
    const emp = this.employerContext.selectedEmployer();
    if (!emp) return null;
    return this.langService.currentLang() === 'ar'
      ? (emp.legalNameAr || emp.legalNameEn)
      : emp.legalNameEn;
  });

  switchEmployer(): void {
    this.mobileNavOpen.set(false);
    this.router.navigate(['/select-employer']);
  }

  toggleMobileNav(): void {
    this.mobileNavOpen.update(v => !v);
  }

  closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }
}
