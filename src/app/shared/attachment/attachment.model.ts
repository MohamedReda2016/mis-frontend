export interface AttachmentDto {
  id: string;
  draftRequestId: string;
  caseId?: string;
  serviceType: string;
  originalFileName: string;
  storedFileName: string;
  fileSize: number;
  contentType?: string;
  status: 'ACTIVE' | 'DELETED';
  uploadedBy?: string;
  createdAt: string;
}

export type AttachmentServiceType = 'InsuredRegistration' | 'UpdateSalary';
