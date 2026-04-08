Restyle the Topbar
File changes: dashboard.html, dashboard.scss
The current topbar is navy (#1A3C6E) with a mat-icon shield. The reference image shows a white topbar with a thin gold top-border strip, the GPSSA logo image on the start side, and navigation on the end side. Changes:

Background: white (#ffffff) with a 3px solid #8B6914 top border and a bottom shadow
Replace the <mat-icon>shield</mat-icon> + "Military Pension MIS" text brand block with <img src="assets/gpssa-logo.svg" class="brand-logo" alt="GPSSA" /> — a fixed height (~40px), no width constraint so it scales naturally
The logo sits in .topbar-start which uses inset-inline-start logic, so it automatically appears on the left in LTR (English) and right in RTL (Arabic) — correct for both languages with zero extra logic
Text/icon colors in the center and end sections update from white-on-navy to dark text-on-white (#1A3C6E navy for icons, #333 for text)
The employer chip changes from a semi-transparent white-on-navy pill to a light navy-tinted pill on white background (similar to the reference)
The user avatar keeps the gold circle, and the lang switcher keeps its behavior


Phase 3 — Update Primary Button Color
File changes: dashboard.scss, styles.scss, lang-switcher.ts (scss)
From the reference image, the primary action button (login, key CTAs) uses a dark warm gold #8B6914 — noticeably darker than the current $gold: #C09A3A. Changes:

Introduce $gold-primary: #8B6914 as the new CTA token
The lang switcher active state changes from #C09A3A to #8B6914
All filled primary mat-button / mat-raised-button calls in the app pick up the new color through the global Material theme override in styles.scss — specifically the --mat-filled-button-container-color custom property
The user avatar circle keeps $gold: #C09A3A (it's an accent element, not a CTA)
Login page button color also updates since it uses the same Material theme primary

