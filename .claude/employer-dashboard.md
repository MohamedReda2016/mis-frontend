An Admin Dashboard landing page where the user selects a UAE military/government employer to manage.

🖥️ Page Structure
1. Top Header Bar
Left side:
Page title: “UAE Military Employers”
Subtitle (smaller text): “Select an employer to manage”
Right side:
Logout button
Style: rounded button
Color: dark red / maroon
Text: “Logout”
2. Main Content Area
Background: light grey/blue tone
Layout: responsive card grid
Grid Behavior:
Desktop: 4 cards per row
Tablet: 2–3 cards
Mobile: 1 card per row
🧱 Employer Card Component (Reusable)

Each employer is displayed as a card tile with consistent styling.

Card Layout:
Shape: rounded rectangle
Background: white
Shadow: subtle (elevation effect)
Padding: medium (16–24px)
Card Sections:
1. Top Section (Header Row)
Left:
Employer Name (bold)
Subtitle (small, muted text)
Right:
Circular button with:
Arrow icon (→)
Gold/brown background
2. Bottom Section (Logo Area)
Large rectangular placeholder box
Centered content:
Either:
Employer logo (image)
OR placeholder text: “Official Logo”
Light grey border/background
🧾 Employers Displayed

Cards include:

Ministry of Defense
Subtitle: “Defending the Nation”
Has logo
Ministry of Interior
Subtitle: “Security and Safety for All”
Has logo
Diwan of Ministry of Defense
Subtitle: “Administrative Excellence”
No logo (placeholder)
General Secretariat - Ministry of Presidential Affairs
Subtitle: “Serving National Leadership”
Supreme Council for National Security - General Secretariat
Subtitle: “National Security Excellence”
Diwan of Ministry of Interior
Subtitle: “Supporting Interior Operations”
Federal Authority for Identity & Citizenship
Subtitle: “Identity and Citizenship Services”
National Emergency and Crisis Management
Subtitle: “Prepared for Every Crisis”
🎨 Visual Design Tokens
Primary accent color: Gold/Brown (for arrow buttons)
Danger color: Dark red (logout button)
Card background: White
Page background: Very light grey/blue
Text:
Title: dark, bold
Subtitle: muted grey
⚙️ Interactions
Card click OR arrow button click:
Navigates to employer management page
(Route example: /admin/employers/{id})
Hover effects:
Card slightly lifts (shadow increase)
Arrow button may slightly brighten
Logout button:
Ends session and redirects to login page
🧠 Suggested Component Breakdown (for AI builder)
Header
Title
Subtitle
LogoutButton
EmployerGrid
Responsive layout
EmployerCard (reusable)
Props:
name
subtitle
logoUrl (optional)
id
ArrowButton
LogoPlaceholder

EMPLOYER SELECTOR SCREEN LAYOUT:
- No topbar on this screen (user just logged in)
- Full-screen centered layout, same background as login page
- Top: GPSSA logo placeholder (same as login)
- Heading: "Select Employer"
- Subtitle: "Choose the employer entity you want to manage"
- Display the 14 employers as a scrollable list or card grid:
  Each employer item shows:
  - Employer code badge (e.g., "MOI") in navy pill
  - Full legal name as the main label
  - Status badge: "Active" (green)
  - A [Select] button or make the whole row/card clickable
- Search/filter input at the top of the list:
  → Filters the displayed employers by legalName in real-time (client-side)
  → Placeholder: "Search employer..."
- On select:
  → Call EmployerContextService.setSelectedEmployer(employer)
  → Navigate to /dashboard
- Small footer note: "You can switch employer at any time from the top navigation bar."

=== EMPLOYER SWITCHER IN TOPBAR ===

Update TopbarComponent to show the currently selected employer:
- Between the portal name (left) and user info (right), display:
  "Managing: [Employer Legal Name]"  styled as a subtle chip or secondary label
- Add a [Switch Employer] button (mat-button, small, with swap_horiz icon) next to it
  → Clicking navigates to /select-employer
- If no employer is selected yet (edge case): show "No employer selected" in amber

Employers
Ministry Of Interior -  Ministry Of Defense  - Diwan Of Ministry Of Defense -  General Secretariat - Ministry of Presidential Affairs - The Supreme Council for national security -General Secretariat - Diwan of Ministry Of Interior - Federal Authority For Identity & Citizenship - National Emergency and Crisis Management - General Authority for Ports Border and Free Zone - Weapons and Hazardous Substances Office - Monitoring and control center - National search and rescue Center - Federal Judicial Enforcement Office

on backend add required Models and APIs to retrieve those records - use liquabse for it
