import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Employer, EmployerDetailsRequest, SalaryConfig, SalaryConfigRequest } from './employer.model';

@Injectable({ providedIn: 'root' })
export class EmployerService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/employers`;

  getAll() {
    return this.http.get<Employer[]>(this.base);
  }

  updateConfig(id: number, memberIdStrategy: string) {
    return this.http.put<Employer>(`${this.base}/${id}/config`, { memberIdStrategy });
  }

  updateDetails(id: number, request: EmployerDetailsRequest) {
    return this.http.put<Employer>(`${this.base}/${id}/details`, request);
  }

  getActiveSalaryConfig(employerId: number) {
    return this.http.get<SalaryConfig[]>(`${this.base}/${employerId}/salary-config`);
  }

  getSalaryConfigHistory(employerId: number) {
    return this.http.get<SalaryConfig[]>(`${this.base}/${employerId}/salary-config/history`);
  }

  updateSalaryConfig(employerId: number, requests: SalaryConfigRequest[]) {
    return this.http.put<SalaryConfig[]>(`${this.base}/${employerId}/salary-config`, requests);
  }
}
