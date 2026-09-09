/**
 * Offline fixture provider — the default.
 *
 * Lets the entire platform be built, run and demoed with **zero API keys** and
 * without burning SerpApi's 250-search free monthly quota during UI work.
 *
 * It is not a stub that returns the same five rows forever: hand-written
 * catalogs cover the common demo queries, and anything else is synthesized
 * deterministically from the query text, so every input yields a plausible,
 * repeatable result set with realistic rating/review/price spreads for the
 * ranking algorithm to chew on.
 */

import type { ProductCandidate } from '../core/types.ts';
import { canonicalAmazonUrl } from '../core/format.ts';
import { tokenize } from '../core/ranking.ts';
import type { AmazonProvider, ProviderSearchOptions } from './types.ts';

interface FixtureItem {
  title: string;
  priceCents: number | null;
  rating: number | null;
  reviewCount: number;
  sponsored?: boolean;
}

interface Catalog {
  /** Tokens that indicate this catalog is a good match for the query. */
  triggers: string[];
  items: FixtureItem[];
}

const CATALOGS: Catalog[] = [
  {
    triggers: ['mug', 'tumbler', 'coffee', 'thermos', 'flask', 'insulated', 'travel', 'commute'],
    items: [
      { title: 'Contigo Autoseal West Loop Stainless Steel Travel Mug 16oz, Leakproof', priceCents: 2499, rating: 4.6, reviewCount: 48213 },
      { title: 'Hydro Flask 12 oz Coffee Mug with Flex Sip Lid, Vacuum Insulated', priceCents: 3295, rating: 4.8, reviewCount: 9142 },
      { title: 'YETI Rambler 14 oz Mug with MagSlider Lid, Stainless Steel', priceCents: 3000, rating: 4.7, reviewCount: 31877 },
      { title: 'Zojirushi SM-SE48 Stainless Steel Travel Mug 16oz, Leakproof Vacuum', priceCents: 3899, rating: 4.7, reviewCount: 6104 },
      { title: 'Simple Modern Voyager Insulated Travel Mug 20oz with Leakproof Lid', priceCents: 2199, rating: 4.7, reviewCount: 15602 },
      { title: 'Thermos Stainless King 16 Ounce Travel Tumbler, Keeps Hot 7 Hours', priceCents: 2687, rating: 4.5, reviewCount: 22940 },
      { title: 'Ember Temperature Control Smart Mug 2, 14 oz, App Controlled', priceCents: 14995, rating: 4.2, reviewCount: 4488 },
      { title: 'BrandNew Insulated Coffee Tumbler Premium Grade', priceCents: 1899, rating: 4.9, reviewCount: 7 },
      { title: 'Stanley Classic Trigger-Action Travel Mug 16 oz Leakproof', priceCents: 2500, rating: 4.6, reviewCount: 27310 },
      { title: 'Bubba Envy S Insulated Stainless Steel Tumbler 24oz with Straw', priceCents: 1998, rating: 4.4, reviewCount: 12061 },
      { title: 'CamelBak Hot Cap Vacuum Insulated Travel Mug 16oz', priceCents: 2795, rating: 4.4, reviewCount: 3320 },
      { title: 'Sponsored: UltraHeat Deluxe Coffee Mug Set', priceCents: 999, rating: 4.8, reviewCount: 1902, sponsored: true },
      { title: 'Ceramic Dinner Plate Set of 4, Microwave Safe', priceCents: 3499, rating: 4.5, reviewCount: 8801 },
      { title: 'Hydro Flask 20 oz All Around Tumbler with Press-In Lid', priceCents: 3495, rating: 4.6, reviewCount: 5210 },
    ],
  },
  {
    triggers: ['headphones', 'headphone', 'earbuds', 'noise', 'cancelling', 'canceling', 'audio', 'office', 'noisy'],
    items: [
      { title: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones, 30 Hour Battery', priceCents: 32800, rating: 4.6, reviewCount: 28414 },
      { title: 'Anker Soundcore Life Q30 Hybrid Active Noise Cancelling Headphones', priceCents: 7999, rating: 4.5, reviewCount: 89327 },
      { title: 'Bose QuietComfort Headphones, Wireless Noise Cancelling, Over-Ear', priceCents: 22900, rating: 4.5, reviewCount: 14203 },
      { title: 'Apple AirPods Pro 2 with Active Noise Cancellation, USB-C', priceCents: 19900, rating: 4.7, reviewCount: 61558 },
      { title: 'Sennheiser HD 450BT Noise Cancelling Wireless Headphones', priceCents: 9995, rating: 4.3, reviewCount: 11086 },
      { title: 'JBL Tune 760NC Over-Ear Noise Cancelling Wireless Headphones', priceCents: 9995, rating: 4.4, reviewCount: 20344 },
      { title: 'Soundcore Space One Noise Cancelling Headphones, 40H Playtime', priceCents: 9499, rating: 4.4, reviewCount: 7712 },
      { title: 'AudioPure Studio ANC Headphones Professional Grade', priceCents: 4999, rating: 5.0, reviewCount: 4 },
      { title: 'Sony WH-CH720N Wireless Noise Cancelling Headphones, Lightweight', priceCents: 12800, rating: 4.5, reviewCount: 18902 },
      { title: 'Beats Studio Pro Wireless Noise Cancelling Headphones', priceCents: 17999, rating: 4.3, reviewCount: 9430 },
      { title: 'Phone Case Compatible with Most Models, Clear', priceCents: 1299, rating: 4.2, reviewCount: 30112 },
    ],
  },
  {
    triggers: ['fan', 'desk', 'quiet', 'cooling', 'air', 'circulator', 'roommate'],
    items: [
      { title: 'Honeywell HT-900 TurboForce Air Circulator Fan, Quiet, 3 Speeds', priceCents: 1999, rating: 4.6, reviewCount: 71204 },
      { title: 'Vornado 133 Compact Air Circulator Desk Fan, Whisper Quiet', priceCents: 3499, rating: 4.5, reviewCount: 15873 },
      { title: 'Dreo Table Fan 9 Inch, 70ft Strong Airflow, 28dB Quiet, 4 Speeds', priceCents: 4499, rating: 4.6, reviewCount: 22910 },
      { title: 'OPOLAR 5 Inch USB Desk Fan, Ultra Quiet, Adjustable Tilt', priceCents: 2299, rating: 4.4, reviewCount: 18420 },
      { title: 'Amazon Basics 3 Speed Small Room Air Circulator Fan, 7 Inch', priceCents: 1899, rating: 4.4, reviewCount: 42003 },
      { title: 'Rowenta VU2531 Turbo Silence Table Fan, 4 Speeds, Quiet', priceCents: 8999, rating: 4.4, reviewCount: 6182 },
      { title: 'SilentBreeze Pro Desk Fan Ultra Premium Whisper', priceCents: 3299, rating: 4.9, reviewCount: 9 },
      { title: 'Lasko 2521 Oscillating Pedestal Fan, 16 Inch, 3 Speeds', priceCents: 3897, rating: 4.4, reviewCount: 28776 },
    ],
  },
  {
    triggers: ['backpack', 'laptop', 'bag', 'rucksack', 'durable', 'commuter'],
    items: [
      { title: 'JanSport Driver 8 Wheeled Backpack, Fits 15 Inch Laptop, Durable', priceCents: 8500, rating: 4.7, reviewCount: 9821 },
      { title: 'SwissGear 1900 Scansmart Laptop Backpack, Fits 17 Inch Laptop', priceCents: 8999, rating: 4.6, reviewCount: 34210 },
      { title: 'Osprey Nebula 32L Commuter Laptop Backpack, Fits 16 Inch Laptop', priceCents: 18000, rating: 4.7, reviewCount: 4102 },
      { title: 'Amazon Basics Laptop Backpack, Fits 17 Inch Laptop, Water Resistant', priceCents: 2999, rating: 4.4, reviewCount: 51330 },
      { title: 'Timbuk2 Authority Laptop Backpack Deluxe, Fits 16 Inch Laptop', priceCents: 12900, rating: 4.5, reviewCount: 3877 },
      { title: 'Matein Travel Laptop Backpack, Durable, Fits 15.6 Inch Laptop, USB', priceCents: 3599, rating: 4.5, reviewCount: 68914 },
      { title: 'Peak Design Everyday Backpack 30L V2, Fits 16 Inch Laptop', priceCents: 29995, rating: 4.6, reviewCount: 2211 },
      { title: 'CarryMax Ultra Durable Laptop Backpack Professional', priceCents: 4499, rating: 5.0, reviewCount: 6 },
    ],
  },
  {
    triggers: ['gift', 'apartment', 'housewarming', 'moving', 'kitchen', 'home'],
    items: [
      { title: 'Lodge Pre-Seasoned Cast Iron Skillet 10.25 Inch, Made in USA', priceCents: 1990, rating: 4.7, reviewCount: 152883 },
      { title: 'OXO Good Grips 3-Piece Everyday Kitchen Tool Set, Housewarming', priceCents: 2499, rating: 4.8, reviewCount: 21044 },
      { title: 'Brooklinen Luxe Core Sheet Set, Queen, Long-Staple Cotton', priceCents: 15900, rating: 4.4, reviewCount: 8120 },
      { title: 'Yankee Candle Large Jar Candle, Home Sweet Home, 110 Hour Burn', priceCents: 2899, rating: 4.8, reviewCount: 43201 },
      { title: 'Simple Human Slim Open Trash Can 10.5 Gallon, Brushed Stainless', priceCents: 7999, rating: 4.6, reviewCount: 12440 },
      { title: 'Instant Pot Duo 7-in-1 Electric Pressure Cooker, 6 Quart', priceCents: 8995, rating: 4.7, reviewCount: 198776 },
      { title: 'HomeBliss Deluxe Housewarming Gift Basket Premium', priceCents: 5999, rating: 4.9, reviewCount: 8 },
      { title: 'Utopia Towels Cotton Bath Towel Set of 4, 600 GSM', priceCents: 3299, rating: 4.5, reviewCount: 61092 },
    ],
  },
];

/** xmur3 string hash → 32-bit seed. */
function seedFrom(text: string): number {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i += 1) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^= h >>> 16) >>> 0;
}

/** mulberry32 — small, fast, deterministic PRNG. */
function makeRandom(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable, ASIN-shaped id derived from the title (10 chars, B0 prefix). */
function fakeAsin(title: string, salt: number): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  const random = makeRandom(seedFrom(title) ^ salt);
  let id = 'B0';
  for (let i = 0; i < 8; i += 1) {
    id += alphabet[Math.floor(random() * alphabet.length)] ?? '0';
  }
  return id;
}

/** Pick the catalog sharing the most trigger tokens with the query. */
function bestCatalog(keywords: string): Catalog | null {
  const tokens = new Set(tokenize(keywords));
  let best: Catalog | null = null;
  let bestHits = 0;

  for (const catalog of CATALOGS) {
    const hits = catalog.triggers.filter((trigger) => tokens.has(trigger)).length;
    if (hits > bestHits) {
      best = catalog;
      bestHits = hits;
    }
  }
  return bestHits > 0 ? best : null;
}

/**
 * Build a plausible catalog for a query no hand-written set covers, so the UI
 * always has something realistic to render.
 */
function synthesize(keywords: string): FixtureItem[] {
  const tokens = tokenize(keywords);
  const subject = tokens.slice(0, 3).join(' ') || 'product';
  const titleCase = subject.replace(/\b\w/g, (c) => c.toUpperCase());

  const brands = ['Anker', 'Amazon Basics', 'Bellroy', 'Kensington', 'Vornado',
    'Nimble', 'Northfield', 'Corsa', 'Everlane', 'Sonora', 'Wirecraft', 'Halden'];
  const qualifiers = ['Premium', 'Compact', 'Heavy Duty', 'Lightweight', 'Pro',
    'Everyday', 'Deluxe', 'Essential', 'Classic', 'Advanced', 'Portable', 'Ultra'];

  const random = makeRandom(seedFrom(keywords));

  return Array.from({ length: 14 }, (_, index) => {
    const brand = brands[Math.floor(random() * brands.length)] ?? 'Acme';
    const qualifier = qualifiers[Math.floor(random() * qualifiers.length)] ?? 'Standard';

    // One deliberately thin-but-perfect listing, so the Bayesian guard is
    // visible during manual testing.
    if (index === 11) {
      return {
        title: `${brand} ${qualifier} ${titleCase} Limited Edition`,
        priceCents: Math.round(1500 + random() * 4000),
        rating: 5,
        reviewCount: Math.floor(3 + random() * 9),
      };
    }

    return {
      title: `${brand} ${qualifier} ${titleCase}${random() > 0.5 ? ', Model ' + (2000 + Math.floor(random() * 500)) : ''}`,
      priceCents: Math.round(999 + random() * 18000),
      rating: Math.round((3.6 + random() * 1.3) * 10) / 10,
      reviewCount: Math.floor(40 + random() * 60000),
      sponsored: index === 0 && random() > 0.6,
    };
  });
}

export function createFixturesProvider(): AmazonProvider {
  return {
    name: 'fixtures',

    // deno-lint-ignore require-await -- satisfies the async provider interface
    async search(keywords: string, options: ProviderSearchOptions): Promise<ProductCandidate[]> {
      const catalog = bestCatalog(keywords);
      const items = catalog?.items ?? synthesize(keywords);
      const salt = seedFrom(keywords);

      return items.slice(0, options.limit).map((item, index) => {
        const asin = fakeAsin(item.title, salt);
        return {
          asin,
          title: item.title,
          // Deterministic placeholder imagery keyed off the ASIN, so a given
          // product always shows the same picture across reloads.
          imageUrl: `https://picsum.photos/seed/${asin}/480/480`,
          productUrl: canonicalAmazonUrl(asin, options.domain, options.associateTag),
          priceCents: item.priceCents,
          currency: 'USD',
          rating: item.rating,
          reviewCount: item.reviewCount,
          position: index,
          sponsored: item.sponsored === true,
        };
      });
    },
  };
}
