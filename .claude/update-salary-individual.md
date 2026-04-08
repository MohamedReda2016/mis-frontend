# Functional Requirements: Update Individual Salary
## Feature: Salary Update Form — Per Insured, Employer-Config-Driven

## 1. Overview

The **Update Individual Salary** screen allows Business Admin 1 to record a salary change
for a specific insured employee. The form is employer-config-driven — only **active salary
percentage** (from the employer's Salary Component Configuration) are shown as editable
inputs. The **Contributable Salary** is recalculated live using the employer's configured
percentage per component.

Every salary update is **immutable and append-only** — the system adds a new salary record
with an effective date; it does not overwrite the previous record. This preserves the full
salary timeline for audit and contribution recalculation purposes.

---

## 2. Access & Navigation

| Attribute | Detail |
|---|---|
| **Trigger A** | Click **[Update Salary]** quick-action button on the Insured Profile screen |
| **Trigger B** | Select **"Update Salary"** from the ⋮ actions menu on the Manage Insureds list |
| **Route** | `/insureds/{insuredId}/update-salary` |
| **Back navigation** | `←` back arrow → returns to Insured Profile |
| **Role** | Business Admin 1 (MAKER) only |
| **Scope** | Scoped to the currently selected employer |

---

## 3. Page Header

| Element | Detail |
|---|---|
| Title | "Update Salary" |
| Subtitle | "Record a salary change for [Member ID]" |
| Back arrow | Top-left `←` → Insured Profile; prompts unsaved changes warning if form is dirty |

---

## 4. Current Salary Summary (Read-Only Card — Top of Form)

Before the editable fields, display a **read-only card** showing the insured's current salary
so the admin has full context before making a change:

```
┌──────────────────────────────────────────────────────────────┐
│  Current Salary                         Effective: 01/01/2024│
│                                                              │
│  Basic Salary:              AED  5,000.00                    │
│  Children Allowance:        AED  1,000.00                    │
│  Complementary Allowance:   AED    500.00                    │
│  Other Allowance:           AED    200.00                    │
│  ──────────────────────────────────────────────────────      │
│  Contributable Salary:      AED  6,000.00                    │
└──────────────────────────────────────────────────────────────┘
```

| Attribute | Detail |
|---|---|
| Shows | Only active salary components per employer config |
| Contributable Salary | Calculated using employer's component percentages |
| Effective Date | Date the current salary became effective |
| Styling | Light grey/neutral card, read-only — visually distinct from the editable section below |

---

## 5. Form — New Salary Details

### 5.1 Section Title

**"New Salary Details"** (with a mat-divider below the section header)

---

### 5.2 Field: Effective Date \*

| Attribute | Detail |
|---|---|
| Label | **Effective Date \*** (required) |
| Type | Date picker (mat-datepicker) |
| Format | DD/MM/YYYY |
| Default | Empty — admin must explicitly select |
| Validation | Must be ≥ the insured's Employment Joining Date |
| Validation | Must not overlap with an existing salary record effective date (exact date duplicate) |
| Validation | Cannot be set to a date in a **locked / already-processed proforma period** (if the employer has an approved proforma for that month, block updates to dates within that period — show warning) |
| Hint below | "The new salary will take effect from this date and will be used in contribution calculations from this period onwards." |

---

### 5.3 Salary Component Fields

Rendered **dynamically** based on the employer's **Salary Component Configuration**.

### 5.4 Contributable Salary Breakdown Card (Live-Updating, Read-Only)

Displayed **below the salary input fields**, updates in real-time as admin types:

```
┌──────────────────────────────────────────────────────────────┐
│  New Contributable Salary Breakdown                          │
│                                                              │
│  Basic Salary            AED 5,500.00  × 100%  = AED 5,500.00│
│  Children Allowance      AED 1,000.00  ×  75%  = AED   750.00│
│  Complementary Allow.    AED   500.00  ×  50%  = AED   250.00│
│  Other Allowance         AED   200.00  ×   0%  = AED     0.00│
│  ──────────────────────────────────────────────────────      │
│  New Contributable Salary                   AED 6,500.00     │
│                                                              │
│  Previous Contributable Salary              AED 6,000.00     │
│  Change:                               ▲ AED    500.00 (+8%) │
└──────────────────────────────────────────────────────────────┘
```

| Element | Detail |
|---|---|
| Per-component row | `[Label]   AED [new value]  ×  [config%]%  =  AED [calculated]` |
| Total row (bold) | `New Contributable Salary: AED [sum]` |
| Previous salary row | Shows the current contributable salary for comparison |
| Change row | Shows difference: `▲ AED [diff] (+X%)` in green if increase; `▼ AED [diff] (-X%)` in red if decrease; hidden if no change |
| % values | Read-only — from employer salary component config; not editable here |
| Inactive components | Not shown in breakdown |



### 5.6 Field: Notes / Remarks (mandatory)

| Attribute | Detail                                                              |
|---|---------------------------------------------------------------------|
| Label | **Notes / Remarks**                                                 |
| Type | Textarea                                                            |
| Required | Mandatory                                                           |
| Placeholder | "Add any additional context or remarks about this salary change..." |
| Max length | 500 characters                                                      |
| Character counter | Show `X / 500` below field                                          |

---

### 5.7 Field: Supporting Document (mandatory)

| Attribute | Detail                                                                           |
|---|----------------------------------------------------------------------------------|
| Label | **Supporting Document**                                                          |
| Type | File upload zone                                                                 |
| Required | Mandatory                                                                        |
| Accepted formats | PDF, DOC, DOCX, JPG, PNG ,MSG                                                    |
| Max size | 10MB                                                                             |
| Multiple files | Yes                                                                              |
| Hint | "Upload any supporting documents (e.g., HR approval letter, salary certificate)" |
| File list | Uploaded files shown with name + size + [✕ Remove] per file                      |

---

## 6. Form Action Buttons

| Button | Style | Position | Behavior |
|---|---|---|---|
| **[Cancel]** | White / outlined | Bottom-left or bottom-right | Navigate back to Insured Profile; show "Discard changes?" confirm if form is dirty |
| **[Save Salary Update]** | Blue primary (mat-raised-button) | Bottom-right | Validate → submit → loading spinner on button |

---

## 7. Validation Rules

| Field | Rule | Error Message |
|---|---|---|
| Effective Date | Required | "Effective date is required." |
| Effective Date | Must be ≥ joining date | "Effective date cannot be before the insured's joining date ([joining date])." |
| Effective Date | No duplicate date on existing record | "A salary record already exists for this effective date. Please choose a different date." |
| Effective Date | Cannot be in a locked proforma period | "The selected period has an approved proforma. Salary updates for this period are not allowed. Please contact the System Admin." |
| Basic Salary | Required, > 0 | "Basic salary is required and must be greater than 0." |
| Other active components | Non-negative | "[Component name] cannot be negative." |
| All unchanged | If all salary values are identical to current | Show inline warning (non-blocking): "The new salary values are the same as the current salary. Are you sure you want to save?" |
| File type | PDF/DOC/DOCX/JPG/PNG only | "File type not supported." |
| File size | ≤ 10MB per file | "File [name] exceeds the 10MB limit." |

---

## 8. Submission Flow

1. Admin reviews current salary card at top for context
2. Admin sets Effective Date, adjusts salary fields (pre-filled with current values),  adds notes/document
3. Admin clicks **[Save Salary Update]**
4. Client-side validation runs:
  - All required fields filled
  - Effective date valid (not before join date, not duplicate, not locked period)
  - Basic Salary > 0
  - No negative values
5. If any validation fails: show inline errors; scroll to first error; do not submit
6. If all-same-values warning: show warning dialog — "Save identical salary?" [Cancel] [Confirm]
7. On submit:
  - Button enters loading state
  - `POST /api/v1/insureds/{insuredId}/salary-updates` with payload (see Section 9)
8. On success:
  - Show success snackbar: `"Salary updated successfully for [Member ID]. Effective from [Date]."`
  - Navigate back to Insured Profile → Salary History tab (auto-open the Salary History tab on return)
  - New salary record appears at the top of the Salary History table
9. On error — HTTP 409 (duplicate date): inline error on Effective Date field
10. On error — HTTP 422 (locked period): inline error with explanation on Effective Date
11. On other error: error snackbar with API message


like insured registration case flow, update salary as well should follow his follow of approval -
after submission , system should create a case of type update-salary-individual and goes to admin2 for approval
admin2 can return the case to admin1 or approve it - in case it's approved the update salary become committed before that it's in review as usual

## 10. Salary History — Display After Update

After a successful salary update, when the admin is returned to the Insured Profile
(Salary History tab), the new record appears at the **top** of the history table:

| Effective Date | Basic Salary | Children Allow. | Complementary | Other | Contributable | Updated By | Updated On | Source |
|---|---|---|---|---|---|---|---|---|
| **01/07/2024** | **AED 5,500** | **AED 1,000** | **AED 500** | **AED 200** | **AED 6,500** | Admin1-UserX | 15/03/2026 | Manual Update |
| 01/01/2024 | AED 5,000 | AED 1,000 | AED 500 | AED 200 | AED 6,000 | Admin1-UserX | 01/01/2024 | Registration |

The newest record is the **current salary** and is highlighted.

---

## 11. Proforma Impact Note (Informational Banner)

If the effective date falls within a **past period that already has a DRAFT proforma**,
show an informational amber banner on the form (non-blocking):

```
⚠️ The selected effective date falls within a period that has a Draft proforma 
(September 2025). The proforma will be recalculated to reflect this salary change 
the next time it is regenerated.
```

If the effective date falls within a period with an **already-approved proforma**, show
a **blocking red error** on the Effective Date field (see Validation Rules above).
