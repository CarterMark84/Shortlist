/**
 * Form state shapes for the auth screens.
 *
 * Deliberately NOT in `actions.ts`: that file carries `'use server'`, and such
 * a file may only export async functions. Exporting the `initialAuthState`
 * object from it makes Next reject the whole module at load time with
 * `A "use server" file can only export async functions, found object`, which
 * turns every action in the file into a 500.
 */

export interface AuthFormState {
  error: string | null;
  /** Set on success where we stay on the page (e.g. "check your email"). */
  notice: string | null;
  /** Echoed back so a failed submission does not lose what was typed. */
  email: string;
}

export const initialAuthState: AuthFormState = { error: null, notice: null, email: '' };
