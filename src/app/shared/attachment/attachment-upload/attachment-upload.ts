import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AttachmentApiService } from '../attachment.service';
import { UploadTrackingService } from '../upload-tracking.service';
import { AttachmentDto } from '../attachment.model';

const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

interface UploadItem {
  id: string;            // local temp id before server responds
  file?: File;           // present while uploading
  attachment?: AttachmentDto; // present after upload
  uploading: boolean;
  error?: string;
}

@Component({
  selector: 'app-attachment-upload',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    TranslateModule,
  ],
  templateUrl: './attachment-upload.html',
  styleUrl: './attachment-upload.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttachmentUploadComponent implements OnInit, OnDestroy {
  private attachmentApi    = inject(AttachmentApiService);
  private uploadTracking   = inject(UploadTrackingService);
  private snackBar         = inject(MatSnackBar);
  private translate        = inject(TranslateService);

  /**
   * Draft-mode: client-generated UUID that groups all files for one draft session.
   * If omitted the component auto-generates one internally (used in case-mode).
   */
  draftRequestId = input<string | undefined>(undefined);
  /**
   * Case-mode: the workflow-instance UUID.
   * When set the component lists attachments by case and links new uploads
   * directly to the case — bypassing the draft→case linking step.
   */
  caseId = input<string | undefined>(undefined);
  /** Logical service type, e.g. "InsuredRegistration" or "UpdateSalary". */
  serviceType = input.required<string>();
  /** Logged-in username forwarded to the backend. */
  uploadedBy = input<string | undefined>(undefined);
  /** When true the component is read-only (no upload / delete). */
  readonly = input(false);

  /** Fallback draft UUID used internally when caseId is provided (case-mode). */
  private readonly sessionDraftId = crypto.randomUUID();

  items = signal<UploadItem[]>([]);
  dragOver = signal(false);

  activeAttachments = computed(() =>
    this.items().filter(it => it.attachment?.status === 'ACTIVE' || it.uploading)
  );

  ngOnInit(): void {
    const cid = this.caseId();
    const effectiveDraftId = this.draftRequestId() ?? this.sessionDraftId;
    const isDraftMode = !cid;

    const source$ = cid
      ? this.attachmentApi.listByCase(cid)
      : this.attachmentApi.listByDraft(effectiveDraftId);

    source$.subscribe({
      next: list => {
        const existing: UploadItem[] = list.map(att => ({
          id: att.id,
          attachment: att,
          uploading: false,
        }));
        this.items.set(existing);

        // Register this session with the tracking service so the route guard
        // can inspect upload state without a direct reference to this component.
        if (isDraftMode) {
          this.uploadTracking.beginDraftSession(effectiveDraftId, existing.length);
        }
      },
      error: () => { /* Not critical — user can still upload fresh files. */ },
    });
  }

  ngOnDestroy(): void {
    // Always reset tracking state when the component is torn down so the next
    // page starts with a clean slate.
    this.uploadTracking.endSession();
  }

  // ── Drag & Drop ─────────────────────────────────────────────────────────────

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(false);
    const files = event.dataTransfer?.files;
    if (files) this.enqueueFiles(Array.from(files));
  }

  // ── File Input ──────────────────────────────────────────────────────────────

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.enqueueFiles(Array.from(input.files));
      input.value = ''; // reset so the same file can be re-selected if deleted
    }
  }

  // ── Upload ──────────────────────────────────────────────────────────────────

  private enqueueFiles(files: File[]): void {
    for (const file of files) {
      const validationError = this.validate(file);
      if (validationError) {
        this.snackBar.open(validationError, 'OK', { duration: 4000 });
        continue;
      }
      this.uploadFile(file);
    }
  }

  private validate(file: File): string | null {
    if (file.size > MAX_SIZE_BYTES) {
      return this.translate.instant('ATTACHMENTS.ERROR_TOO_LARGE', { name: file.name });
    }
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return this.translate.instant('ATTACHMENTS.ERROR_BAD_TYPE', { name: file.name });
    }
    return null;
  }

  private uploadFile(file: File): void {
    const tempId = crypto.randomUUID();
    const item: UploadItem = { id: tempId, file, uploading: true };
    this.items.update(list => [...list, item]);

    const isDraftMode = !this.caseId();
    const effectiveDraftId = this.draftRequestId() ?? this.sessionDraftId;

    this.uploadTracking.trackUploadStart();

    this.attachmentApi.upload(
      file, effectiveDraftId, this.serviceType(), this.uploadedBy(), this.caseId(),
    ).subscribe({
      next: att => {
        this.uploadTracking.trackUploadEnd();
        if (isDraftMode) this.uploadTracking.trackAttachmentAdded();

        this.items.update(list =>
          list.map(it => it.id === tempId ? { id: att.id, attachment: att, uploading: false } : it)
        );
      },
      error: err => {
        this.uploadTracking.trackUploadEnd();

        const msg = err.error?.message
          ?? this.translate.instant('ATTACHMENTS.ERROR_UPLOAD_FAILED', { name: file.name });
        this.items.update(list =>
          list.map(it => it.id === tempId ? { ...it, uploading: false, error: msg } : it)
        );
      },
    });
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  remove(item: UploadItem): void {
    if (!item.attachment) {
      // Still uploading or errored — just remove from local list.
      this.items.update(list => list.filter(it => it.id !== item.id));
      return;
    }
    this.attachmentApi.delete(item.attachment.id).subscribe({
      next: () => {
        if (!this.caseId()) this.uploadTracking.trackAttachmentRemoved();
        this.items.update(list => list.filter(it => it.id !== item.id));
      },
      error: () => {
        this.snackBar.open(this.translate.instant('ATTACHMENTS.ERROR_DELETE_FAILED'), 'OK', { duration: 3000 });
      },
    });
  }

  // ── Preview ─────────────────────────────────────────────────────────────────

  previewing  = signal<string | null>(null); // id of file currently being previewed
  downloading = signal<string | null>(null); // id of file currently being downloaded

  // ── Download ────────────────────────────────────────────────────────────────

  download(item: UploadItem): void {
    if (!item.attachment || this.downloading() === item.attachment.id) return;

    const id = item.attachment.id;
    const fileName = item.attachment.originalFileName;
    this.downloading.set(id);

    this.attachmentApi.download(id).subscribe({
      next: blob => {
        this.downloading.set(null);
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = fileName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
      },
      error: () => {
        this.downloading.set(null);
        this.snackBar.open(
          this.translate.instant('ATTACHMENTS.ERROR_DOWNLOAD_FAILED'),
          'OK',
          { duration: 3000 },
        );
      },
    });
  }

  preview(item: UploadItem): void {
    if (!item.attachment || this.previewing() === item.attachment.id) return;

    const id = item.attachment.id;
    this.previewing.set(id);

    this.attachmentApi.download(id).subscribe({
      next: blob => {
        this.previewing.set(null);
        const objectUrl = URL.createObjectURL(blob);
        const win = window.open(objectUrl, '_blank');
        // Revoke the object URL once the new tab has had time to load the blob.
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
        if (!win) {
          // Pop-up was blocked — fall back to a download link.
          const a = document.createElement('a');
          a.href = objectUrl;
          a.download = item.attachment!.originalFileName;
          a.click();
        }
      },
      error: () => {
        this.previewing.set(null);
        this.snackBar.open(
          this.translate.instant('ATTACHMENTS.ERROR_PREVIEW_FAILED'),
          'OK',
          { duration: 3000 },
        );
      },
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  fileIcon(item: UploadItem): string {
    const ct = item.attachment?.contentType ?? item.file?.type ?? '';
    if (ct.startsWith('image/'))        return 'image';
    if (ct === 'application/pdf')       return 'picture_as_pdf';
    if (ct.includes('word'))            return 'description';
    if (ct.includes('excel') || ct.includes('spreadsheet')) return 'table_chart';
    return 'attach_file';
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}
