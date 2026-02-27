export interface EstimateRequest {
  taskDescription: string;
  zipCode?: string;
}

export interface EstimateResponse {
  trade: string;
  task_category: string;
  complexity: "simple" | "moderate" | "complex" | "specialist";
  price_low: number;
  price_mid: number;
  price_high: number;
  inclusions: string[];
  exclusions: string[];
  red_flags: string[];
  search_terms: string[];
  regional_adjustment?: number;
  zip_code?: string | null;
  region?: string | null;
}

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
