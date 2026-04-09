import { Injectable, computed, signal } from '@angular/core';

/**
 * Singleton that {@link AttachmentUploadComponent} writes into so that route guards
 * can inspect upload state without needing a direct reference to the child component.
 *
 * ## Contract
 * - In **draft mode** the component calls {@link beginDraftSession} once on init.
 * - In **case mode** the component does NOT call {@link beginDraftSession} — only
 *   in-progress tracking is active (used by the case-detail navigation guard).
 * - The component always calls {@link endSession} on destroy.
 */
@Injectable({ providedIn: 'root' })
export class UploadTrackingService {

  private readonly _inProgress = signal(0);
  private readonly _draftId    = signal<string | null>(null);
  private readonly _draftCount = signal(0);

  /** True while at least one file is being transmitted to the server. */
  readonly uploadsInProgress = computed(() => this._inProgress() > 0);

  /** True when the current draft session has at least one successfully uploaded file. */
  readonly hasDraftAttachments = computed(() => this._draftCount() > 0);

  /** The draft UUID for the active session, or null when in case mode / no session. */
  readonly currentDraftId = this._draftId.asReadonly();

  // ── Session lifecycle ───────────────────────────────────────────────────────

  /**
   * Called by {@link AttachmentUploadComponent} in draft mode once the initial
   * file list has been loaded from the server.
   *
   * @param draftId       the client-generated draft UUID for this form session
   * @param existingCount number of ACTIVE attachments already on the server for this draft
   */
  beginDraftSession(draftId: string, existingCount: number): void {
    this._draftId.set(draftId);
    this._draftCount.set(existingCount);
    this._inProgress.set(0);
  }

  /**
   * Called by {@link AttachmentUploadComponent} on destroy.
   * Resets all state so the next form opens with a clean slate.
   */
  endSession(): void {
    this._draftId.set(null);
    this._draftCount.set(0);
    this._inProgress.set(0);
  }

  // ── Upload lifecycle tracking (called for all modes) ───────────────────────

  /** Called just before an HTTP upload request is dispatched. */
  trackUploadStart(): void {
    this._inProgress.update(n => n + 1);
  }

  /** Called when an upload completes (success or error). */
  trackUploadEnd(): void {
    this._inProgress.update(n => Math.max(0, n - 1));
  }

  // ── Draft attachment counting (called only in draft mode) ──────────────────

  /** Called after a draft-mode file is successfully stored on the server. */
  trackAttachmentAdded(): void {
    this._draftCount.update(n => n + 1);
  }

  /**
   * Called when a draft-mode attachment is removed from the server.
   * Mirrors {@link trackAttachmentAdded} so the guard always has an accurate count.
   */
  trackAttachmentRemoved(): void {
    this._draftCount.update(n => Math.max(0, n - 1));
  }
}
