Template Versioning (Do This First)
The most critical gap is that MisCase.templateId links to a mutable WorkflowTemplate. If you ever change the stage count or stage names on a template, every existing case that references it changes shape. Fix this with a snapshot-on-creation approach.
Add a version integer column to workflow_templates (starting at 1, auto-incremented on any structural change). When CaseService.createCase() runs, instead of storing just templateId, serialize the full template + all its stage definitions as a JSON column (workflowSnapshot NVARCHAR(MAX)) on cases. The case then has a permanent, immutable record of the exact workflow it was created under, regardless of future template edits.
The migration looks like:
sql
ALTER TABLE workflow_templates ADD version INT NOT NULL DEFAULT 1;
ALTER TABLE cases ADD workflow_snapshot NVARCHAR(MAX);
ALTER TABLE cases ADD template_version INT NOT NULL DEFAULT 1;
On the Java side, add a WorkflowSnapshotService that serializes the template and its stage definitions to JSON (Jackson is already on your classpath via Spring Boot). CaseService.createCase() calls it and stores the snapshot. Reading a case's workflow shape always reads from the snapshot, never from the live template. Live templates are only used to create new cases.
Template versioning rule: any edit to stage_count, stage_order, team_code, or stage_name triggers a version bump. You can enforce this in WorkflowTemplateService.update() — compare incoming changes, increment version if structural.
