import { generateDemoListings } from "./demo-data";
import type { RawListing, SourceQuery, SourceRunResult } from "./types";

function numberOrFallback(value: unknown, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseExternalListing(row: Record<string, unknown>, sourceUrlField: string, source: "affordablehousing" | "huddata") {
  const city = String(row.city ?? row.City ?? "Unknown");
  const state = String(row.state ?? row.State ?? "NA");
  const id = String(row.id ?? row.listingId ?? `${source}-${city}-${state}-${Math.random().toString(36).slice(2, 7)}`);

  const askingPrice = numberOrFallback(row.askingPrice ?? row.price, 140000);
  const estimatedMonthlyRent = numberOrFallback(row.estimatedMonthlyRent ?? row.rent, 1700);
  const hudPaymentStandard = numberOrFallback(row.hudPaymentStandard ?? row.fmr ?? row.paymentStandard, Math.round(estimatedMonthlyRent * 1.02));

  const listing: RawListing = {
    id,
    source,
    sourceUrl: String(row[sourceUrlField] ?? row.url ?? ""),
    market: `${city}, ${state}`,
    city,
    state,
    zip: row.zip ? String(row.zip) : undefined,
    address: String(row.address ?? row.street ?? "Address not provided"),
    bedrooms: numberOrFallback(row.bedrooms ?? row.beds, 3),
    bathrooms: numberOrFallback(row.bathrooms ?? row.baths, 1.5),
    sqft: numberOrFallback(row.sqft ?? row.squareFeet, 1200),
    askingPrice,
    estimatedMonthlyRent,
    hudPaymentStandard,
    vacancyRate: numberOrFallback(row.vacancyRate, 0.08),
    propertyTaxRate: numberOrFallback(row.propertyTaxRate, 0.014),
    insuranceAnnual: numberOrFallback(row.insuranceAnnual, 1200),
    maintenanceRatio: numberOrFallback(row.maintenanceRatio, 0.1),
    neighborhoodGrade: numberOrFallback(row.neighborhoodGrade, 68),
    updatedAt: new Date().toISOString(),
  };

  if (!listing.sourceUrl) {
    listing.sourceUrl = source === "affordablehousing" ? "https://www.affordablehousing.com" : "https://www.huddata.us";
  }

  return listing;
}

async function fetchJson(url: string, headers: Record<string, string> = {}) {
  const response = await fetch(url, { headers, cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Fetch failed ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<unknown>;
}

async function fetchFromAffordableHousing(query: SourceQuery): Promise<SourceRunResult> {
  const baseUrl = process.env.AFFORDABLE_HOUSING_FEED_URL;
  if (!baseUrl) {
    return { source: "affordablehousing", listings: [], status: "disabled" };
  }

  try {
    const url = new URL(baseUrl);
    url.searchParams.set("markets", query.markets.join("|"));
    url.searchParams.set("limit", String(query.limitPerMarket * Math.max(1, query.markets.length)));

    const payload = await fetchJson(url.toString(), {
      Authorization: process.env.AFFORDABLE_HOUSING_FEED_TOKEN ?? "",
      "Content-Type": "application/json",
    });

    const rows = Array.isArray(payload) ? payload : (payload as { listings?: unknown[] }).listings ?? [];
    const listings = rows
      .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object"))
      .map((row) => parseExternalListing(row, "sourceUrl", "affordablehousing"));

    return { source: "affordablehousing", listings, status: listings.length > 0 ? "ok" : "degraded" };
  } catch {
    return { source: "affordablehousing", listings: [], status: "degraded" };
  }
}

async function fetchFromHudData(query: SourceQuery): Promise<SourceRunResult> {
  const baseUrl = process.env.HUDDATA_FEED_URL;
  if (!baseUrl) {
    return { source: "huddata", listings: [], status: "disabled" };
  }

  try {
    const url = new URL(baseUrl);
    url.searchParams.set("markets", query.markets.join("|"));
    url.searchParams.set("limit", String(query.limitPerMarket * Math.max(1, query.markets.length)));

    const payload = await fetchJson(url.toString(), {
      "x-api-key": process.env.HUDDATA_FEED_KEY ?? "",
      "Content-Type": "application/json",
    });

    const rows = Array.isArray(payload) ? payload : (payload as { data?: unknown[] }).data ?? [];
    const listings = rows
      .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object"))
      .map((row) => parseExternalListing(row, "listingUrl", "huddata"));

    return { source: "huddata", listings, status: listings.length > 0 ? "ok" : "degraded" };
  } catch {
    return { source: "huddata", listings: [], status: "degraded" };
  }
}

export async function fetchListings(query: SourceQuery): Promise<SourceRunResult[]> {
  const [affordableResult, huddataResult] = await Promise.all([
    fetchFromAffordableHousing(query),
    fetchFromHudData(query),
  ]);

  const externalListings = [...affordableResult.listings, ...huddataResult.listings];
  if (externalListings.length > 0) {
    return [affordableResult, huddataResult];
  }

  return [
    affordableResult,
    huddataResult,
    {
      source: "demo",
      listings: generateDemoListings(query),
      status: "ok",
    },
  ];
}
