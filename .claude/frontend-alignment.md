On the Angular side, two changes are needed to stay in sync.
First, CaseDetailComponent.allowedActions() currently computes allowed actions from hardcoded role constants. 
It should instead derive them from the stage's stageRoles. Add these to CaseStageResponse (the DTO) and the frontend reads them directly. This means the frontend automatically adapts when you reconfigure stage roles in the database, with no Angular code changes.
Second, add a workflowVersion field to CaseDetailResponse (mapped from MisCase.templateVersion). Display this in the case detail UI — even just a small "Workflow v1" badge — so support staff can identify which workflow version a case was created under when troubleshooting older in-flight cases
