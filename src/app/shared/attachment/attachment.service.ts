import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AttachmentDto } from './attachment.model';

@Injectable({ providedIn: 'root' })
export class AttachmentApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/attachments`;

  upload(
    file: File,
    draftRequestId: string,
    serviceType: string,
    uploadedBy?: string,
    /** When provided the backend links the attachment directly to the case (case-mode uploads). */
    caseId?: string,
  ): Observable<AttachmentDto> {
    const form = new FormData();
    form.append('file', file);
    form.append('draftRequestId', draftRequestId);
    form.append('serviceType', serviceType);
    if (uploadedBy) form.append('uploadedBy', uploadedBy);
    if (caseId)     form.append('caseId', caseId);
    return this.http.post<AttachmentDto>(`${this.base}/upload`, form);
  }

  listByDraft(draftRequestId: string): Observable<AttachmentDto[]> {
    return this.http.get<AttachmentDto[]>(`${this.base}/draft/${draftRequestId}`);
  }

  listByCase(caseId: string): Observable<AttachmentDto[]> {
    return this.http.get<AttachmentDto[]>(`${this.base}/case/${caseId}`);
  }

  /**
   * Downloads the file with the auth token applied (via HttpClient interceptor).
   * Returns a Blob so the caller can create an object URL for preview/download.
   */
  download(id: string): Observable<Blob> {
    return this.http.get(`${this.base}/${id}/download`, { responseType: 'blob' });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  /**
   * Bulk-discard all ACTIVE draft attachments for an abandoned session.
   * Called by the navigation guard when the user leaves a form without submitting.
   */
  discardDraft(draftRequestId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/draft/${draftRequestId}`);
  }
}
