export type FieldKey =
  | 'first_name_ar' | 'middle_name_ar' | 'last_name_ar'
  | 'first_name_en' | 'middle_name_en' | 'last_name_en';

export interface Insured {
  id: number;
  employerId: number;
  memberId: string;
  memberIdStrategy?: string;
  firstNameAr?: string;
  middleNameAr?: string;
  lastNameAr?: string;
  firstNameEn?: string;
  middleNameEn?: string;
  lastNameEn?: string;
  dateOfBirth: string;
  joiningDate: string;
  endDate?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  basicSalary: number;
  childrenAllowance?: number;
  complementaryAllowance?: number;
  otherAllowance?: number;
  contributableSalary: number;
}

export interface InsuredFieldConfig {
  id?: number;
  employerId: number;
  fieldKey: FieldKey;
  mandatory: boolean;
}

export interface SalaryRecord {
  id: number;
  effectiveDate: string;
  endDate?: string;
  basicSalary: number;
  childrenAllowance?: number;
  complementaryAllowance?: number;
  otherAllowance?: number;
  contributableSalary: number;
  status: 'PENDING' | 'APPROVED';
  source: 'REGISTRATION' | 'MANUAL_UPDATE';
  notes?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface InsuredProfile {
  insured: Insured;
  salaryHistory?: SalaryRecord[];
}

/** Server-side pagination envelope returned by GET /api/employers/{id}/insureds */
export interface InsuredPage {
  content: Insured[];
  totalElements: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
  /** Unfiltered total across ALL statuses (active + pending + inactive) */
  employerTotal: number;
  employerActive: number;
  employerPending: number;
  employerInactive: number;
}

/** Query parameters sent to the paginated listing endpoint */
export interface InsuredPageParams {
  page: number;
  size: number;
  sort?: string;       // "asc" | "desc" | undefined
  memberId?: string;
  status?: string;     // "ACTIVE" | "INACTIVE" | "ALL" | undefined
  minSalary?: number;
}

export type InsuredFormMode = 'create' | 'view' | 'review' | 'edit';

export interface InsuredFormControl {
  mode: InsuredFormMode;
}

export interface SalaryUpdatePayload {
  effectiveDate: string;
  basicSalary: number;
  childrenAllowance?: number;
  complementaryAllowance?: number;
  otherAllowance?: number;
  notes: string;
  /** Client-generated draft UUID used to link uploaded attachments to the created case. */
  draftRequestId?: string;
}

export interface InsuredRequest {
  memberId: string;
  firstNameAr?: string;
  middleNameAr?: string;
  lastNameAr?: string;
  firstNameEn?: string;
  middleNameEn?: string;
  lastNameEn?: string;
  dateOfBirth: string;
  joiningDate: string;
  basicSalary: number;
  childrenAllowance?: number;
  complementaryAllowance?: number;
  otherAllowance?: number;
  /** Optional remark entered at submission time — stored on the SUBMIT audit entry. */
  notes?: string;
  /** Client-generated draft UUID used to link uploaded attachments to the created case. */
  draftRequestId?: string;
}
