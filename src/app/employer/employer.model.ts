export interface Employer {
  id: number;
  code: string;
  legalNameEn: string;
  legalNameAr?: string;
  subtitle?: string;
  subtitleAr?: string;
  status: string;
  email?: string;
  iban?: string;
  memberIdStrategy?: string;
  pocMobileNumber?: string;
}

export interface EmployerDetailsRequest {
  email: string;
  iban: string;
  pocMobileNumber: string;
}

export interface SalaryConfig {
  id?: number;
  employerId?: number;
  componentKey: string;
  enabled: boolean;
  percentage: number;
  effectiveDate?: string;
  endDate?: string;
}

export interface SalaryConfigRequest {
  componentKey: string;
  enabled: boolean;
  percentage: number;
}
