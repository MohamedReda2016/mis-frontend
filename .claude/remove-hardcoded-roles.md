Right now CaseService.validateRoleForAction() hardcodes that ADMIN1 can only SUBMIT/RESUBMIT and ADMIN2 can only START_REVIEW/APPROVE/RETURN. This breaks the moment you add a third role (e.g., a finance approver or a compliance officer).

implement it in a more dynamic way add by a join table
a join table (stage_roles)
This allows multiple roles per action.

CREATE TABLE stage_roles (
id BIGINT PRIMARY KEY,
stage_definition_id BIGINT NOT NULL,
role_code VARCHAR(50) NOT NULL,
action_type VARCHAR(30) NOT NULL,

    CONSTRAINT fk_stage_roles_stage
        FOREIGN KEY (stage_definition_id)
        REFERENCES workflow_stage_definitions(id)
);

Java Model (JPA Example)
StageRole Entity
@Entity
@Table(name = "stage_roles")
public class StageRole {

    @Id
    private Long id;

    @ManyToOne
    @JoinColumn(name = "stage_definition_id")
    private WorkflowStageDefinition stageDefinition;

    private String roleCode;

    @Enumerated(EnumType.STRING)
    private ActionType actionType;
}
WorkflowStageDefinition
@OneToMany(mappedBy = "stageDefinition", fetch = FetchType.LAZY)
private List<StageRole> stageRoles;
🔍 5. New Validation Logic

Now your validation becomes data-driven.

Step-by-step
public void validateRoleForAction(User user, CaseStage caseStage, ActionType action) {

    String userRole = user.getRole();

    WorkflowStageDefinition stageDef = caseStage.getStageDefinition();

    boolean allowed = stageDef.getStageRoles().stream()
        .anyMatch(role ->
            role.getActionType() == action &&
            role.getRoleCode().equals(userRole)
        );

    if (!allowed) {
        throw new UnauthorizedException(
            "Role " + userRole + " cannot perform " + action
        );
    }
}
