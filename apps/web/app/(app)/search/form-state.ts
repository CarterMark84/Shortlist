/**
 * Form state shape for the search box.
 *
 * Deliberately NOT in `actions.ts`: that file carries `'use server'`, and such
 * a file may only export async functions. Exporting this object from it makes
 * Next reject the whole module at load time with `A "use server" file can only
 * export async functions, found object`.
 */

export interface SearchFormState {
  error: string | null;
  /** Echoed back so a failed submission does not lose the user's text. */
  query: string;
}

export const initialSearchState: SearchFormState = { error: null, query: '' };
