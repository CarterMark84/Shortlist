export type {
  ApiErrorBody,
  ExpandedQuery,
  ProductCandidate,
  RankedProduct,
  RecommendRequest,
  RecommendResponse,
  SavedProduct,
  ScoreBreakdown,
  SearchSummary,
} from './types.ts';

export {
  assertWeightsValid,
  bayesianRating,
  DEFAULT_RANKING_CONFIG,
  explainRank,
  filterCandidates,
  priceValueScore,
  rankProducts,
  relevanceScore,
  reviewVolumeScore,
  tokenize,
  WEIGHTS,
} from './ranking.ts';
export type { RankingConfig } from './ranking.ts';

export {
  fromResultRow,
  fromSavedRow,
  SELECT_SAVED_PRODUCT,
  SELECT_SEARCH,
  SELECT_SEARCH_RESULT,
  toSnapshot,
} from './rows.ts';
export type {
  DisplayProduct,
  ExpandedQueryJson,
  SavedProductRow,
  SearchResultRow,
  SearchRow,
} from './rows.ts';

export {
  canonicalAmazonUrl,
  formatCompactCount,
  formatPercent,
  formatPrice,
  formatRating,
  formatRelativeTime,
  formatReviewCount,
  starFills,
} from './format.ts';

export {
  EXAMPLE_PROMPTS,
  fontSize,
  fontWeight,
  layout,
  lineHeight,
  palette,
  radius,
  shadow,
  spacing,
} from './theme.ts';
export type { ColorScheme, ThemeColors } from './theme.ts';

export { ApiError, describeApiError, requestRecommendations } from './api.ts';
export type { RecommendOptions } from './api.ts';
