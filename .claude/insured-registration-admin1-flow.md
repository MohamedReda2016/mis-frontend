Start Workflow on Submit
Trigger workflow when insured is submitted.

Tasks
Inject workflow engine into insured service
Modify submit():
UUID wfId = workflowEngine.start(
"InsuredRegistration",
insured.getId().toString(),
insuredJson
);
Add field:
workflowInstanceId
Update status:
status = IN_REVIEW
📤 Outputs
Workflow instance created on submit
✅ Acceptance Criteria
Submitting insured creates workflow instance
Workflow is in STAGE1
businessKey = insuredId
queue name = Admin1 Queue

The Insured entity is now workflow-agnostic. The link is purely through workflow_instance.business_key = insured.id.toString() — no workflow knowledge bleeds into the business table. The status =
"IN_REVIEW" update is still applied as it's a business state, not workflow metadata.
no cross-module dependencies on the main controller or dto packages.

To add a new workflow type in future, you only need to:
1. Create the form component
2. Add an @if branch in case-detail.html
3. The control / initialData / approved / rejected interface becomes the contract all pluggable components follow.
                                                                                
