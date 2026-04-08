import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Insured, InsuredFieldConfig, InsuredPage, InsuredPageParams, InsuredProfile, InsuredRequest, SalaryUpdatePayload } from './insured.model';

@Injectable({ providedIn: 'root' })
export class InsuredService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/employers`;

  /**
   * Server-side paginated listing.
   * Replaces the old `getAll()` bulk fetch for the manage-insureds screen.
   */
  getPage(employerId: number, params: InsuredPageParams): Observable<InsuredPage> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('size', params.size);

    if (params.sort)                       httpParams = httpParams.set('sort', params.sort);
    if (params.memberId?.trim())           httpParams = httpParams.set('memberId', params.memberId.trim());
    if (params.status && params.status !== 'ALL') httpParams = httpParams.set('status', params.status);
    if (params.minSalary != null)          httpParams = httpParams.set('minSalary', params.minSalary);

    return this.http.get<InsuredPage>(`${this.base}/${employerId}/insureds`, { params: httpParams });
  }

  /**
   * Returns a flat `Insured[]` for components that need the full list (e.g. overview stats).
   * Internally fetches page 0 with a large page size and extracts `content`.
   * @deprecated Prefer getPage() for paginated list screens.
   */
  getAll(employerId: number): Observable<Insured[]> {
    return this.getPage(employerId, { page: 0, size: 1000 }).pipe(
      map(page => page.content)
    );
  }

  getById(employerId: number, insuredId: number) {
    return this.http.get<Insured>(`${this.base}/${employerId}/insureds/${insuredId}`);
  }

  register(employerId: number, request: InsuredRequest, user: string): Observable<Insured> {
    return this.http.post<Insured>(`${this.base}/${employerId}/insureds`, request, {
      params: { user },
    });
  }

  update(employerId: number, insuredId: number, request: InsuredRequest): Observable<Insured> {
    return this.http.put<Insured>(`${this.base}/${employerId}/insureds/${insuredId}`, request);
  }

  getProfile(employerId: number, insuredId: number): Observable<InsuredProfile> {
    return this.http.get<InsuredProfile>(`${this.base}/${employerId}/insureds/${insuredId}/profile`);
  }

  submitSalaryUpdate(employerId: number, insuredId: number, payload: SalaryUpdatePayload): Observable<unknown> {
    return this.http.post(
      `${this.base}/${employerId}/insureds/${insuredId}/salary-update`,
      payload
    );
  }

  getFieldConfig(employerId: number) {
    return this.http.get<InsuredFieldConfig[]>(`${this.base}/${employerId}/insured-field-config`);
  }

  updateFieldConfig(employerId: number, fields: { fieldKey: string; mandatory: boolean }[]) {
    return this.http.put<InsuredFieldConfig[]>(
      `${this.base}/${employerId}/insured-field-config`,
      { fields }
    );
  }
}
