The workflow engine implementation is complete and correct. All files are in place:

- 21 Java files under gpssa.mis.pension.workflow.* (entities, repositories, services, config, controller)
- 3 Liquibase migrations: 025 (revert + clear), 026 (7 new tables), 027 (MemberRegistration seed)
- WorkflowEngineService with start(), claim(), trigger(), getQueue(), and outbox sequencing
- OutboxWorker with @Scheduled(fixedDelay = 5000) for ordered side-effect processing
- PensionApplication with @EnableScheduling

The existing CaseService is back to its original inline switch-based logic with hardcoded ADMIN1/ADMIN2 roles — running independently from the new workflow engine which operates through its own
/api/workflows/* endpoints.

remove now all classes related to the old workflow like CaseStage, CaseInsured, CaseDocument, CaseActivity,MisCase
workflowStageDefinition, workflowTemplate and all relevant classes

also from frontend and database layer as well

Business table has no workflow knowledge
