import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

export interface PageEvent {
  pageIndex: number;
  pageSize: number;
}

@Component({
  selector: 'app-paging-bar',
  imports: [MatIconModule, TranslateModule],
  templateUrl: './paging-bar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PagingBarComponent {
  totalItems = input.required<number>();
  pageIndex = input.required<number>();
  pageSize = input.required<number>();
  pageSizeOptions = input<number[]>([10, 25, 50]);

  pageChange = output<PageEvent>();

  readonly pageStart = computed(() =>
    this.totalItems() === 0 ? 0 : this.pageIndex() * this.pageSize() + 1
  );
  readonly pageEnd = computed(() =>
    Math.min((this.pageIndex() + 1) * this.pageSize(), this.totalItems())
  );
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalItems() / this.pageSize()))
  );
  readonly isFirstPage = computed(() => this.pageIndex() === 0);
  readonly isLastPage = computed(() => this.pageIndex() >= this.totalPages() - 1);

  firstPage(): void { this.pageChange.emit({ pageIndex: 0, pageSize: this.pageSize() }); }
  prevPage(): void  { this.pageChange.emit({ pageIndex: this.pageIndex() - 1, pageSize: this.pageSize() }); }
  nextPage(): void  { this.pageChange.emit({ pageIndex: this.pageIndex() + 1, pageSize: this.pageSize() }); }
  lastPage(): void  { this.pageChange.emit({ pageIndex: this.totalPages() - 1, pageSize: this.pageSize() }); }

  onPageSizeChange(e: Event): void {
    this.pageChange.emit({ pageIndex: 0, pageSize: +(e.target as HTMLSelectElement).value });
  }
}
