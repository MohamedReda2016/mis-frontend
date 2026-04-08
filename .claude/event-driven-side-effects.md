Event-Driven Side Effects
The current pattern of if (caseType.equals("INSURED_REGISTRATION")) activateLinkedInsureds() inside ApproveActionHandler (or currently in CaseService) is fragile. Every new case type requires editing core workflow code.
Replace this with a workflow event publisher. When ApproveActionHandler completes the final stage, it publishes a Spring ApplicationEvent:
public class CaseCompletedEvent extends ApplicationEvent {
private final MisCase misCase;
private final String performedBy;
}
Then each case type registers its own listener:
@Component
public class InsuredRegistrationCompletionHandler {
@EventListener
public void onCaseCompleted(CaseCompletedEvent event) {
if (!"INSURED_REGISTRATION".equals(event.getMisCase().getCaseType())) return;
insuredService.activateLinkedInsureds(event.getMisCase().getId());
}
}

@Component
public class SalaryUpdateCompletionHandler {
@EventListener
public void onCaseCompleted(CaseCompletedEvent event) {
if (!"SALARY_UPDATE".equals(event.getMisCase().getCaseType())) return;
insuredService.commitSalaryRecord(event.getMisCase().getId());
}
}
Adding a new case type like END_OF_SERVICE means writing a new listener — no changes to the workflow engine itself. For cases that need side effects on stage approval (not just final approval), add a StageCompletedEvent with stageOrder included so listeners can react selectively.
