# Workflow Engine – Full Technical Design  
### DB‑Driven Workflow • Queues • Claiming • Case • Case History • Ordered Outbox Events  
### Example Workflow: Member Registration (3 Stages)

---

# 1. Introduction

This document describes a **complete, production‑grade workflow engine** designed for enterprise systems such as pension administration, insurance onboarding, KYC/AML processes, and multi‑stage approvals.

The engine supports:

- Workflow definitions stored in the database  
- Human and system states  
- Multi‑stage approval flows  
- Queues derived from workflow state  
- Claiming & locking  
- Case + Case History  
- Ordered Outbox Events for side effects  
- Retry‑safe, crash‑safe execution  
- Pluggable action handlers  
- Fully auditable transitions  

The example workflow used throughout is **Insured Registration**, with 2 human stages (maker,checker) and checker do approval.

---

# 2. Architecture Overview

## Workflow Engine

- WorkflowDefinition / WorkflowStateDefinition / Transition
- WorkflowInstance (runtime)                                   
- Case + CaseHistory                                           
- Action Handler Registry                                      
- Ordered Outbox Event System                                  
- Outbox Worker (retry-safe side effects)  

Queues = derived from WorkflowStateDefinition.queueName
Claiming = stored on WorkflowInstance
Side effects = executed via ordered OutboxEvent sequences

---

# 3. Core Concepts

### **WorkflowDefinition**
Defines a workflow type (e.g., InsuredRegistration).

### **WorkflowStateDefinition**
Defines states such as STAGE1, STAGE2, STAGE3, APPROVED, REJECTED.  
Each state may have a **queueName**.

### **WorkflowTransitionDefinition**
Defines transitions between states based on triggers (APPROVE, REJECT, RETURN).

### **WorkflowInstance**
A running instance of a workflow.  
Stores current state, data, assignment, lock, timestamps.

### **CaseEntity**
Represents the business case tied to a workflow instance.

### **CaseHistory**
Audit log of all actions taken on a case.

### **OutboxEvent**
Represents a side‑effect event that must be executed **after** workflow commit.  
Supports **ordered sequences** per workflow instance.

---

# 4. Data Model (Entities)

Below are all entities in full detail.

---

## 4.1 WorkflowDefinition

```java
@Entity
public class WorkflowDefinition {

    @Id
    private UUID id;

    private String name;    // e.g. "MemberRegistration"
    private int version;
    private boolean active;
}
```
## 4.2 WorkflowStateDefinition
```java
@Entity
public class WorkflowStateDefinition {

    @Id
    private UUID id;

    @ManyToOne
    private WorkflowDefinition workflowDefinition;

    private String key;          // STAGE1, STAGE2, STAGE3, APPROVED, REJECTED
    private boolean initialState;
    private boolean finalState;
    private String type;         // HUMAN / SYSTEM
    private String queueName;    // STAGE1_QUEUE, STAGE2_QUEUE, STAGE3_QUEUE, null
}
```
## 4.3 WorkflowTransitionDefinition
```java
@Entity
public class WorkflowTransitionDefinition {

    @Id
    private UUID id;

    @ManyToOne
    private WorkflowDefinition workflowDefinition;

    @ManyToOne
    private WorkflowStateDefinition fromState;

    @ManyToOne
    private WorkflowStateDefinition toState;

    private String triggerKey; // APPROVE / REJECT / RETURN

    // NEW: condition expression
    private String conditionExpression; 
}
```
## 4.4 WorkflowInstance
```java
@Entity
public class WorkflowInstance {

    @Id
    private UUID id;

    @ManyToOne
    private WorkflowDefinition workflowDefinition;

    private int definitionVersion;
    private String businessKey;

    @ManyToOne
    private WorkflowStateDefinition currentState;

    @Column(columnDefinition = "TEXT")
    private String dataJson;

    // Claiming / locking
    private String assignedToUser;
    private Instant assignedAt;
    private boolean locked;

    private Instant createdAt;
    private Instant updatedAt;
}
```
## 4.5 CaseEntity
```java
@Entity
public class CaseEntity {

    @Id
    private UUID id;

    private String caseType;     // e.g., InsuredRegistration
    private String businessKey;  // e.g., memberId

    @Column(columnDefinition = "TEXT")
    private String caseDataJson;

    @OneToOne
    private WorkflowInstance workflowInstance;

    private Instant createdAt;
    private Instant updatedAt;
}
```
## 4.6 CaseHistory
```java
@Entity
public class CaseHistory {

    @Id
    private UUID id;

    @ManyToOne
    private CaseEntity caseEntity;

    private String action;       // APPROVE / REJECT / RETURN / ERROR:...
    private String fromState;
    private String toState;

    @Column(columnDefinition = "TEXT")
    private String payloadJson;

    private String performedBy;
    private Instant performedAt;
}
```
## 4.7 OutboxEvent (Ordered Side Effects)
```java
@Entity
public class OutboxEvent {

    @Id
    private UUID id;

    private UUID workflowInstanceId;

    // Group of related events (e.g., "InsuredRegistration:<instanceId>:APPROVE")
    private String groupId;

    // Order within group (1, 2, 3...)
    private int stepOrder;

    private String eventType;    // CALL_KYC, GENERATE_PDF, SEND_EMAIL

    @Column(columnDefinition = "TEXT")
    private String payloadJson;

    private boolean processed;
    private Instant createdAt;
    private Instant processedAt;
}
```
# 5. Entity Relationship Diagram
### WorkflowDefinition
- **Relationships:**
  - 1 → * WorkflowStateDefinition
  - 1 → * WorkflowInstance

### WorkflowStateDefinition
- **Relationships:**
  - * → 1 WorkflowDefinition
  - 1 → * WorkflowTransitionDefinition *(fromState)*
  - 1 → * WorkflowTransitionDefinition *(toState)*

### WorkflowTransitionDefinition
- **Relationships:**
  - * → 1 WorkflowStateDefinition *(fromState)*
  - * → 1 WorkflowStateDefinition *(toState)*

### WorkflowInstance
- **Relationships:**
  - * → 1 WorkflowDefinition
  - 1 → 1 CaseEntity
  - 1 → * OutboxEvent *(ordered by groupId + stepOrder)*

### CaseEntity
- **Relationships:**
  - 1 → 1 WorkflowInstance
  - 1 → * CaseHistory

### CaseHistory
- **Relationships:**
  - * → 1 CaseEntity

### OutboxEvent
- **Relationships:**
  - * → 1 WorkflowInstance
- **Ordering:**
  - (groupId, stepOrder)

# 6. Repository Layer

The repository layer provides persistence access for all workflow entities.

---

## 6.1 WorkflowDefinitionRepository

```java
public interface WorkflowDefinitionRepository extends JpaRepository<WorkflowDefinition, UUID> {
    Optional<WorkflowDefinition> findFirstByNameAndActiveTrueOrderByVersionDesc(String name);
}
```
### 6.2 WorkflowStateDefinitionRepository
```java
public interface WorkflowStateDefinitionRepository extends JpaRepository<WorkflowStateDefinition, UUID> {
    List<WorkflowStateDefinition> findByWorkflowDefinitionId(UUID defId);
}
```
### 6.3 WorkflowTransitionDefinitionRepository
```java 
public interface WorkflowTransitionDefinitionRepository extends JpaRepository<WorkflowTransitionDefinition, UUID> {
    List<WorkflowTransitionDefinition> findByWorkflowDefinitionIdAndFromStateId(UUID defId, UUID fromStateId);
}
```
### 6.4 WorkflowInstanceRepository
```java
public interface WorkflowInstanceRepository extends JpaRepository<WorkflowInstance, UUID> {

    @Query("""
        select i from WorkflowInstance i
        where i.currentState.queueName = :queueName
          and (i.locked = false or i.assignedToUser = :userId)
    """)
    List<WorkflowInstance> findQueueForUser(String queueName, String userId);
}
```
### 6.5 CaseRepository
```java
public interface CaseRepository extends JpaRepository<CaseEntity, UUID> {
    CaseEntity findByWorkflowInstanceId(UUID workflowInstanceId);
}
```
### 6.6 CaseHistoryRepository
```java
public interface CaseHistoryRepository extends JpaRepository<CaseHistory, UUID> {}
```
### 6.7 OutboxEventRepository
```java
public interface OutboxEventRepository extends JpaRepository<OutboxEvent, UUID> {

    @Query("""
        select e from OutboxEvent e
        where e.processed = false
        order by e.groupId asc, e.stepOrder asc, e.createdAt asc
    """)
    List<OutboxEvent> findUnprocessedOrdered();

    boolean existsByGroupIdAndStepOrderAndProcessedTrue(String groupId, int stepOrder);
}
```
# 7. Action Handler Framework
Action handlers encapsulate workflow‑specific business logic for each state/action combination.
## 7.1 WorkflowActionHandler Interface
```java
public interface WorkflowActionHandler {
    void handle(WorkflowInstance instance, JsonNode payload);
}
```
## 7.2 WorkflowActionRegistry
```java
@Service
public class WorkflowActionRegistry {

    private final Map<String, WorkflowActionHandler> handlers = new HashMap<>();

    public void register(String key, WorkflowActionHandler handler) {
        handlers.put(key, handler);
    }

    public WorkflowActionHandler resolve(String workflow, String state, String action) {
        return handlers.get(workflow + "." + state + "." + action);
    }
}
```
## 7.3 Auto‑Registration of Handlers
```java
@Configuration
public class WorkflowActionConfig {

    @Autowired
    public WorkflowActionConfig(List<WorkflowActionHandler> handlers,
                                WorkflowActionRegistry registry) {
        handlers.forEach(handler -> {
            Component annotation = handler.getClass().getAnnotation(Component.class);
            if (annotation != null) {
                registry.register(annotation.value(), handler);
            }
        });
    }
}
```
## 7.4 Example Handler (Stage 1 Approve)
```java
@Component("InsuredRegistration.STAGE1.APPROVE")
public class Stage1ApproveHandler implements WorkflowActionHandler {

    @Override
    public void handle(WorkflowInstance instance, JsonNode payload) {
        // Example: validate documents, enrich dataJson, etc.
        System.out.println("Stage1 APPROVE logic executed for instance " + instance.getId());
    }
}
```
# 8. Workflow Engine Core
This is the heart of the system:
- Start workflow
- Claim workflow instance
- Trigger transitions
- Execute action handlers
- Write case history
- Create ordered outbox events
## 8.1 WorkflowEngineService
```java
@Service
public class WorkflowEngineService {

    @Autowired WorkflowDefinitionRepository definitionRepo;
    @Autowired WorkflowStateDefinitionRepository stateRepo;
    @Autowired WorkflowTransitionDefinitionRepository transitionRepo;
    @Autowired WorkflowInstanceRepository instanceRepo;
    @Autowired CaseRepository caseRepo;
    @Autowired CaseHistoryRepository historyRepo;
    @Autowired OutboxEventRepository outboxRepo;
    @Autowired WorkflowActionRegistry actionRegistry;

    // ------------------------------------------------------------
    // START WORKFLOW
    // ------------------------------------------------------------

    @Transactional
    public UUID start(String workflowName, String businessKey, JsonNode data) {

        WorkflowDefinition def = definitionRepo
            .findFirstByNameAndActiveTrueOrderByVersionDesc(workflowName)
            .orElseThrow();

        WorkflowStateDefinition initial = stateRepo
            .findByWorkflowDefinitionId(def.getId())
            .stream()
            .filter(WorkflowStateDefinition::isInitialState)
            .findFirst()
            .orElseThrow();

        WorkflowInstance instance = new WorkflowInstance();
        instance.setId(UUID.randomUUID());
        instance.setWorkflowDefinition(def);
        instance.setDefinitionVersion(def.getVersion());
        instance.setBusinessKey(businessKey);
        instance.setCurrentState(initial);
        instance.setDataJson(data.toString());
        instance.setLocked(false);
        instance.setCreatedAt(Instant.now());
        instance.setUpdatedAt(Instant.now());

        instanceRepo.save(instance);

        CaseEntity c = new CaseEntity();
        c.setId(UUID.randomUUID());
        c.setCaseType(workflowName);
        c.setBusinessKey(businessKey);
        c.setCaseDataJson(data.toString());
        c.setWorkflowInstance(instance);
        c.setCreatedAt(Instant.now());
        c.setUpdatedAt(Instant.now());

        caseRepo.save(c);

        return instance.getId();
    }

    // ------------------------------------------------------------
    // CLAIM WORKFLOW INSTANCE
    // ------------------------------------------------------------

    @Transactional
    public void claim(UUID instanceId, String userId) {
        WorkflowInstance instance = instanceRepo.findById(instanceId).orElseThrow();

        if (instance.isLocked()) {
            throw new RuntimeException("Already claimed by " + instance.getAssignedToUser());
        }

        instance.setLocked(true);
        instance.setAssignedToUser(userId);
        instance.setAssignedAt(Instant.now());
        instance.setUpdatedAt(Instant.now());

        instanceRepo.save(instance);
    }

    // ------------------------------------------------------------
    // TRIGGER ACTION
    // ------------------------------------------------------------

    @Transactional
    public void trigger(UUID instanceId, String action, JsonNode payload, String userId) {

        WorkflowInstance instance = instanceRepo.findById(instanceId).orElseThrow();

        if (instance.isLocked() && !userId.equals(instance.getAssignedToUser())) {
            throw new RuntimeException("Case claimed by " + instance.getAssignedToUser());
        }

        WorkflowStateDefinition fromState = instance.getCurrentState();

        // Execute handler
        WorkflowActionHandler handler =
            actionRegistry.resolve(
                instance.getWorkflowDefinition().getName(),
                fromState.getKey(),
                action.toUpperCase()
            );

        if (handler != null) {
            handler.handle(instance, payload);
        }

        // Resolve transition
        WorkflowTransitionDefinition transition = transitionRepo
            .findByWorkflowDefinitionIdAndFromStateId(
                instance.getWorkflowDefinition().getId(),
                fromState.getId()
            )
            .stream()
            .filter(t -> t.getTriggerKey().equalsIgnoreCase(action))
            .findFirst()
            .orElseThrow(() -> new RuntimeException("No transition for action " + action));

        // Update state
        instance.setCurrentState(transition.getToState());
        instance.setLocked(false);
        instance.setAssignedToUser(null);
        instance.setAssignedAt(null);
        instance.setUpdatedAt(Instant.now());

        instanceRepo.save(instance);

        // Write case history
        CaseEntity c = caseRepo.findByWorkflowInstanceId(instance.getId());

        CaseHistory h = new CaseHistory();
        h.setId(UUID.randomUUID());
        h.setCaseEntity(c);
        h.setAction(action.toUpperCase());
        h.setFromState(fromState.getKey());
        h.setToState(transition.getToState().getKey());
        h.setPayloadJson(payload != null ? payload.toString() : null);
        h.setPerformedBy(userId);
        h.setPerformedAt(Instant.now());

        historyRepo.save(h);

        // Create ordered outbox events
        createOutboxSequenceForAction(instance, action, payload);
    }

    // ------------------------------------------------------------
    // QUEUE ACCESS
    // ------------------------------------------------------------

    public List<WorkflowInstance> getQueue(String queueName, String userId) {
        return instanceRepo.findQueueForUser(queueName, userId);
    }

    // ------------------------------------------------------------
    // OUTBOX SEQUENCE CREATION
    // ------------------------------------------------------------

    private void createOutboxSequenceForAction(
            WorkflowInstance instance,
            String action,
            JsonNode payload
    ) {
        String workflow = instance.getWorkflowDefinition().getName();
        String state = instance.getCurrentState().getKey();
        String groupId = workflow + ":" + instance.getId() + ":" + action.toUpperCase();

        // Example: STAGE3.APPROVE triggers 3 ordered events
        if ("MemberRegistration".equals(workflow)
                && "STAGE3".equals(state)
                && "APPROVE".equalsIgnoreCase(action)) {

            saveOutboxEvent(instance.getId(), groupId, 1, "CALL_KYC", payload);
            saveOutboxEvent(instance.getId(), groupId, 2, "GENERATE_PDF", payload);
            saveOutboxEvent(instance.getId(), groupId, 3, "SEND_EMAIL", payload);
        }
    }

    private void saveOutboxEvent(
            UUID instanceId,
            String groupId,
            int stepOrder,
            String eventType,
            JsonNode payload
    ) {
        OutboxEvent e = new OutboxEvent();
        e.setId(UUID.randomUUID());
        e.setWorkflowInstanceId(instanceId);
        e.setGroupId(groupId);
        e.setStepOrder(stepOrder);
        e.setEventType(eventType);
        e.setPayloadJson(payload != null ? payload.toString() : null);
        e.setProcessed(false);
        e.setCreatedAt(Instant.now());
        outboxRepo.save(e);
    }
}
```
# 9. Outbox Pattern (Ordered, Retry‑Safe Side Effects)

Side effects (emails, PDFs, API calls, notifications) must **never** run inside the main workflow transaction.

Instead, the engine uses an **OutboxEvent** table with:

- **groupId** → identifies a sequence of events  
- **stepOrder** → ensures strict ordering  
- **processed** flag → ensures retry safety  
- **idempotency** → ensures no duplicates  

This pattern guarantees:

- No partial workflow updates  
- No lost side effects  
- No duplicate side effects  
- Crash‑safe execution  
- Retry‑safe execution  

---

# 10. Outbox Event Ordering

Events are created in the workflow engine like this:
Group: MemberRegistration:<instanceId>:APPROVE
1 → CALL_KYC
2 → GENERATE_PDF
3 → SEND_EMAIL


The worker executes them **in order**, only moving to the next step when the previous one is marked processed.

---

# 11. Outbox Worker (Core Logic)

The worker runs periodically (e.g., every 5 seconds) and processes unprocessed events in order.

```java
@Service
public class OutboxWorker {

    @Autowired OutboxEventRepository outboxRepo;
    @Autowired SideEffectService sideEffectService;

    @Scheduled(fixedDelay = 5000)
    public void processOutbox() {

        List<OutboxEvent> events = outboxRepo.findUnprocessedOrdered();

        for (OutboxEvent e : events) {

            // Ensure ordering
            if (!canRun(e)) {
                continue;
            }

            try {
                sideEffectService.handle(e);

                e.setProcessed(true);
                e.setProcessedAt(Instant.now());
                outboxRepo.save(e);

            } catch (Exception ex) {
                // Leave unprocessed → worker will retry later
                // Log error (omitted for brevity)
            }
        }
    }

    private boolean canRun(OutboxEvent e) {
        if (e.getStepOrder() == 1) return true;

        return outboxRepo.existsByGroupIdAndStepOrderAndProcessedTrue(
            e.getGroupId(),
            e.getStepOrder() - 1
        );
    }
}
```
# 12. SideEffectService (Idempotent Execution)
Each event type is handled here.
Every method must be idempotent — meaning running it twice produces the same result.
```java
@Service
public class SideEffectService {

    public void handle(OutboxEvent e) {

        switch (e.getEventType()) {
            case "CALL_KYC" -> callKyc(e);
            case "GENERATE_PDF" -> generatePdf(e);
            case "SEND_EMAIL" -> sendEmail(e);
            default -> throw new IllegalArgumentException("Unknown eventType " + e.getEventType());
        }
    }

    private void callKyc(OutboxEvent e) {
        // Use e.getId() or (groupId + stepOrder) as idempotency key
        System.out.println("Calling KYC for workflow instance " + e.getWorkflowInstanceId());
    }

    private void generatePdf(OutboxEvent e) {
        System.out.println("Generating PDF for workflow instance " + e.getWorkflowInstanceId());
    }

    private void sendEmail(OutboxEvent e) {
        System.out.println("Sending email for workflow instance " + e.getWorkflowInstanceId());
    }
}
```
# 13. Retry Logic
Retry is automatic:
- If a side effect fails → event stays processed = false
- Worker picks it up again next cycle
- Ordering ensures next steps never run prematurely

This gives you:
- At‑least‑once execution
- No duplicates (because handlers are idempotent)
- Guaranteed ordering
- Crash‑safe recovery

# 14. REST Controller Layer

The controller exposes workflow operations to the outside world.

---

## 14.1 WorkflowController

```java
@RestController
@RequestMapping("/workflows")
public class WorkflowController {

    @Autowired WorkflowEngineService engine;

    // ------------------------------------------------------------
    // START WORKFLOW
    // ------------------------------------------------------------
    @PostMapping("/{name}/start")
    public UUID start(
        @PathVariable String name,
        @RequestParam String businessKey,
        @RequestBody JsonNode data
    ) {
        return engine.start(name, businessKey, data);
    }

    // ------------------------------------------------------------
    // CLAIM
    // ------------------------------------------------------------
    @PostMapping("/{id}/claim")
    public void claim(
        @PathVariable UUID id,
        @RequestParam String user
    ) {
        engine.claim(id, user);
    }

    // ------------------------------------------------------------
    // TRIGGER ACTION
    // ------------------------------------------------------------
    @PostMapping("/{id}/trigger/{action}")
    public void trigger(
        @PathVariable UUID id,
        @PathVariable String action,
        @RequestParam String user,
        @RequestBody(required = false) JsonNode payload
    ) {
        engine.trigger(id, action, payload, user);
    }

    // ------------------------------------------------------------
    // QUEUE ACCESS
    // ------------------------------------------------------------
    @GetMapping("/queues/{queueName}")
    public List<WorkflowInstance> queue(
        @PathVariable String queueName,
        @RequestParam String user
    ) {
        return engine.getQueue(queueName, user);
    }
}
```
# 15. Insured Registration Workflow (Example)
This workflow has:
- STAGE1 → Human queue
- STAGE2 → Human queue
- STAGE3 → Human queue
- APPROVED → Final
- REJECTED → Final

Transitions:

| From   | Trigger | To        |
|--------|--------|-----------|
| STAGE1 | APPROVE | STAGE2   |
| STAGE1 | REJECT  | REJECTED |
| STAGE1 | RETURN  | STAGE1   |
| STAGE2 | APPROVE | STAGE3   |
| STAGE2 | REJECT  | REJECTED |
| STAGE2 | RETURN  | STAGE1   |
| STAGE3 | APPROVE | APPROVED |
| STAGE3 | REJECT  | REJECTED |
| STAGE3 | RETURN  | STAGE2   |

# 16. SQL Seed Script (Complete)

```SQL
-- ------------------------------------------------------------
-- WORKFLOW DEFINITION
-- ------------------------------------------------------------
INSERT INTO workflow_definition (id, name, version, active)
VALUES ('00000000-0000-0000-0000-000000000001', 'MemberRegistration', 1, true);

-- ------------------------------------------------------------
-- STATES
-- ------------------------------------------------------------
INSERT INTO workflow_state_definition (id, workflow_definition_id, key, initial_state, final_state, type, queue_name)
VALUES
('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'STAGE1', true,  false, 'HUMAN', 'STAGE1_QUEUE'),
('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'STAGE2', false, false, 'HUMAN', 'STAGE2_QUEUE'),
('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', 'STAGE3', false, false, 'HUMAN', 'STAGE3_QUEUE'),
('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000001', 'APPROVED', false, true, 'SYSTEM', null),
('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000001', 'REJECTED', false, true, 'SYSTEM', null);

-- ------------------------------------------------------------
-- TRANSITIONS
-- ------------------------------------------------------------

-- STAGE1 transitions
INSERT INTO workflow_transition_definition VALUES
('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001',
 '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000102', 'APPROVE'),
('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000001',
 '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000105', 'REJECT'),
('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000001',
 '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000101', 'RETURN');

-- STAGE2 transitions
INSERT INTO workflow_transition_definition VALUES
('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000001',
 '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000103', 'APPROVE'),
('00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000001',
 '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000105', 'REJECT'),
('00000000-0000-0000-0000-000000000206', '00000000-0000-0000-0000-000000000001',
 '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000101', 'RETURN');

-- STAGE3 transitions
INSERT INTO workflow_transition_definition VALUES
('00000000-0000-0000-0000-000000000207', '00000000-0000-0000-0000-000000000001',
 '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000104', 'APPROVE'),
('00000000-0000-0000-0000-000000000208', '00000000-0000-0000-0000-000000000001',
 '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000105', 'REJECT'),
('00000000-0000-0000-0000-000000000209', '00000000-0000-0000-0000-000000000001',
 '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000102', 'RETURN');
 ```

# 17. End‑to‑end sequence flows

## 17.1 Happy path – Insured Registration

1. Client calls `POST /workflows/InsuredRegistration/start`
2. Engine:
   - Loads latest active `WorkflowDefinition`
   - Finds initial state (`STAGE1`)
   - Creates `WorkflowInstance` + `CaseEntity`
3. User opens `STAGE1_QUEUE` via `GET /workflows/queues/STAGE1_QUEUE`
4. User claims case via `POST /workflows/{id}/claim?user=U1`
5. User approves via `POST /workflows/{id}/trigger/APPROVE?user=U1`
   - Engine:
     - Resolves transition STAGE1 → STAGE2
     - Executes handler `InsuredRegistration.STAGE1.APPROVE`
     - Updates instance state
     - Writes `CaseHistory`
6. Same pattern for STAGE2 → STAGE3
7. At STAGE3.APPROVE:
   - Engine transitions STAGE3 → APPROVED
   - Creates ordered outbox events:
     - step 1: `CALL_KYC`
     - step 2: `GENERATE_PDF`
     - step 3: `SEND_EMAIL`
8. Outbox worker:
   - Picks events in order
   - Executes side effects via `SideEffectService`
   - Marks each event `processed = true`

---

# 18. Error handling model

## 18.1 Errors in workflow engine (synchronous)

- Validation errors, missing transitions, wrong user, etc.
- Handled inside `trigger` transaction.
- If an exception is thrown:
  - DB transaction is rolled back
  - No state change
  - No outbox events created
- Client receives HTTP 4xx/5xx.

## 18.2 Errors in side effects (asynchronous)

- Occur in `OutboxWorker` / `SideEffectService`.
- On exception:
  - Event remains `processed = false`
  - No state change in workflow
  - Worker will retry on next cycle
- Ordering is preserved because next `stepOrder` never runs until previous is processed.

---

# 19. Retry strategy

- **Trigger side**: rely on DB transaction rollback; client can retry the action.
- **Outbox side**:
  - Worker runs periodically (e.g., every 5s).
  - Each event is retried until success.
  - Optional: add `retryCount`, `lastError`, `nextAttemptAt` to `OutboxEvent` if you want backoff or dead‑lettering.

Example extension:

```java
// in OutboxEvent
private int retryCount;
private String lastError;
private Instant nextAttemptAt;
```

# 20 DataJson Lifecycle, Conditional Transitions & Condition Evaluator

`dataJson` is the workflow instance’s **memory**.  
It stores all information needed for:

- Conditional transitions  
- Business rules  
- External API results  
- User decisions  
- Previous state tracking  
- Routing logic  
- Outbox event payloads  

This section explains how `dataJson` is created, updated, and used.

---

# 20.1 When dataJson is created

`dataJson` is first set when the workflow starts:

```java
instance.setDataJson(data.toString());
```
Whatever JSON the client sends during start() becomes the initial workflow memory.
```java
Example:
{
  "memberId": "M123",
  "kycStatus": "PENDING",
  "fraudScore": 0
}
```
## 20.2 Updating dataJson during workflow execution
Action handlers update dataJson inside the same transaction as the state transition.

Example:
```java
@Component("InsuredRegistration.STAGE1.APPROVE")
public class Stage1ApproveHandler implements WorkflowActionHandler {

    @Override
    public void handle(WorkflowInstance instance, JsonNode payload) {

        ObjectMapper mapper = new ObjectMapper();
        ObjectNode data = (ObjectNode) mapper.readTree(instance.getDataJson());

        // Update workflow memory
        data.put("kycStatus", payload.get("kycStatus").asText());
        data.put("lastStage", "STAGE1");
        data.put("approvedBy", payload.get("userId").asText());

        instance.setDataJson(data.toString());
    }
}
```
## 20.3 Conditional transitions
A single trigger (e.g., APPROVE) may lead to multiple possible next states depending on conditions.

Example:

From	Trigger	Condition	To
STAGE1	APPROVE	#payload.kycStatus == 'OK'	STAGE2
STAGE1	APPROVE	#payload.kycStatus == 'FAILED'	KYC_REVIEW
STAGE1	APPROVE	#instance.dataJson.fraudScore > 80	FRAUD

This is stored in WorkflowTransitionDefinition.conditionExpression

## 20.4 ConditionEvaluator
A flexible evaluator allows conditions to reference:
- #instance → workflow instance
- #payload → trigger payload
- #history → case history
- #prevState → previous state
- #currentState → current state

Example implementation:
```java
@Service
public class ConditionEvaluator {

    private final ExpressionParser parser = new SpelExpressionParser();

    public boolean evaluate(
            String expression,
            WorkflowInstance instance,
            JsonNode payload,
            WorkflowStateDefinition fromState,
            List<CaseHistory> history
    ) {
        if (expression == null || expression.isBlank()) return true;

        StandardEvaluationContext ctx = new StandardEvaluationContext();
        ctx.setVariable("instance", instance);
        ctx.setVariable("payload", payload);
        ctx.setVariable("history", history);
        ctx.setVariable("prevState", fromState.getKey());
        ctx.setVariable("currentState", instance.getCurrentState().getKey());

        return Boolean.TRUE.equals(
            parser.parseExpression(expression).getValue(ctx, Boolean.class)
        );
    }
}
```
## 20.5 Engine logic for conditional transitions
Replace the simple transition lookup with conditional evaluation:
```java
List<WorkflowTransitionDefinition> candidates =
    transitionRepo.findByWorkflowDefinitionIdAndFromStateId(
        instance.getWorkflowDefinition().getId(),
        fromState.getId()
    )
    .stream()
    .filter(t -> t.getTriggerKey().equalsIgnoreCase(action))
    .toList();

List<CaseHistory> history =
    historyRepo.findByCaseEntityId(caseRepo.findByWorkflowInstanceId(instance.getId()).getId());

WorkflowTransitionDefinition transition = candidates.stream()
    .filter(t -> conditionEvaluator.evaluate(
        t.getConditionExpression(),
        instance,
        payload,
        fromState,
        history
    ))
    .findFirst()
    .orElseThrow(() -> new RuntimeException("No matching conditional transition"));
```
## 20.6 Examples of condition expressions
based on payload
```java
#payload.kycStatus == 'OK'
```
Based on instance memory
```java
#instance.dataJson.fraudScore > 80
```
Based on previous state
```java
#prevState == 'STAGE1'
```
Based on case history
```java
#history.?[action == 'RETURN'].size() >= 2
```
Combined
```java
#payload.kycStatus == 'FAILED' and #instance.dataJson.fraudScore > 50
```

## 20.7 UPDATED WORKFLOW ENGINE — CONDITIONAL TRANSITION LOGIC
// ------------------------------------------------------------
// TRIGGER ACTION (with conditional transitions)
// ------------------------------------------------------------
@Transactional
public void trigger(UUID instanceId, String action, JsonNode payload, String userId) {

    WorkflowInstance instance = instanceRepo.findById(instanceId).orElseThrow();

    // Enforce claiming rules
    if (instance.isLocked() && !userId.equals(instance.getAssignedToUser())) {
        throw new RuntimeException("Case claimed by " + instance.getAssignedToUser());
    }

    WorkflowStateDefinition fromState = instance.getCurrentState();

    // ------------------------------------------------------------
    // 1. Execute action handler (may update dataJson)
    // ------------------------------------------------------------
    WorkflowActionHandler handler =
        actionRegistry.resolve(
            instance.getWorkflowDefinition().getName(),
            fromState.getKey(),
            action.toUpperCase()
        );

    if (handler != null) {
        handler.handle(instance, payload);
    }

    // ------------------------------------------------------------
    // 2. Resolve conditional transition
    // ------------------------------------------------------------
    List<WorkflowTransitionDefinition> candidates =
        transitionRepo.findByWorkflowDefinitionIdAndFromStateId(
            instance.getWorkflowDefinition().getId(),
            fromState.getId()
        )
        .stream()
        .filter(t -> t.getTriggerKey().equalsIgnoreCase(action))
        .toList();

    // Load case history for condition evaluation context
    CaseEntity caseEntity = caseRepo.findByWorkflowInstanceId(instance.getId());
    List<CaseHistory> history = historyRepo.findByCaseEntityId(caseEntity.getId());

    WorkflowTransitionDefinition transition = candidates.stream()
        .filter(t -> conditionEvaluator.evaluate(
            t.getConditionExpression(),
            instance,
            payload,
            fromState,
            history
        ))
        .findFirst()
        .orElseThrow(() -> new RuntimeException(
            "No matching conditional transition for action " + action
        ));

    // ------------------------------------------------------------
    // 3. Update workflow instance state
    // ------------------------------------------------------------
    instance.setCurrentState(transition.getToState());
    instance.setLocked(false);
    instance.setAssignedToUser(null);
    instance.setAssignedAt(null);
    instance.setUpdatedAt(Instant.now());

    // Store previous state in dataJson for future conditions
    try {
        ObjectMapper mapper = new ObjectMapper();
        ObjectNode data = (ObjectNode) mapper.readTree(instance.getDataJson());
        data.put("previousState", fromState.getKey());
        instance.setDataJson(data.toString());
    } catch (Exception ex) {
        throw new RuntimeException("Failed to update dataJson with previousState", ex);
    }

    instanceRepo.save(instance);

    // ------------------------------------------------------------
    // 4. Write case history
    // ------------------------------------------------------------
    CaseHistory h = new CaseHistory();
    h.setId(UUID.randomUUID());
    h.setCaseEntity(caseEntity);
    h.setAction(action.toUpperCase());
    h.setFromState(fromState.getKey());
    h.setToState(transition.getToState().getKey());
    h.setPayloadJson(payload != null ? payload.toString() : null);
    h.setPerformedBy(userId);
    h.setPerformedAt(Instant.now());

    historyRepo.save(h);

    // ------------------------------------------------------------
    // 5. Create ordered outbox events (if any)
    // ------------------------------------------------------------
    createOutboxSequenceForAction(instance, action, payload);
}
```
