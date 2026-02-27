// Re-export engine types used by the frontend
export type {
  EstimateResponse,
  EstimateBand,
  ConfidenceResult,
  QuoteCheckResult,
} from "./engine/types";

// Legacy types kept for cost-guide pages (unchanged)
export interface TaskPricing {
  task: string;
  aliases: string[];
  base_low: number;
  base_mid: number;
  base_high: number;
  unit: "per_job" | "per_hour" | "per_sqft" | "per_linear_ft";
  typical_duration_hours?: number;
  common_inclusions: string[];
  common_exclusions: string[];
  common_red_flags: string[];
}

export interface TradePricingData {
  trade: string;
  display_name: string;
  categories: {
    category: string;
    tasks: TaskPricing[];
  }[];
}

export interface RegionalMultiplier {
  region: string;
  states: string[];
  zip_prefixes: string[];
  multiplier: number;
}

export interface CostGuide {
  slug: string;
  title: string;
  meta_description: string;
  trade: string;
  hero_summary: string;
  price_range: {
    low: number;
    mid: number;
    high: number;
    unit: string;
  };
  sections: { heading: string; content: string }[];
  faq: { question: string; answer: string }[];
  related_guides: string[];
  last_updated: string;
}
