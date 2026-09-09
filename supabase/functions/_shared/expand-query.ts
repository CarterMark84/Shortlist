/**
 * Vague description → structured Amazon search intent, via Claude.
 *
 * This is the piece that makes the product work. "Something to keep my coffee
 * hot on my long commute" is not an Amazon search query; "insulated travel mug
 * leakproof 16oz" is. Amazon's own search does a poor job with conversational
 * input, so we translate first.
 */

import Anthropic from 'npm:@anthropic-ai/sdk@0.124.0';
import { zodOutputFormat } from 'npm:@anthropic-ai/sdk@0.124.0/helpers/zod';
import { z } from 'npm:zod@4.5.4';

import type { ExpandedQuery } from './core/types.ts';
import { tokenize } from './core/ranking.ts';

/** Model choice, kept here so it is easy to find and change. */
const MODEL = 'claude-opus-5';

/**
 * `effort: 'low'` keeps latency down — this is a short extraction, not a
 * reasoning problem, and a search box needs to feel immediate. Thinking is on
 * by default on Opus 5, so `thinking` is deliberately omitted.
 */
const EFFORT = 'low' as const;

const MAX_TOKENS = 4096;

const ExpandedQuerySchema = z.object({
  keywords: z
    .string()
    .describe(
      'The search phrase to send to Amazon. 2-8 concrete product words a shopper ' +
        'would actually type. Use the noun for the product category plus the most ' +
        'important distinguishing attributes. No sentences, no filler, no brand ' +
        'unless the user named one.',
    ),
  category: z
    .string()
    .nullable()
    .describe(
      'The Amazon department this belongs in (e.g. "Home & Kitchen", ' +
        '"Electronics"), or null if genuinely unclear.',
    ),
  mustHave: z
    .array(z.string())
    .describe(
      'Concrete, checkable features the product must have, drawn only from what ' +
        'the user said or clearly implied. Each item 1-4 words, lowercase ' +
        '(e.g. "leakproof lid", "fits cupholder"). Empty array if none. Never ' +
        'invent requirements.',
    ),
  budgetMinCents: z
    .number()
    .int()
    .nullable()
    .describe('Lower price bound in US cents if the user implied one, else null.'),
  budgetMaxCents: z
    .number()
    .int()
    .nullable()
    .describe(
      'Upper price bound in US cents if the user implied one (e.g. "under $150" ' +
        '→ 15000), else null.',
    ),
  interpretation: z
    .string()
    .describe(
      'One short sentence, addressed to the user, restating what you understood ' +
        'them to be looking for. Shown back to them so they can tell whether ' +
        'they were understood.',
    ),
});

const SYSTEM_PROMPT = `You turn a shopper's vague, conversational description into a precise Amazon product search.

The user is describing a product they want but may not know the name of. Your job is to work out what category of product actually solves their problem, then produce search terms a knowledgeable shopper would type.

Guidelines:
- Infer the product category from the *problem* described, not the words used. "Keep my coffee hot on my commute" is a travel mug, not a coffee maker.
- Keywords should be the terms that retrieve the right shelf on Amazon: category noun plus the attributes that matter. Drop everything else.
- Only record a must-have or a budget the user actually expressed or clearly implied. Do not pad the list to look thorough — an empty array is the right answer more often than not.
- Convert money to US cents. "Under $150" is a max of 15000. "Cheap" or "affordable" is not a number; leave the budget null.
- If the description is too vague to identify any product category, still give your single best guess in keywords rather than refusing, and say in the interpretation that you had to guess.`;

export class ExpansionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExpansionError';
  }
}

/** Guard against a model returning an implausible budget. */
const MAX_PLAUSIBLE_CENTS = 100_000_000; // $1,000,000

function sanitizeCents(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  if (rounded < 0 || rounded > MAX_PLAUSIBLE_CENTS) return null;
  return rounded;
}

/**
 * Expand a raw user description into structured search intent.
 *
 * Throws `ExpansionError` on failure — by design there is no silent keyword
 * fallback in production. Losing the interpretation step quietly would degrade
 * every result while looking like it worked.
 */
export async function expandQuery(rawQuery: string, apiKey: string): Promise<ExpandedQuery> {
  const client = new Anthropic({ apiKey });

  let response;
  try {
    response = await client.messages.parse({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      output_config: {
        effort: EFFORT,
        format: zodOutputFormat(ExpandedQuerySchema),
      },
      messages: [{ role: 'user', content: rawQuery }],
    });
  } catch (cause) {
    if (cause instanceof Anthropic.RateLimitError) {
      throw new ExpansionError('Too many requests to the interpretation service. Try again shortly.');
    }
    if (cause instanceof Anthropic.AuthenticationError) {
      throw new ExpansionError('ANTHROPIC_API_KEY is missing or invalid.');
    }
    if (cause instanceof Anthropic.APIConnectionError) {
      throw new ExpansionError('Could not reach the interpretation service.');
    }
    throw new ExpansionError(
      `Could not interpret that description: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }

  // Always check stop_reason before trusting content.
  if (response.stop_reason === 'refusal') {
    throw new ExpansionError(
      'That description could not be processed. Please rephrase what you are looking for.',
    );
  }

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new ExpansionError('The interpretation service returned an unreadable response.');
  }

  const keywords = parsed.keywords.trim();
  if (keywords.length === 0 || tokenize(keywords).length === 0) {
    throw new ExpansionError(
      'Could not work out what product you mean. Try adding a little more detail.',
    );
  }

  const budgetMinCents = sanitizeCents(parsed.budgetMinCents);
  const budgetMaxCents = sanitizeCents(parsed.budgetMaxCents);

  return {
    keywords,
    category: parsed.category?.trim() || null,
    mustHave: parsed.mustHave
      .map((feature) => feature.trim().toLowerCase())
      .filter((feature) => feature.length > 0)
      .slice(0, 8),
    // Swap a nonsensical inverted range rather than filtering everything out.
    budgetMinCents:
      budgetMinCents !== null && budgetMaxCents !== null && budgetMinCents > budgetMaxCents
        ? budgetMaxCents
        : budgetMinCents,
    budgetMaxCents:
      budgetMinCents !== null && budgetMaxCents !== null && budgetMinCents > budgetMaxCents
        ? budgetMinCents
        : budgetMaxCents,
    interpretation: parsed.interpretation.trim(),
  };
}

/**
 * Keyword-only expansion, used **exclusively** when no ANTHROPIC_API_KEY is
 * configured, so the app is runnable end-to-end before you have a key.
 *
 * This is a development affordance, not a production path: with a key present,
 * a Claude failure surfaces as an error instead of quietly landing here.
 */
export function devFallbackExpansion(rawQuery: string): ExpandedQuery {
  const keywords = tokenize(rawQuery).slice(0, 8).join(' ');
  return {
    keywords: keywords.length > 0 ? keywords : rawQuery.trim(),
    category: null,
    mustHave: [],
    budgetMinCents: null,
    budgetMaxCents: null,
    interpretation: `Keyword search for "${keywords}" (ANTHROPIC_API_KEY not configured — set it for real interpretation).`,
  };
}
