import { fetchListings } from "./providers";
import { rankDeals, scoreDeal } from "./scoring";
import { readDealsDataset, writeDealsDataset } from "./store";
import type { DealsDataset, MarketSummary, ScoredDeal, SourceName, SourceQuery } from "./types";

const DEFAULT_MARKETS = [
  "Atlanta, GA",
  "Cleveland, OH",
  "Detroit, MI",
  "Memphis, TN",
  "Indianapolis, IN",
  "Birmingham, AL",
  "Kansas City, MO",
  "St. Louis, MO",
  "Baltimore, MD",
  "Philadelphia, PA",
];

export function defaultQuery(): SourceQuery {
  return {
    markets: DEFAULT_MARKETS,
    limitPerMarket: 18,
  };
}

function summarizeMarkets(deals: ScoredDeal[]): MarketSummary[] {
  const grouped = new Map<string, ScoredDeal[]>();
  for (const deal of deals) {
    const bucket = grouped.get(deal.market) ?? [];
    bucket.push(deal);
    grouped.set(deal.market, bucket);
  }

  return [...grouped.entries()]
    .map(([market, bucket]) => {
      const dealCount = bucket.length;
      const averageScore = bucket.reduce((sum, d) => sum + d.viability.score, 0) / dealCount;
      const averageCapRate = bucket.reduce((sum, d) => sum + d.metrics.capRate, 0) / dealCount;
      const averageCashOnCash = bucket.reduce((sum, d) => sum + d.metrics.cashOnCashReturn, 0) / dealCount;
      const topGradeShare = bucket.filter((d) => d.viability.grade === "A" || d.viability.grade === "B").length / dealCount;

      return {
        market,
        city: bucket[0].city,
        state: bucket[0].state,
        dealCount,
        averageScore: Number(averageScore.toFixed(2)),
        averageCapRate: Number(averageCapRate.toFixed(4)),
        averageCashOnCash: Number(averageCashOnCash.toFixed(4)),
        topGradeShare: Number(topGradeShare.toFixed(4)),
      };
    })
    .sort((a, b) => b.averageScore - a.averageScore)
    .slice(0, 10);
}

function sourceHealthFromDeals(deals: ScoredDeal[]): Record<SourceName, "ok" | "degraded" | "disabled"> {
  const health: Record<SourceName, "ok" | "degraded" | "disabled"> = {
    affordablehousing: "disabled",
    huddata: "disabled",
    demo: "disabled",
  };

  for (const deal of deals) {
    health[deal.source] = "ok";
  }

  return health;
}

export async function refreshDeals(query: Partial<SourceQuery> = {}): Promise<DealsDataset> {
  const resolvedQuery: SourceQuery = {
    markets: query.markets && query.markets.length > 0 ? query.markets : defaultQuery().markets,
    limitPerMarket: query.limitPerMarket ?? defaultQuery().limitPerMarket,
  };

  const results = await fetchListings(resolvedQuery);
  const flattened = results.flatMap((r) => r.listings);
  const scoredDeals = rankDeals(flattened.map(scoreDeal));

  const health: Record<SourceName, "ok" | "degraded" | "disabled"> = {
    ...sourceHealthFromDeals(scoredDeals),
  };

  for (const result of results) {
    health[result.source] = result.status;
  }

  const dataset: DealsDataset = {
    generatedAt: new Date().toISOString(),
    sourceHealth: health,
    deals: scoredDeals,
    topMarkets: summarizeMarkets(scoredDeals),
  };

  await writeDealsDataset(dataset);
  return dataset;
}

export async function getDealsDataset(): Promise<DealsDataset> {
  const existing = await readDealsDataset();
  if (existing && existing.deals.length > 0) {
    return existing;
  }

  return refreshDeals();
}

export function topDealsForEmail(dataset: DealsDataset, topMarketsCount = 10, topDealsCount = 10) {
  const topMarketSet = new Set(dataset.topMarkets.slice(0, topMarketsCount).map((m) => m.market));

  return dataset.deals
    .filter((d) => topMarketSet.has(d.market))
    .slice(0, topDealsCount);
}
