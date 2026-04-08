import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { Employer } from '../employer.model';
import { EmployerService } from '../employer.service';
import { EmployerContextService } from '../employer-context.service';
import { AuthService } from '../../auth/auth.service';
import { LanguageService } from '../../core/language/language.service';
import { LangSwitcherComponent } from '../../core/language/lang-switcher';

@Component({
  selector: 'app-select-employer',
  imports: [
    FormsModule,
    LangSwitcherComponent,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    MatMenuModule,
    MatTooltipModule,
    TranslateModule,
  ],
  templateUrl: './select-employer.html',
  styleUrl: './select-employer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectEmployerComponent {
  private employerService = inject(EmployerService);
  private router = inject(Router);
  private employerContext = inject(EmployerContextService);
  protected authService = inject(AuthService);
  protected langService = inject(LanguageService);

  readonly userInitials = computed(() => {
    const name = this.authService.currentUser() ?? '';
    return name
      .split(/[\s._@-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(p => p[0].toUpperCase())
      .join('') || '?';
  });

  employers = signal<Employer[]>([]);
  searchQuery = signal('');
  loading = signal(true);
  error = signal<string | null>(null);

  filteredEmployers = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.employers();
    return this.employers().filter(e =>
      e.legalNameEn.toLowerCase().includes(q) ||
      (e.legalNameAr?.includes(q) ?? false) ||
      e.code.toLowerCase().includes(q)
    );
  });

  constructor() {
    this.employerService.getAll().subscribe({
      next: data => {
        this.employers.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('SELECT_EMPLOYER.ERROR');
        this.loading.set(false);
      },
    });
  }

  displayName(employer: Employer): string {
    return this.langService.currentLang() === 'ar'
      ? (employer.legalNameAr || employer.legalNameEn)
      : employer.legalNameEn;
  }

  get isArabic(): boolean {
    return this.langService.currentLang() === 'ar';
  }

  displaySubtitle(employer: Employer): string {
    return this.langService.currentLang() === 'ar'
      ? (employer.subtitleAr || employer.subtitle || '')
      : (employer.subtitle || '');
  }

  select(employer: Employer): void {
    this.employerContext.setSelectedEmployer(employer);
    this.router.navigate(['/dashboard']);
  }

  updateSearch(value: string): void {
    this.searchQuery.set(value);
  }
}
