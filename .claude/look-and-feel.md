Design Goals
Minimal, modern, and professional look (inspired by Material 3, Apple, and Stripe forms)
Improve spacing, alignment, and visual hierarchy
Reduce visual clutter (avoid heavy borders and dense layouts)
Ensure consistent styling across all forms
Form Field Styling
Use appearance="outline" or fill with subtle borders (no harsh outlines)
Add rounded corners (8px–12px radius)
Increase padding inside inputs for better readability
Use floating labels with smooth animation
Add subtle focus states (soft glow or color accent, no sharp borders)
Replace red error blocks with cleaner inline validation messages
Layout Improvements
Use responsive grid (2-column on desktop, 1-column on mobile)
Maintain consistent spacing:
16px between fields
24–32px between sections
Group related fields into card sections with soft shadows
Add section titles with lighter typography (not bold/heavy)
Typography
Use modern font (Inter / Roboto / system font stack)
Font sizes:
Labels: 12–14px
Inputs: 14–16px
Section titles: 16–18px medium weight
Use muted colors for labels and helper text
Colors & Theme
Use a neutral background (#F9FAFB or similar)
Primary color: subtle (not overly saturated)
Error color: softer red tone
Border color: light gray (#E5E7EB style)
Focus color: primary shade with 20–30% opacity
Buttons
Use rounded buttons (8px radius)
Primary button: solid with slight elevation
Secondary button: outline or ghost style
Add hover and active states
UX Enhancements
Add helper text below inputs where needed
Show validation only after user interaction
Use icons inside inputs where appropriate (optional)
Improve error messages to be short and clear
Angular Implementation
Use Angular Material theming (custom SCSS theme)
Override default styles using global theme or component styles
Avoid inline styles; use reusable CSS classes
Create a shared form wrapper component if needed
Ensure full responsiveness using Flex Layout or CSS Grid
Output Requirements
Provide updated HTML template structure
Provide SCSS styling (modular and reusable)
Ensure consistency across all forms
Keep code clean, scalable, and production-ready

The pagination container (bottom section with “Items per page”, arrows, etc.)
does not align horizontally with the table above.
It appears either:
Slightly narrower, or
Has extra padding/margin compared to the table container.
