import type { TradeRate, GeographyData } from "./types";
import geographyData from "@/data/engine/geography.json";
import tradeRates from "@/data/engine/trade-rates.json";

const geo = geographyData as GeographyData;
const rates = tradeRates as TradeRate[];

export interface GeographyLookup {
  region_code: string | null;
  region_label: string | null;
  basis: "region" | "state" | "national";
  label: string;
  mapping_version: string;
}

/**
 * Map a ZIP code to a geographic region.
 * Hierarchy: region → state → national fallback.
 */
export function lookupGeography(zipCode?: string): GeographyLookup {
  if (!zipCode || zipCode.length < 3) {
    return {
      region_code: null,
      region_label: null,
      basis: "national",
      label: "National average",
      mapping_version: geo.mapping_version,
    };
  }

  const prefix = zipCode.substring(0, 3);

  // Try ZIP prefix match first
  for (const region of geo.regions) {
    if (region.zip_prefixes.includes(prefix)) {
      return {
        region_code: region.region_code,
        region_label: region.region_label,
        basis: "region",
        label: region.region_label,
        mapping_version: geo.mapping_version,
      };
    }
  }

  // No match → national fallback
  return {
    region_code: null,
    region_label: null,
    basis: "national",
    label: "National average (ZIP not in regional database)",
    mapping_version: geo.mapping_version,
  };
}

/**
 * Look up trade rate for a given trade and region.
 * Tries region-specific rate first, falls back to national.
 */
export function lookupTradeRate(tradeName: string, regionCode: string | null): TradeRate {
  const tradeNameLower = tradeName.toLowerCase();

  // Try region-specific rate
  if (regionCode) {
    const regionalRate = rates.find(
      (r) =>
        r.trade_name.toLowerCase() === tradeNameLower &&
        r.geography_type === "region" &&
        r.geography_code === regionCode
    );
    if (regionalRate) return regionalRate;
  }

  // Fall back to national
  const nationalRate = rates.find(
    (r) =>
      r.trade_name.toLowerCase() === tradeNameLower &&
      r.geography_type === "national"
  );
  if (nationalRate) return nationalRate;

  // Ultimate fallback: handyman national
  const fallback = rates.find(
    (r) => r.trade_name === "handyman" && r.geography_type === "national"
  );
  if (fallback) return fallback;

  throw new Error(`No trade rate found for trade: ${tradeName}`);
}
