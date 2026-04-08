Design and implement a config-driven case and document management system with the following requirements:

Case & Workflow Structure:

Each business request is a Case.
Cases can be single-stage or multi-stage depending on business service.
Define Workflow Templates per business service (case type).
Each template has ordered stages, each assigned to a team.
Each stage has a state machine: DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → COMPLETED.
Approval per stage involves Admin1 (submitter) and Admin2 (approver).
System moves automatically to the next stage when the current stage is approved.
Multi-stage examples: Contribution → Payment, Outstanding Contribution → Payment.
Single-stage examples: Insured Registration, Salary Update (single/bulk).

Case Details & Insured Management:

Each case may include one or multiple insureds.
Insureds may be represented as:
Table view (bulk cases)
Read-only form (single insured, end-of-service, registration)
UI dynamically renders Details tab based on case type.
Allow hybrid: table + side panel/modal for individual insured detail.

Documents & Attachments:

Support attachments per case and per stage.
Preserve original filenames for download and display.
Allow adding documents at any stage.

Activity & Notes History:

Maintain a unified timeline (case_activity) including:
Status changes
Comments/notes
Attachments
Timestamps and user info
Show history per stage and per case, with latest activity visible first.
Users can add notes and attachments per stage with proper role permissions.

Roles & Permissions:

Only current stage team can act (submit, approve, return).
Other teams and future stages are read-only.
Admin1 → submit/resubmit, Admin2 → approve/return.

UI Requirements:
new tab named Activity have cases
Case page tabs: Overview | Details | Documents | Activity
Dynamic Details tab: renders form/table based on case type.
Stage stepper: shows stages, completed vs current vs pending stages.
Timeline in Activity tab with collapsible sections per stage.
Bulk and single insured support: table with modal/detail view.

Backend Requirements:

Database schema: Cases, Case_Stages, Case_Activity, Documents, Case_Insured.
Config-driven templates for all business services.
Stage-level workflow engine: auto-transition stages.
Retrieve all documents, notes, and insureds per case efficiently.
Support future addition of new business services or stages without code changes.

Goal: Build a scalable, dynamic, multi-stage workflow system with full traceability, per-case and per-stage document management, and dynamic UI rendering for all business services.

[ADMIN1 creates registration]
│
▼                                                                                                                                                                                                      
Stage: SUBMITTED          ← Case is auto-submitted at creation (no DRAFT step at start)
Overall: SUBMITTED                                                                                                                                                                                                
│                                                 
│  ADMIN2: START_REVIEW                                                                                                                                                                                
▼                                                 
Stage: UNDER_REVIEW                                                                                                                                                                                          
Overall: UNDER_REVIEW
│                                                                                                                                                                                                      
┌─┴──────────────┐                                  
│                │                                                                                                                                                                                       
ADMIN2: APPROVE   ADMIN2: RETURN
│                │                                                                                                                                                                                       
▼                ▼                                  
Stage: APPROVED   Stage: RETURNED
Overall: APPROVED   Overall: RETURNED
│                │                                                                                                                                                                                       
│           ADMIN1: RESUBMIT
│                │                                                                                                                                                                                       
│                ▼                                                                                                                                                                                       
│           Stage: SUBMITTED
│           Overall: SUBMITTED  ← loops back up                                                                                                                                                               
│                                                                                                                                                                                                        
[auto-transition]
│                                                                                                                                                                                                        
▼
Stage: COMPLETED
Overall: COMPLETED          
