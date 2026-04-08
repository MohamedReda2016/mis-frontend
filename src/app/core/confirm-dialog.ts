import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

// ── Public interface ─────────────────────────────────────────────────────────

export interface ConfirmDialogData {
  /** i18n key for the dialog title */
  titleKey: string;
  /** i18n key for the body message */
  messageKey: string;
  /** Optional interpolation params passed to the translate pipe */
  messageParams?: Record<string, unknown>;
  /** i18n key for the cancel button (defaults to COMMON.CANCEL) */
  cancelKey?: string;
  /** i18n key for the confirm button (defaults to COMMON.CONFIRM) */
  confirmKey?: string;
  /**
   * Visual theme.
   * - `warning`  (default) — amber icon, used for destructive / irreversible actions
   * - `danger`   — red icon, used for deletions
   * - `info`     — navy icon, used for neutral confirmations
   */
  variant?: 'warning' | 'danger' | 'info';
}

// ── Internal variant config ──────────────────────────────────────────────────

interface VariantConfig { icon: string; circleClass: string; confirmClass: string; }

const VARIANT: Record<NonNullable<ConfirmDialogData['variant']>, VariantConfig> = {
  warning: { icon: 'warning_amber',  circleClass: 'dlg-circle--warning', confirmClass: 'dlg-confirm--warning' },
  danger:  { icon: 'delete_forever', circleClass: 'dlg-circle--danger',  confirmClass: 'dlg-confirm--danger'  },
  info:    { icon: 'info',           circleClass: 'dlg-circle--info',    confirmClass: 'dlg-confirm--info'    },
};

// ── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-confirm-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule, TranslateModule],
  template: `
    <div class="dlg">

      <!-- Coloured icon circle -->
      <div class="dlg-icon-row">
        <span class="dlg-circle" [class]="vc().circleClass">
          <mat-icon aria-hidden="true">{{ vc().icon }}</mat-icon>
        </span>
      </div>

      <!-- Title -->
      <h2 class="dlg-title" mat-dialog-title>{{ data.titleKey | translate }}</h2>

      <!-- Body -->
      <mat-dialog-content class="dlg-body">
        <p class="dlg-message">{{ data.messageKey | translate: (data.messageParams ?? {}) }}</p>
      </mat-dialog-content>

      <!-- Actions -->
      <mat-dialog-actions class="dlg-actions">
        <button mat-stroked-button class="dlg-cancel" [mat-dialog-close]="false">
          {{ (data.cancelKey ?? 'COMMON.CANCEL') | translate }}
        </button>
        <button
          mat-flat-button
          class="dlg-confirm"
          [class]="vc().confirmClass"
          [mat-dialog-close]="true"
        >
          {{ (data.confirmKey ?? 'COMMON.CONFIRM') | translate }}
        </button>
      </mat-dialog-actions>

    </div>
  `,
  styles: [`
    /* ── Wrapper ── */
    .dlg { width: 100%; padding: 0; box-sizing: border-box; }

    /* ── Icon row ── */
    .dlg-icon-row {
      display: flex;
      justify-content: center;
      padding-top: 32px;
    }

    .dlg-circle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 68px;
      height: 68px;
      border-radius: 50%;

      mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
      }
    }

    /* ── UAE / GPSSA palette for dialog variants ──────────────────────────────
     * warning → GPSSA gold (#7c5e24)  — unsaved changes / non-destructive
     * danger  → UAE DS Red (#c8102e)  — deletions / irreversible actions
     * info    → UAE DS Green (#006b48) — neutral confirmations
     * ────────────────────────────────────────────────────────────────────── */
    .dlg-circle--warning { background: #f5e6c8; mat-icon { color: #7c5e24; } }
    .dlg-circle--danger  { background: #fde8ea; mat-icon { color: #c8102e; } }
    .dlg-circle--info    { background: #e6f2ee; mat-icon { color: #006b48; } }

    /* ── Title ── */
    .dlg-title {
      text-align: center;
      font-size: 18px !important;
      font-weight: 700 !important;
      font-family: 'Inter', 'Roboto', sans-serif;
      color: #1a1e21;
      margin: 16px 28px 0 !important;
      padding: 0 !important;
      line-height: 1.3;
    }

    /* ── Body ── */
    .dlg-body {
      padding: 8px 28px 0 !important;
      max-height: unset !important;
      overflow: visible !important;
    }

    .dlg-message {
      text-align: center;
      color: #6b7280;
      font-size: 14px;
      line-height: 1.65;
      margin: 0;
    }

    /* ── Actions ── */
    .dlg-actions {
      display: flex !important;
      justify-content: flex-end !important;
      gap: 10px;
      padding: 20px 24px 24px !important;
      min-height: unset !important;
    }

    .dlg-cancel {
      border-radius: 8px !important;
      height: 40px;
      font-weight: 500 !important;
      color: #6b7280 !important;
      border-color: #e8e2d8 !important;
      min-width: 88px;
    }

    .dlg-confirm {
      border-radius: 8px !important;
      height: 40px;
      font-weight: 600 !important;
      min-width: 100px;
      color: #fff !important;
    }

    /* GPSSA gold — warning variant */
    .dlg-confirm--warning       { background-color: #7c5e24 !important; }
    .dlg-confirm--warning:hover { background-color: #5e4718 !important; }

    /* UAE DS Red — danger variant */
    .dlg-confirm--danger        { background-color: #c8102e !important; }
    .dlg-confirm--danger:hover  { background-color: #a00d25 !important; }

    /* UAE DS Green — info variant */
    .dlg-confirm--info          { background-color: #006b48 !important; }
    .dlg-confirm--info:hover    { background-color: #005236 !important; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  protected data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  protected vc = computed(() => VARIANT[this.data.variant ?? 'warning']);
}
