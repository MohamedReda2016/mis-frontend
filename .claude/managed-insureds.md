The **Manage Insureds** tab is the central hub for viewing and registering insured employees 
under the currently selected employer. It contains a searchable/filterable list of all 
insureds and provides entry points for individual registration

The **Register New Insured** form adapts dynamically based on three employer-level configurations:
1. **Member ID Configuration** — determines how the Member ID field is populated
2. **Salary Component Configuration** — determines which salary components contribute to Contributable Salary and at what percentage
3. **Insured Personal Details Configuration** — determines which name fields appear and which are mandatory

---

## 2. NEW — Employer-Level Config: Salary Components

### 2.1 Overview

Contributable Salary is **not a simple sum** of all salary fields. It is calculated based on 
the **active salary components** configured per employer, each with its own inclusion 
**percentage (0%–100%)**.

This configuration lives in Employer level

### 2.4 Contributable Salary Formula

```
Contributable Salary = 
  Σ ( component_value × contributable_percentage / 100 )
  for each component where is_active = true

Example config: Basic 100% | Children 75% | Complementary 50% | Other 0%
Example input:  Basic 5,000 | Children 1,000 | Complementary 500 | Other 200

Calculation:
  Basic Salary:             5,000.00 × 100% = 5,000.00
  Children Allowance:       1,000.00 ×  75% =   750.00
  Complementary Allowance:    500.00 ×  50% =   250.00
  Other Allowance:            200.00 ×   0% =     0.00
  ─────────────────────────────────────────────────────
  Contributable Salary:                       6,000.00 AED
```

**Applied at:**
- Registration form (live preview as admin types)
- Salary update (recalculates and stores new contributable salary)
- Monthly proforma generation (uses contributable salary at period cut-off)

**Server-side:** Backend must independently recalculate and validate `contributableSalary` from stored config — never trust client-submitted value.

---

## 3. NEW — Employer-Level Config: Insured Personal Details

### 3.1 Overview

The System Admin configures which **name fields** appear on the registration form per employer and whether each is **mandatory or optional**. This lives in **Employer Settings → Insured Personal Details Configuration**.

### 3.2 Screen: Insured Personal Details Configuration

**Access:** Scoped per employer  
**Section Title:** "Insured Personal Details Configuration"  
**Subtitle:** "Configure which personal name fields are required during insured registration"

**All 6 name fields are always rendered on the registration form.** The checkbox controls only whether the field is **mandatory** (required) or **optional**:

- ✅ **Checkbox checked** → field is **mandatory** in the registration form (shown with `*`, `Validators.required` applied)
- ☐ **Checkbox unchecked** → field is **optional** in the registration form (shown without `*`, no required validator)

**Configuration Table:**

| # | Checkbox | Field Key | Config Label | Form Label | Form Sub-group |
|---|---|---|---|---|---|
| 1 | ✅/☐ | `first_name_ar` | First Name (Arabic) | الاسم الأول | Arabic Name |
| 2 | ✅/☐ | `middle_name_ar` | Middle Name (Arabic) | الاسم الأوسط | Arabic Name |
| 3 | ✅/☐ | `last_name_ar` | Last Name (Arabic) | اسم العائلة | Arabic Name |
| 4 | ✅/☐ | `first_name_en` | First Name (English) | First Name | English Name |
| 5 | ✅/☐ | `middle_name_en` | Middle Name (English) | Middle Name | English Name |
| 6 | ✅/☐ | `last_name_en` | Last Name (English) | Last Name | English Name |

hide field key from table
**Legend below table:**
> ✅ Checked = Field is **mandatory** in registration | ☐ Unchecked = Field is **optional** in registration

**Save:** "Save Personal Details Configuration" → confirmation modal → PUT /api/v1/employers/{id}/insured-field-config  
**Success snackbar:** "Personal details configuration saved successfully."

---

### 3.3 Data Model: employer_insured_field_config

| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | |
| employer_id | UUID (FK → employers) | |
| field_key | ENUM: `first_name_ar` / `middle_name_ar` / `last_name_ar` / `first_name_en` / `middle_name_en` / `last_name_en` | |
| is_mandatory | boolean | true = required in registration form |
| updated_at | timestamp | |
| updated_by_user_id | UUID (FK → users) | |

**UQ:** `(employer_id, field_key)`

## 4. Screen: Manage Insureds (List View)

### 4.1 Page Header
| Element | Detail |
|---|---|
| Page Title | "Manage Insureds" |
| Top-right buttons | **[Bulk Salary Update]** (outlined) + **[Register New Insured]** (blue primary) |

### 4.2 Search & Filter Bar

Labeled **"Search & Filter"** (with search icon)

| Filter | Type | Placeholder | Behavior |
|---|---|---|---|
| Member ID | Text input | "e.g., MOD00001" | Partial match, case-insensitive |
| Contributable Salary | Number input | "e.g., 5000" | Filter by value (= or ≥) |
| Status | Dropdown | "All" | All / Active / Inactive |
| [Clear All Filters] | Button | — | Resets all to default |

Below: **"Showing X of Y employees"** (dynamic)

### 4.3 Insureds Table

| Column | Description | Notes |
|---|---|---|
| **Member ID** | Unique identifier | Blue clickable link; format driven by employer's Member ID strategy |
| **Join Date** | Employment hire date | DD/MM/YYYY |
| **End Date** | Termination date | `—` if still active |
| **Contributable Salary** | Calculated using active component percentages | `AED X,XXX.XX` |
| **Status** | Employment status | Active = green pill; Inactive = grey plain text |
| **Actions** | ⋮ context menu | Active only; Inactive = "No actions available" |

**Active ⋮ menu:** View Profile | Update Salary | Record End of Service  
**Inactive:** Static text "No actions available" (greyed, non-interactive)

**Member ID format in list:**

| Strategy | Format | Example |
|---|---|---|
| `MANUAL_PREFIX` | `[employerCode][suffix]` | `MOD00001` |
| `EMIRATES_ID` | 15-digit numeric, no hyphens | `784199512345678` |

---

## 5. Screen: Register New Insured (Full Form)

### Trigger
Admin clicks **[Register New Insured]** → full-page form (not a modal)

### Form Header
- Title: "Register New Insured"
- Subtitle: "Please fill in the employee insurance details"
- `←` back arrow (top-right) → back to list; show "Discard changes?" confirm if form dirty

### Form Load Sequence

On init, load **three** configs in parallel before rendering the form:

```
1. getMemberIdConfig(employerId)        → drives Employee ID field
2. getSalaryComponents(employerId)      → drives salary section + contributable formula
3. getInsuredFieldConfig(employerId)    → drives name fields mandatory status
```

Show a centered loading spinner until all three resolve.

---

### SECTION A — General Details

**2-column grid where applicable**

#### Employee ID (Member ID) — Strategy-Driven

| Strategy | Behavior |
|---|---|
| `MANUAL_PREFIX` | Static grey prefix badge `[employerCode]` + editable numeric input. Format hint: "Format: MOD XXXXX (e.g., MOD00001)". Numeric only, min 4 / max 10 digits. Blur → uniqueness check. |
| `EMIRATES_ID` | Single read-only field, auto-populated from Emirates ID (hyphens stripped). Read-only styling. Placeholder: "Auto-generated from Emirates ID". |
| Not configured | Disabled field + amber inline warning: "Member ID configuration not set. Contact System Admin." Submit button disabled. |

#### Date of Birth \*
- Date picker | MM/DD/YYYY | Must be past | Age 18–50

#### Employment Joining Date \*
- Date picker | MM/DD/YYYY | After DOB | Not more than current day

**Validation messages:**
- English required: `"[Field Label] is required."`
- Arabic required: `"هذا الحقل مطلوب."` (or bilingual)
- Arabic format: `"Please enter Arabic characters only."`

---

### SECTION C — Salary Details

**Section title:** "Salary Details"

All fields: `AED` prefix (matPrefix) | two decimal places | non-negative

#### Contributable Salary Breakdown Card (live-updating, read-only)

Displayed below the salary inputs. Updates in real-time as admin types.
┌──────────────────────────────────────────────────────────────┐
│  Contributable Salary Breakdown                              │
│                                                              │
│  Basic Salary            AED 5,000.00  × 100%  = AED 5,000.00│
│  Children Allowance      AED 1,000.00  ×  75%  = AED   750.00│
│  Complementary Allow.    AED   500.00  ×  50%  = AED   250.00│
│  Other Allowance         AED   200.00  ×   0%  = AED     0.00│
│  ──────────────────────────────────────────────────────      │
│  Total Contributable Salary                   AED 6,000.00   │
└──────────────────────────────────────────────────────────────┘
```

**Breakdown rows:** `[Component Label]   AED [entered value]  ×  [config%]%  =  AED [result]`  
**Total row:** Bold, highlighted — "Total Contributable Salary: AED X,XXX.XX"  
**The % values** are read-only, pulled from employer config, not editable by admin in this form.  
**Zero-contribution components** (% = 0) still show in breakdown as `= AED 0.00` for full transparency.  


---

### SECTION D — Attachments \*

- **Dashed-border upload zone** — red/pink dashed border when empty (required state)
- Text: **"Click to upload"** (blue link) `or drag and drop`
- Accepted formats: `PDF, DOC, DOCX, XLS, XLSX, MSG, JPG, PNG`
- Max size: `Max 10MB` per file
- Required note: ⚠️ `"At least one document is required (e.g., employment contract, ID copy)"`
- Multiple files: show file list — name + size + type icon + [✕ Remove] per file
- Border changes to normal grey after first file uploaded successfully

---

### Form Action Buttons

| Button | Style | Behavior |
|---|---|---|
| **[Cancel]** | White/outlined | Back to list; "Discard changes?" confirm if form dirty |
| **[Submit]** | Blue primary | Validate all → POST → loading spinner on button |

### Submission Flow

1. Validate all fields (including dynamic required name fields and active salary components)
2. If invalid: show inline errors; scroll to first error; do not submit
3. If valid: loading spinner on Submit button
4. POST `/api/v1/employers/{employerId}/insureds`
5. Success → snackbar: `"Insured [MemberID] registered successfully."` → navigate to list
6. HTTP 409 duplicate → inline error on Employee ID: `"This Member ID is already registered."`
7. HTTP 400/422 → error snackbar with API message

---


## 7. Full Validation Rules

| Field | Rule | Error Message |
|---|---|---|
| Employee ID (Manual) | Required; numeric suffix; within min/max length | "Employee ID is required and must be numeric." |
| Employee ID (Manual) | Unique per employer | "This Member ID is already registered under this employer." |
| Employee ID (Emirates) | 15 digits after stripping hyphens | "Invalid Emirates ID format." |
| Date of Birth | Required; past date; age 18–50 | "Date of birth must indicate an age between 18 and 50." |
| Employment Joining Date | Required; after DOB; ≤ today  | "Joining date must be after date of birth and not in the future." |
| First/Middle/Last Name (EN) | Required if `is_mandatory = true`; text only; max 50 chars | "[Field] is required." |
| First/Middle/Last Name (AR) | Required if `is_mandatory = true`; Arabic chars only; max 50 chars | "هذا الحقل مطلوب. / Arabic characters only." |
| Basic Salary | Required; > 0 | "Basic salary is required and must be greater than 0." |
| Other active salary components | Non-negative | "[Component] must be 0 or greater." |
| Attachments | At least 1 file uploaded | "At least one document is required (e.g., employment contract, ID copy)." |
| File type | PDF/DOC/DOCX/XLS/XLSX/MSG/JPG/PNG | "File type not supported." |
| File size | ≤ 10MB per file | "File [name] exceeds the 10MB limit." |

