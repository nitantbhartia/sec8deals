import regionalMultipliers from "@/data/regional-multipliers.json";

export function getRegionalMultiplier(zipCode: string): number {
  const prefix = zipCode.substring(0, 3);
  for (const region of regionalMultipliers) {
    if (region.zip_prefixes.includes(prefix)) {
      return region.multiplier;
    }
  }
  return 1.0;
}

export function getRegionName(zipCode: string): string {
  const prefix = zipCode.substring(0, 3);
  for (const region of regionalMultipliers) {
    if (region.zip_prefixes.includes(prefix)) {
      return region.region;
    }
  }
  return "National Average";
}

export function adjustPriceForRegion(
  baseLow: number,
  baseMid: number,
  baseHigh: number,
  zipCode?: string
): { low: number; mid: number; high: number; multiplier: number } {
  const multiplier = zipCode ? getRegionalMultiplier(zipCode) : 1.0;
  return {
    low: Math.round((baseLow * multiplier) / 25) * 25,
    mid: Math.round((baseMid * multiplier) / 25) * 25,
    high: Math.round((baseHigh * multiplier) / 25) * 25,
    multiplier,
  };
}
