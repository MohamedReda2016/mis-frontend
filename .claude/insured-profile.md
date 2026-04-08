
TRIGGER: Clicking Member ID link from Manage Insureds list or Case Detail screen.
BACK: ← arrow (top-left) → navigate back to previous screen.
ALL CONTENT IS READ-ONLY — no inline editing on this screen.

═══════════════════════════════════════════════════
PROFILE HEADER
═══════════════════════════════════════════════════

Avatar circle with initials (first + last letter of English name), colored by Member ID hash.

Primary heading: Full English name (firstName_en middleName_en lastName_en)
Secondary heading (below, RTL, Arabic font): Full Arabic name (firstName_ar middleName_ar lastName_ar)
Sub-heading: Member ID as a styled code badge (e.g., "MOD00001")

Status badge: Active (green ●) | Inactive/Terminated (grey ●)
Meta info line: "[Employer Legal Name]  |  Joined: DD/MM/YYYY"

QUICK ACTIONS (right side of header):
If Active + Admin1 (MAKER):
[Update Salary] (blue primary) → navigate to /insureds/{id}/update-salary
[Record End of Service] (outlined) → navigate to /insureds/{id}/eos
[More Actions ▾] dropdown → "Record Merge Service" | "Record Purchase Service"
If Inactive (any role):
Show amber banner: "This insured was terminated on [Date] — Reason: [Reason]."
No action buttons.
If Active + Admin2: no action buttons (read-only).

CONTEXTUAL BANNERS (below header, conditional):
- Open RETURNED case → orange: "This insured has a case returned for revision. [View Case]"
- Excluded from last proforma → yellow: "Excluded from [Period] proforma — [Reason]"
- No salary recorded → red: "No salary recorded. Please update before next proforma."

═══════════════════════════════════════════════════
TAB NAVIGATION
═══════════════════════════════════════════════════

5 tabs: Personal Info | Employment | Salary History | Contributions | Cases
Default: Personal Info

═══════════════════════════════════════════════════
TAB 1: Personal Info
═══════════════════════════════════════════════════

IDENTITY SECTION (card):
Member ID | Member ID Strategy (Emirates ID / Manual Prefix — read-only label) |
Emirates ID (formatted: 784-1995-1234567-8) | Date of Birth (DD/MM/YYYY) |
Age (calculated from DOB: "34 years")

NAME DETAILS SECTION (card):
Show only fields configured in employer's insured field config.
English group: First Name | Middle Name | Last Name
Arabic group (RTL): الاسم الأول | الاسم الأوسط | اسم العائلة
Arabic fields: dir=rtl, text-align right, Arabic font.
Missing optional fields: display "—"

REGISTRATION DOCUMENTS SECTION (card):
Title: "Registration Documents"
List of uploaded files: file name + type icon + size + [Download] button
Empty state: "No documents attached."

═══════════════════════════════════════════════════
TAB 2: Employment
═══════════════════════════════════════════════════

CURRENT EMPLOYMENT CARD:
Employer | Employment Status badge (Active=green / Terminated=red) |
Joining Date | End Date (— if active) |
Termination Reason (only if terminated) |
Days in Service (calculated) | Years of Service (calculated: "X years, Y months")

SERVICE PERIODS TABLE:
Columns: Period Type (Employment/Merged/Purchased) | Start Date | End Date | Duration | Source (case link)
Empty state: "No additional service periods."

═══════════════════════════════════════════════════
TAB 3: Salary History
═══════════════════════════════════════════════════

CURRENT SALARY CARD (top, highlighted):
Show each ACTIVE salary component (per employer config) with its value.
Show contributable salary breakdown:
"[Component]   AED [value]  ×  [config%]%  =  AED [calculated]"  per active component
"Contributable Salary: AED [total]" (bold, bottom row)
Effective From: date | Last Updated By: name + date

SALARY HISTORY TABLE:
Columns: Effective Date (desc) | Active component columns (per employer config) |
Contributable Salary | Updated By | Updated On | Source
Source values: Registration / Manual Update / Bulk Upload
Only active employer salary components shown as columns.
Empty state: "No salary history available."

═══════════════════════════════════════════════════
TAB 4: Contributions
═══════════════════════════════════════════════════

CONTRIBUTION SUMMARY CARD (top):
Total Months Contributed | Total Employee Contribution (AED) |
Total Employer Contribution (AED) | Total Contribution (AED) |
Last Proforma Period | Last Contribution Amount (AED)

CONTRIBUTION HISTORY TABLE:
Columns: Period (Month Year) | Contributable Salary | Employee Contribution |
Employer Contribution | Total Contribution | Status | Exclusion Reason | Proforma ID (link)

Status values:
Included → green "Included" badge
Excluded → red "Excluded" badge + reason text in Exclusion Reason column

Proforma ID: blue link → opens proforma read-only detail
Sort: period descending
Empty state: "No contribution history available yet."

═══════════════════════════════════════════════════
TAB 5: Cases
═══════════════════════════════════════════════════

CASES TABLE:
Columns: Case ID (blue link) | Case Type | Status badge | Created By | Created On | Last Updated
Includes all case types that reference this insured's insured_id.
Sort: Created On descending.
Case ID link → navigate to /cases/{caseId}
Empty state: "No cases found for this insured."


Match portal theme: navy #1A3C6E primary | gold #C09A3A accent.
Avatar background: derive color from Member ID string hash.
All monetary values: "AED X,XXX.XX".
Arabic fields: RTL direction, Arabic-compatible font stack.
Tab content cards: mat-card with consistent padding and mat-divider between sections.
Status badges: mat-chip (Active=green, Inactive=grey, Terminated=red).
