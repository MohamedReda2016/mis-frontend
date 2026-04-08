export interface WorkflowDefinition {
  id: string;
  name: string;
  version: number;
  active: boolean;
}

export interface QueueDefinition {
  id: string;
  code: string;
  nameEn: string;
  nameAr?: string;
  description?: string;
  allowedRoles?: string;
  actionable: boolean;
  active: boolean;
}

export interface WorkflowStateDefinition {
  id: string;
  workflowDefinition: WorkflowDefinition;
  key: string;
  initialState: boolean;
  finalState: boolean;
  type: string;
  queue?: QueueDefinition;
}

export interface WorkflowInstance {
  id: string;
  workflowDefinition: WorkflowDefinition;
  definitionVersion: number;
  businessKey: string;
  currentState: WorkflowStateDefinition;
  dataJson?: string;
  assignedToUser?: string;
  assignedAt?: string;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * One entry in the workflow audit trail, as returned by GET /api/workflows/{id}/history.
 * Created each time a transition is triggered; ordered oldest-first by the backend.
 */
export interface CaseHistoryEntry {
  id: string;
  action: string;
  fromState: string;
  toState: string;
  payloadJson?: string;
  performedBy: string;
  performedAt: string;   // ISO-8601 instant string
  notes?: string;        // optional remark entered by the actor
}

/**
 * Business-facing case entity.
 * currentStateKey and currentQueueCode are denormalized read-model fields
 * kept in sync by the engine on every transition — use these for list/inbox
 * views instead of drilling through workflowInstance.currentState.queue.
 */
export interface WfCaseEntity {
  id: string;
  caseType: string;
  businessKey: string;
  caseDataJson?: string;
  currentStateKey: string;
  currentQueueCode?: string;
  workflowInstance: WorkflowInstance;
  createdAt: string;
  updatedAt: string;
}
