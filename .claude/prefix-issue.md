n my Angular Material forms, I am facing layout and rendering issues when using Arabic (RTL) with mixed English content (e.g., currency like "AED").

Observed Issues
Currency text (e.g., "AED" or "icons") overlaps or appears misaligned inside form fields
Prefix/suffix elements are not positioned correctly in RTL layout
Labels and placeholders sometimes overlap with input content
Input text alignment is inconsistent (Arabic RTL vs numeric/English LTR)
Error messages and field borders render correctly, but internal field layout is broken
Overall UI looks visually unbalanced and not RTL-compliant
Root Cause (to validate and fix)
Incorrect usage of Angular Material matPrefix / matSuffix in RTL context
Missing or inconsistent dir="rtl" configuration at app or component level
Improper handling of mixed-direction content (Arabic + English)
CSS overrides interfering with Angular Material internal flex/layout system
Requirements
Fix all form fields to fully support RTL layout
Ensure correct positioning of prefix/suffix (currency should appear consistently)
Prevent overlap between labels, placeholders, and input values
Maintain proper alignment:
Arabic text → RTL
Numbers/currency → LTR but visually aligned
Ensure responsiveness and consistency across all forms
Expected Output
Updated Angular HTML templates using best practices (matSuffix preferred for currency)
Clean SCSS fixes (no hacks, scalable)
Proper RTL handling using Angular CDK Directionality or dir="rtl"
Ensure compatibility with Angular Material latest version
Maintain modern UI/UX standards
Constraints
Do not break existing validation logic
Do not use inline styles
Keep solution reusable across all forms

The dir on mat-form-field breaks the outline border notch calculation — it conflicts with the RTL container layout. Let me revert those changes back to dir on the <input> elements, then fix the real root    
cause: the CDK Directionality service doesn't react to manual document.documentElement.dir changes, so Angular Material never re-renders its label/suffix layout after a language switch.
                                                                                                
