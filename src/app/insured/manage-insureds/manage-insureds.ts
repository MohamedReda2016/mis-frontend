import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
  untracked,
  effect,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DecimalPipe } from '@angular/common';
import {
  EMPTY,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  tap,
  catchError,
} from 'rxjs';
import { EmployerContextService } from '../../employer/employer-context.service';
import { InsuredService } from '../insured.service';
import { Insured } from '../insured.model';
import { PagingBarComponent, PageEvent } from '../../shared/components/paging-bar/paging-bar';
import { DateFormatPipe } from '../../shared/pipes/date-format.pipe';

@Component({
  selector: 'app-manage-insureds',
  imports: [
    FormsModule,
    DecimalPipe,
    DateFormatPipe,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSelectModule,
    TranslateModule,
    PagingBarComponent,
  ],
  templateUrl: './manage-insureds.html',
  styleUrl: './manage-insureds.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageInsuredsComponent {
  private readonly insuredService = inject(InsuredService);
  private readonly employerContext = inject(EmployerContextService);
  private readonly router     = inject(Router);
  private readonly snackBar   = inject(MatSnackBar);
  private readonly translate  = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly employer = this.employerContext.selectedEmployer;

  // ── UI state ──────────────────────────────────────────────────────────────
  loading     = signal(true);
  showFilters = signal(false);

  // ── Filter signals ────────────────────────────────────────────────────────
  memberIdFilter = signal('');
  salaryFilter   = signal<number | null>(null);
  statusFilter   = signal<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  salarySort     = signal<'none' | 'asc' | 'desc'>('none');

  // ── Pagination signals ────────────────────────────────────────────────────
  pageIndex = signal(0);
  pageSize  = signal(10);
  readonly pageSizeOptions = [10, 25, 50];

  // ── Server response signals ───────────────────────────────────────────────
  insureds       = signal<Insured[]>([]);
  totalElements  = signal(0);
  totalPages     = signal(0);
  employerTotal  = signal(0);
  employerActive   = signal(0);
  employerInactive = signal(0);

  // ── Derived ───────────────────────────────────────────────────────────────
  readonly hasActiveFilters = computed(() =>
    this.memberIdFilter() !== '' ||
    this.salaryFilter()   !== null ||
    this.statusFilter()   !== 'ALL'
  );

  // ── Constructor / RxJS pipeline ───────────────────────────────────────────
  constructor() {
    // Reset to page 0 whenever a filter or sort changes (but NOT when page changes).
    effect(() => {
      this.memberIdFilter();
      this.salaryFilter();
      this.statusFilter();
      this.salarySort();
      untracked(() => this.pageIndex.set(0));
    });

    // Text inputs get a 300 ms debounce; selects / page changes are immediate.
    const memberId$ = toObservable(this.memberIdFilter).pipe(
      debounceTime(300),
      distinctUntilChanged(),
    );
    const salary$ = toObservable(this.salaryFilter).pipe(
      debounceTime(300),
      distinctUntilChanged(),
    );
    const status$    = toObservable(this.statusFilter).pipe(distinctUntilChanged());
    const sort$      = toObservable(this.salarySort).pipe(distinctUntilChanged());
    const pageIndex$ = toObservable(this.pageIndex).pipe(distinctUntilChanged());
    const pageSize$  = toObservable(this.pageSize).pipe(distinctUntilChanged());

    combineLatest([memberId$, salary$, status$, sort$, pageIndex$, pageSize$])
      .pipe(
        tap(() => this.loading.set(true)),
        switchMap(([memberId, minSalary, status, sortDir, page, size]) => {
          const emp = this.employer();
          if (!emp) { this.loading.set(false); return EMPTY; }

          return this.insuredService
            .getPage(emp.id, {
              page,
              size,
              sort: sortDir !== 'none' ? sortDir : undefined,
              memberId:  memberId  || undefined,
              status:    status    !== 'ALL' ? status : undefined,
              minSalary: minSalary ?? undefined,
            })
            .pipe(
              catchError(() => {
                this.loading.set(false);
                this.snackBar.open(
                  this.translate.instant('MANAGE_INSUREDS.LOADING_ERROR'),
                  'OK',
                  { duration: 3000 },
                );
                return EMPTY;
              }),
            );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(page => {
        this.insureds.set(page.content);
        this.totalElements.set(page.totalElements);
        this.totalPages.set(page.totalPages);
        this.employerTotal.set(page.employerTotal);
        this.employerActive.set(page.employerActive);
        this.employerInactive.set(page.employerInactive);
        this.loading.set(false);
      });
  }

  // ── Event handlers ────────────────────────────────────────────────────────

  onPageChange(event: PageEvent): void {
    this.pageSize.set(event.pageSize);
    this.pageIndex.set(event.pageIndex);
  }

  clearFilters(): void {
    this.memberIdFilter.set('');
    this.salaryFilter.set(null);
    this.statusFilter.set('ALL');
  }

  cycleSalarySort(): void {
    const next: Record<'none' | 'asc' | 'desc', 'none' | 'asc' | 'desc'> = {
      none: 'asc', asc: 'desc', desc: 'none',
    };
    this.salarySort.update(s => next[s]);
  }

  navigateToRegister(): void {
    this.router.navigate(['/dashboard/insureds/register']);
  }

  viewProfile(insured: Insured): void {
    this.router.navigate(['/dashboard/insureds', insured.id]);
  }

  updateSalary(insured: Insured): void {
    this.router.navigate(['/dashboard/insureds', insured.id, 'update-salary']);
  }

  recordEndOfService(insured: Insured): void {
    this.snackBar.open(`End of Service: ${insured.memberId}`, 'OK', { duration: 2000 });
  }
}
