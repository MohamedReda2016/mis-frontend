Queue Exposure (Maker / Checker)
🎯 Objective

Allow users to see and claim workflow tasks.

📥 Inputs
Workflow queue API
⚙️ Tasks
Define roles:
admin1 → MAKER
admin2 → CHECKER
Map queues:
STAGE1 → maker
STAGE2 → checker
Build API wrapper:
GET /tasks?role=CHECKER

→ internally calls:

workflowEngine.getQueue("STAGE2_QUEUE", userId)
Build claim endpoint
📤 Outputs
Task list per user role
Claim functionality
✅ Acceptance Criteria
Checker sees submitted cases
Claim locks the case
Other users cannot claim
⚠️ Constraints
Do not duplicate workflow data
Only reference workflowInstanceId

from frontend add a new two tabs as a sub tabs for the Activity tab 
one tab for Admin1 queue and second one for Admin2 queue
they should be populated by their related cases
