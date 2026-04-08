import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Insured } from '../insured/insured.model';
import { CaseHistoryEntry, WfCaseEntity, WorkflowInstance } from './activity.model';

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/workflows`;

  getInstance(id: string): Observable<WorkflowInstance> {
    return this.http.get<WorkflowInstance>(`${this.base}/${id}`);
  }

  getQueue(queueName: string, user: string): Observable<WorkflowInstance[]> {
    return this.http.get<WorkflowInstance[]>(`${this.base}/queues/${queueName}`, {
      params: { user },
    });
  }

  /**
   * Case-entity–based inbox query.
   * Uses the denormalized currentQueueCode field on WfCaseEntity — one join
   * instead of three. Prefer this over getQueue() for list and inbox views.
   */
  getCasesByQueue(queueCode: string, user: string): Observable<WfCaseEntity[]> {
    return this.http.get<WfCaseEntity[]>(`${this.base}/cases/queue/${queueCode}`, {
      params: { user },
    });
  }

  /** Fetches the full audit trail for an instance, ordered oldest-first. */
  getHistory(instanceId: string): Observable<CaseHistoryEntry[]> {
    return this.http.get<CaseHistoryEntry[]>(`${this.base}/${instanceId}/history`);
  }

  claim(instanceId: string, user: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${instanceId}/claim`, null, {
      params: { user },
    });
  }

  updateInstanceData(instanceId: string, insured: Insured): Observable<WorkflowInstance> {
    return this.http.put<WorkflowInstance>(`${this.base}/${instanceId}/data`, insured);
  }

  trigger(instanceId: string, action: string, user: string, notes?: string): Observable<void> {
    const params: Record<string, string> = { user };
    if (notes?.trim()) params['notes'] = notes.trim();
    return this.http.post<void>(`${this.base}/${instanceId}/trigger/${action}`, null, { params });
  }
}
