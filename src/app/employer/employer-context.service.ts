import { Injectable, signal } from '@angular/core';
import { Employer } from './employer.model';

@Injectable({ providedIn: 'root' })
export class EmployerContextService {
  readonly selectedEmployer = signal<Employer | null>(null);

  setSelectedEmployer(employer: Employer): void {
    this.selectedEmployer.set(employer);
  }

  clearSelectedEmployer(): void {
    this.selectedEmployer.set(null);
  }
}
