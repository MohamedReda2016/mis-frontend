Employer Overview Dashboard (New Screen)
New files:
src/app/employer/employer-overview/employer-overview.ts
src/app/employer/employer-overview/employer-overview.html
src/app/employer/employer-overview/employer-overview.scss

Layout matches the reference image — two cards side by side:
Left card — Employer Identity & Actions

Large employer name heading (from EmployerContextService.selectedEmployer(), language-aware)
"View employer account →" outlined button → navigates to dashboard/profile
"Action required" panel (light rose/pink background matching reference):

Calls CaseService.getCases(employerId) and filters for cases where the current user (ADMIN1) needs to act: overallStatus === 'RETURNED'
If none: shows "Currently, there are no tasks which require your action."
If there are returned cases: shows a count chip + link to Activity tab



Right card — Employees Summary

"Employees Summary" heading
Total employees count (large number)
Status list with color dots and counts:

🟢 Active — status === 'ACTIVE' count
🟡 Enrollment in progress — status === 'PENDING' count (requires updating the Insured type from 'ACTIVE' | 'INACTIVE' to 'ACTIVE' | 'INACTIVE' | 'PENDING')
⚪ Inactive — status === 'INACTIVE' count


Donut chart — pure SVG, no new library. Uses stroke-dasharray and stroke-dashoffset on <circle> elements to render the three segments. Computed from the same insured counts.
"View employee details →" outlined button → navigates to dashboard/insureds

Data source: a single InsuredService.getAll(employerId) call, all derived with computed() signals on the component.

Phase 5 — Routing & Navigation
File changes: app.routes.ts, dashboard.html

Add new lazy route: { path: 'overview', loadComponent: () => import('./employer/employer-overview/employer-overview').then(m => m.EmployerOverviewComponent) } inside the dashboard children
Change the dashboard default redirect from 'profile' to 'overview'
Add a fourth tab link in dashboard.html for "Overview" (mat-icon: dashboard) — positioned first in the tab list, so it's the landing tab

Phase 7 — Fix Insured Status Type (Minor Model Update)
File change: src/app/insured/insured.model.ts
Update the Insured interface status type from 'ACTIVE' | 'INACTIVE' to 'ACTIVE' | 'INACTIVE' | 'PENDING'. This matches the actual backend entity which has three states: PENDING (awaiting registration approval), ACTIVE, and INACTIVE.
