import type { RawListing, SourceQuery } from "./types";

const DEFAULT_MARKETS = [
  { city: "Atlanta", state: "GA", market: "Atlanta, GA" },
  { city: "Cleveland", state: "OH", market: "Cleveland, OH" },
  { city: "Detroit", state: "MI", market: "Detroit, MI" },
  { city: "Memphis", state: "TN", market: "Memphis, TN" },
  { city: "Indianapolis", state: "IN", market: "Indianapolis, IN" },
  { city: "Birmingham", state: "AL", market: "Birmingham, AL" },
  { city: "Kansas City", state: "MO", market: "Kansas City, MO" },
  { city: "St. Louis", state: "MO", market: "St. Louis, MO" },
  { city: "Baltimore", state: "MD", market: "Baltimore, MD" },
  { city: "Philadelphia", state: "PA", market: "Philadelphia, PA" },
];

function hashToRange(seed: string, min: number, max: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) % 100000;
  }
  const ratio = h / 100000;
  return min + (max - min) * ratio;
}

function toMarketEntry(market: string) {
  const parts = market.split(",").map((p) => p.trim());
  if (parts.length >= 2) {
    return { city: parts[0], state: parts[1], market: `${parts[0]}, ${parts[1]}` };
  }
  return { city: market, state: "NA", market };
}

export function generateDemoListings(query: SourceQuery): RawListing[] {
  const markets = query.markets.length > 0 ? query.markets.map(toMarketEntry) : DEFAULT_MARKETS;
  const listings: RawListing[] = [];

  for (const m of markets) {
    for (let i = 0; i < query.limitPerMarket; i += 1) {
      const seed = `${m.market}-${i}`;
      const askingPrice = Math.round(hashToRange(`${seed}-price`, 90000, 245000));
      const bedrooms = Math.round(hashToRange(`${seed}-bed`, 2, 4));
      const bathrooms = Number(hashToRange(`${seed}-bath`, 1, 2.5).toFixed(1));
      const estimatedMonthlyRent = Math.round(hashToRange(`${seed}-rent`, 1300, 2450));
      const hudPaymentStandard = Math.round(estimatedMonthlyRent * hashToRange(`${seed}-hud`, 0.93, 1.08));

      listings.push({
        id: `demo-${m.state}-${m.city.toLowerCase().replace(/\s+/g, "-")}-${i}`,
        source: "demo",
        sourceUrl: "https://www.huduser.gov/portal/datasets/fmr.html",
        market: m.market,
        city: m.city,
        state: m.state,
        zip: `${Math.round(hashToRange(`${seed}-zip`, 10000, 99999))}`,
        address: `${120 + i * 7} ${m.city} Ave`,
        bedrooms,
        bathrooms,
        sqft: Math.round(hashToRange(`${seed}-sqft`, 900, 1800)),
        askingPrice,
        estimatedMonthlyRent,
        hudPaymentStandard,
        vacancyRate: Number(hashToRange(`${seed}-vacancy`, 0.045, 0.14).toFixed(3)),
        propertyTaxRate: Number(hashToRange(`${seed}-tax`, 0.009, 0.021).toFixed(4)),
        insuranceAnnual: Math.round(hashToRange(`${seed}-ins`, 900, 1800)),
        maintenanceRatio: Number(hashToRange(`${seed}-maint`, 0.07, 0.13).toFixed(3)),
        neighborhoodGrade: Math.round(hashToRange(`${seed}-neigh`, 50, 90)),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return listings;
}
