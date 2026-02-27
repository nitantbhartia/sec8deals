// ─── Task Ontology ────────────────────────────────────────────────

export interface ClarificationRule {
  field: string;
  question: string;
  default: string | number | boolean;
}

export interface CanonicalTask {
  task_id: string;
  task_name: string;
  category: string;
  primary_trade: string;
  secondary_trade: string | null;
  description: string;
  difficulty_level: "easy" | "moderate" | "hard";
  variance_level: "low" | "medium" | "high";
  permit_flag: boolean;
  license_flag: boolean;
  default_visit_type: string;
  labor_recipe_id: string;
  materials_profile_id: string;
  pricing_status: "active" | "draft" | "deprecated";
  search_aliases: string[];
  common_user_phrasings: string[];
  clarification_rules: ClarificationRule[];
}

// ─── Labor Recipes ────────────────────────────────────────────────

export interface LaborRecipe {
  labor_recipe_id: string;
  recipe_version: number;
  task_id: string;
  base_hours_low: number;
  base_hours_mid: number;
  base_hours_high: number;
  helper_required: boolean;
  effective_start_date: string;
  notes: string;
}

// ─── Materials Profiles ───────────────────────────────────────────

export interface MaterialsProfile {
  materials_profile_id: string;
  profile_version: number;
  task_id: string;
  materials_low: number;
  materials_mid: number;
  materials_high: number;
  effective_start_date: string;
  notes: string;
}

// ─── Trade Rates ──────────────────────────────────────────────────

export interface TradeRate {
  id: string;
  rate_version: number;
  trade_name: string;
  geography_type: "national" | "region" | "metro" | "state";
  geography_code: string;
  wage_source: string;
  base_hourly_wage: number;
  labor_burden_multiplier: number;
  non_labor_overhead_per_billable_hour: number;
  target_margin_multiplier: number;
  local_market_multiplier: number;
  min_service_fee_low: number;
  min_service_fee_mid: number;
  min_service_fee_high: number;
  effective_start_date: string;
  notes: string;
}

// ─── Permit Rules ─────────────────────────────────────────────────

export interface PermitRule {
  id: string;
  task_id: string;
  state_code: string;
  permit_likelihood: "likely" | "unlikely" | "required";
  permit_cost_low: number;
  permit_cost_mid: number;
  permit_cost_high: number;
  notes: string;
}

// ─── Geography ────────────────────────────────────────────────────

export interface GeographyRegion {
  region_code: string;
  region_label: string;
  states: string[];
  zip_prefixes: string[];
}

export interface GeographyData {
  mapping_version: string;
  regions: GeographyRegion[];
}

// ─── Normalization (LLM output) ──────────────────────────────────

export interface NormalizationScope {
  units: number;
  severity: "minor" | "moderate" | "major";
  access_difficulty: "standard" | "difficult" | "very_difficult";
  materials_needed: string[];
  diagnostic_required: boolean;
  permit_required: boolean;
}

export interface NormalizationResult {
  task_id: string;
  task_label: string;
  primary_trade: string;
  problem_type: string;
  scope: NormalizationScope;
  location_requirements: {
    state_license_likely: boolean;
    city_permit_likely: boolean;
  };
  clarifications_needed: ClarificationRule[];
  normalization_confidence: number;
  reasoning_summary: string;
}

// ─── Pricing Engine Output ────────────────────────────────────────

export interface EstimateBand {
  low: number;
  mid: number;
  high: number;
  currency: string;
}

export interface ConfidenceResult {
  level: "high" | "medium" | "low";
  score: number;
  explanation: string;
}

export interface EstimateResponse {
  task_id: string;
  task_label: string;
  trade: string;
  estimate: EstimateBand;
  confidence: ConfidenceResult;
  included: string[];
  possible_extras: string[];
  assumptions: string[];
  red_flags: string[];
  search_terms: string[];
  geography_basis: "metro" | "region" | "state" | "national";
  geography_label: string;
  // Version metadata for reproducibility
  labor_recipe_version: number;
  materials_profile_version: number;
  trade_rate_version: number;
  geography_mapping_version: string;
}

// ─── Quote Check ──────────────────────────────────────────────────

export interface QuoteCheckResult {
  task_id: string;
  market_range: EstimateBand;
  quote_check: {
    quoted_amount: number;
    verdict: "low" | "fair" | "high";
    position: "below_range" | "within_range" | "above_range";
    explanation: string;
  };
  negotiation_tip: string;
}

// ─── Event Logging ────────────────────────────────────────────────

export interface EstimateRequestLog {
  request_id: string;
  created_at: string;
  raw_user_input: string;
  zip_code: string | null;
  state_code: string | null;
  region_code: string | null;
  task_id: string | null;
  normalization_confidence: number | null;
  estimate_confidence: string | null;
  estimate_low: number | null;
  estimate_mid: number | null;
  estimate_high: number | null;
  geography_basis: string;
  geography_mapping_version: string;
  labor_recipe_version: number | null;
  materials_profile_version: number | null;
  trade_rate_version: number | null;
}

export interface UserQuoteSubmission {
  request_id?: string;
  task_id?: string;
  zip_code?: string;
  quoted_amount: number;
  final_paid_amount?: number;
  quote_status?: string;
  quote_date?: string;
  contractor_type?: string;
  free_text_scope?: string;
}
