/**
 * Re-export of the shared row shapes and mappers.
 *
 * These live in @recs/shared/rows so the web and mobile clients cannot drift
 * on how a database row becomes a rendered product. This file exists purely so
 * web imports stay short (`@/lib/db`).
 */

export {
  fromResultRow,
  fromSavedRow,
  SELECT_SAVED_PRODUCT,
  SELECT_SEARCH,
  SELECT_SEARCH_RESULT,
  toSnapshot,
} from '@recs/shared';

export type {
  DisplayProduct,
  ExpandedQueryJson,
  SavedProductRow,
  SearchResultRow,
  SearchRow,
} from '@recs/shared';
