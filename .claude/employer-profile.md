Employer Profile Tab on dashboard
Header:
Title: Employer Profile
Subtitle: View employer information and details

Employer Info Section:
Displays key info in cards:
Employer Name (e.g., Ministry of Defense)
Employer ID
Employer Code
Email Address
IBAN

Member ID Configuration Section:
- Subtitle: "Configure how Member IDs are generated for insured employees"
- Scope: per-employer (employer_id passed as route param or from EmployerContextService)

TWO RADIO OPTION CARDS (mat-radio-group with custom card-style options):

Option 1 — "Use Emirates ID"
- Description: "The employee's Emirates ID will be used as the Member ID"
- Example text: "Example: 784-1995-1234567-8 → Member ID: 784199512345678"

Option 2 — "Manual Entry (Prefix + User Input)"  [default selected if employer code exists]
- Description: "Member ID will start with employer code, followed by a user-entered number"
- Example text: "Example: [employerCode] + [User enters: 12345] → Member ID: [employerCode]12345"
- The example dynamically shows the current employer's code

CURRENT CONFIGURATION CARD (below the radio options):
- Shows a green card with checkmark icon when a config is saved
- Text dynamically reflects the selected option:
  EMIRATES_ID: "Member IDs will be derived from the employee's Emirates ID"
  MANUAL_PREFIX: "Member IDs will be manually entered with prefix '[employerCode]'"
- Shows amber warning card if no config has been saved yet

SAVE BUTTON:
- "Save Member ID Configuration" with a save icon (mat-raised-button, primary)
- Bottom-right positioning
- On click: show confirmation modal with:
  - Warning if changing existing config:
    "⚠️ Changing this setting does not affect existing registered members."
  - Buttons: Cancel | Confirm & Save
- On confirm: call PUT /api/v1/employers/{id}/config with body { member_id_strategy }
  // TODO: replace with real API call
- On success: show snackbar "Member ID configuration saved successfully."


Salary Component Configuration Section:
Header:
Title: Salary Component Configuration
Subtitle: Configure salary components and contributable percentages
Button: Edit Configuration

Components Cards:
Each includes:
Component Name:
Basic Salary
Children Allowance
Complementary allowance
Other Allowance
Checkbox (enabled/disabled)
Field:
Contributable Percentage (e.g., 100%)

Behavior:
Edit Configuration → enables editing mode
Save changes (expected action)

🎯 Key UX Expectations
Clean enterprise UI (government style)
Consistent card + table design
Status color coding
Fast filtering/search
Clear navigation between tabs 

Angular Best Practices
   ✅ Use Smart vs Dumb Components
   ✅ Use Reactive Forms (NOT Template-driven)
   ✅ Use Lazy Loading (IMPORTANT)
   🔐 3. Authentication & Security
   ✅ Use HTTP Interceptor
   Attach JWT token
   Handle 401 errors globally
   ✅ Use Route Guards
   ✅ Store Token Securely
   Prefer HttpOnly cookies (backend)
   If not → use localStorage cautiously

🧭 4. Routing Standards
Clear Routes Naming:
/login /employers /dashboard/contributions /dashboard/profile
Use Child Routes for Tabs:
dashboard/   ├── contributions   ├── profile

🧩 5. UI Component Standards
✅ Reusable Components (Shared Module)
Table component
Status badge
Card component
Search input
Button

✅ Naming Convention
component: contributions-table.component.ts service: contributions.service.ts model: proforma.model.ts

✅ Status Badge Mapping
Create a reusable component:
<app-status-badge status="PAID"></app-status-badge>

📊 6. State Management
Use RxJS + Services (Simple State) or  NgRx
🌐 7. API Integration Standards
✅ Use Dedicated Services per Feature
contributions.service.ts employer.service.ts auth.service.ts

✅ Strong Typing (IMPORTANT)
export interface Proforma {   id: number;   type: string;   period: string;   amount: number;   status: 'Paid' | 'Pending Admin2' | 'Pending Admin3' | 'Pending Admin4'; }

✅ Use Environment
environment.ts
environment.stage.ts
environment.preprod.ts environment.prod.ts

🎨 8. UI/UX Standards
✅ Responsive Layout
Grid-based (Flexbox / CSS Grid)
Mobile-friendly cards instead of tables

✅ ngx-translate
🧱 3. Setup Translation Module
📁 4. Translation Files Structure
src/assets/i18n/   ├── en.json   └── ar.json

🔤 6. Using Translations in HTML
🔁 7. Language Switcher

↔️ 8. RTL (Arabic) Support — VERY IMPORTANT
Automatically switch direction:
switchLang(lang: string) {   this.translate.use(lang);    const dir = lang === 'ar' ? 'rtl' : 'ltr';   document.documentElement.dir = dir; }

Global CSS:
html[dir="rtl"] {   direction: rtl;   text-align: right; }

Handle Layout Flip:
Tables align right
Icons flip if needed
Margins/paddings switch

🎨 9. UI Considerations for Arabic
✅ Must Handle:
Right-to-left layout
Arabic font (recommended):
body {   font-family: 'Cairo', 'Roboto', sans-serif; }

✅ Numbers & Currency:
Use Angular pipes:
{{ amount | currency:'AED':'symbol':'1.2-2' }}

🧠 10. Best Practices
✅ Use Translation Keys (NOT hardcoded text)
❌ Bad:
<h1>Login</h1>
✅ Good:
<h1>{{ 'LOGIN.TITLE' | translate }}</h1>
🚀 10. Performance Best Practices
✅ Use OnPush Change Detection
changeDetection: ChangeDetectionStrategy.OnPush

✅ TrackBy in ngFor
trackBy: trackById(index, item) {   return item.id; }

✅ Avoid Heavy Logic in HTML
❌ Bad:
*ngIf="items.filter(x => x.active).length > 0"
✅ Good:
activeItems$ | async
🔄 13. Recommended Enhancements
Add loading spinner interceptor
Add global error handler
Add role-based access control (RBAC)
Add audit logs for actions

⚠️ Common Mistakes to Avoid
❌ Putting all logic in components
  ❌ Not using interfaces
  ❌ No lazy loading
  ❌ Direct API calls inside components
  ❌ Not handling errors globally

