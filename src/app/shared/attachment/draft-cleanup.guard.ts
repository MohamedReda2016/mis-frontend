import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';

/**
 * Interface that any component wishing to participate in navigation protection
 * must implement.  The guard delegates entirely to the component so each route
 * can express its own leave policy (draft cleanup, in-progress warning, etc.).
 */
export interface CanDeactivateComponent {
  /** Return `true` (or an Observable of true) to allow navigation, false to block. */
  canDeactivate(): Observable<boolean> | boolean;
}

/**
 * Functional `canDeactivate` guard wired to form and case-detail routes.
 *
 * - **Draft-mode routes** (register-insured, update-salary): the component shows a
 *   discard-changes dialog and, if confirmed, calls `DELETE /attachments/draft/{id}`
 *   to remove orphan files immediately.
 * - **Case-detail route**: the component blocks navigation only while an upload is
 *   actively in-flight (files are already linked to the case, so no cleanup is needed).
 */
export const draftCleanupGuard: CanDeactivateFn<CanDeactivateComponent> = (component) =>
  component.canDeactivate();
