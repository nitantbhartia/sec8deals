import type {
  CanonicalTask,
  LaborRecipe,
  MaterialsProfile,
  TradeRate,
  PermitRule,
  EstimateBand,
  NormalizationScope,
} from "./types";
import { lookupTradeRate, lookupGeography } from "./geography";
import canonicalTasks from "@/data/engine/canonical-tasks.json";
import laborRecipes from "@/data/engine/labor-recipes.json";
import materialsProfiles from "@/data/engine/materials-profiles.json";
import permitRules from "@/data/engine/permit-rules.json";

// ─── Data accessors ────────────────────────────────────────────────

export function getCanonicalTask(taskId: string): CanonicalTask | null {
  return (canonicalTasks as CanonicalTask[]).find((t) => t.task_id === taskId) ?? null;
}

export function getAllCanonicalTasks(): CanonicalTask[] {
  return (canonicalTasks as CanonicalTask[]).filter((t) => t.pricing_status === "active");
}

export function getLaborRecipe(recipeId: string): LaborRecipe | null {
  return (laborRecipes as LaborRecipe[]).find((r) => r.labor_recipe_id === recipeId) ?? null;
}

export function getMaterialsProfile(profileId: string): MaterialsProfile | null {
  return (materialsProfiles as MaterialsProfile[]).find(
    (p) => p.materials_profile_id === profileId
  ) ?? null;
}

export function getPermitRule(taskId: string): PermitRule | null {
  return (permitRules as PermitRule[]).find((r) => r.task_id === taskId) ?? null;
}

// ─── Invoice Rate Model ────────────────────────────────────────────
//
// loaded_labor_rate = base_hourly_wage * labor_burden_multiplier
// pre_margin_rate   = loaded_labor_rate + non_labor_overhead_per_billable_hour
// billable_rate     = pre_margin_rate * target_margin_multiplier * local_market_multiplier
//

function computeBillableRate(rate: TradeRate): number {
  const loadedLabor = rate.base_hourly_wage * rate.labor_burden_multiplier;
  const preMargin = loadedLabor + rate.non_labor_overhead_per_billable_hour;
  return preMargin * rate.target_margin_multiplier * rate.local_market_multiplier;
}

// ─── Price Computation ─────────────────────────────────────────────

export interface PricingInput {
  taskId: string;
  zipCode?: string;
  scope?: Partial<NormalizationScope>;
}

export interface PricingOutput {
  estimate: EstimateBand;
  included: string[];
  possible_extras: string[];
  assumptions: string[];
  geography_basis: "metro" | "region" | "state" | "national";
  geography_label: string;
  labor_recipe_version: number;
  materials_profile_version: number;
  trade_rate_version: number;
  geography_mapping_version: string;
}

function roundToNearest(value: number, nearest: number): number {
  return Math.round(value / nearest) * nearest;
}

export function computeEstimate(input: PricingInput): PricingOutput {
  const task = getCanonicalTask(input.taskId);
  if (!task) throw new Error(`Unknown task_id: ${input.taskId}`);

  const recipe = getLaborRecipe(task.labor_recipe_id);
  if (!recipe) throw new Error(`Missing labor recipe: ${task.labor_recipe_id}`);

  const materials = getMaterialsProfile(task.materials_profile_id);
  if (!materials) throw new Error(`Missing materials profile: ${task.materials_profile_id}`);

  // Resolve geography
  const geo = lookupGeography(input.zipCode);
  const tradeRate = lookupTradeRate(task.primary_trade, geo.region_code);

  const billableRate = computeBillableRate(tradeRate);

  // ─── Labor cost = hours * billable_rate ────────────────────────
  const laborLow = recipe.base_hours_low * billableRate;
  const laborMid = recipe.base_hours_mid * billableRate;
  const laborHigh = recipe.base_hours_high * billableRate;

  // Add helper cost if required (50% extra labor)
  const helperMultiplier = recipe.helper_required ? 1.5 : 1.0;
  const adjustedLaborLow = laborLow * helperMultiplier;
  const adjustedLaborMid = laborMid * helperMultiplier;
  const adjustedLaborHigh = laborHigh * helperMultiplier;

  // ─── Materials ─────────────────────────────────────────────────
  const matLow = materials.materials_low;
  const matMid = materials.materials_mid;
  const matHigh = materials.materials_high;

  // ─── Permit ────────────────────────────────────────────────────
  const permitRule = getPermitRule(input.taskId);
  let permitLow = 0, permitMid = 0, permitHigh = 0;
  if (permitRule && permitRule.permit_likelihood === "likely") {
    permitLow = permitRule.permit_cost_low;
    permitMid = permitRule.permit_cost_mid;
    permitHigh = permitRule.permit_cost_high;
  }

  // ─── Total = labor + materials + permit ─────────────────────────
  let totalLow = adjustedLaborLow + matLow + permitLow;
  let totalMid = adjustedLaborMid + matMid + permitMid;
  let totalHigh = adjustedLaborHigh + matHigh + permitHigh;

  // ─── Enforce minimum service fee ────────────────────────────────
  totalLow = Math.max(totalLow, tradeRate.min_service_fee_low);
  totalMid = Math.max(totalMid, tradeRate.min_service_fee_mid);
  totalHigh = Math.max(totalHigh, tradeRate.min_service_fee_high);

  // ─── Round to nearest $5 for cleaner display ────────────────────
  const roundTo = totalMid > 500 ? 25 : 5;
  totalLow = roundToNearest(totalLow, roundTo);
  totalMid = roundToNearest(totalMid, roundTo);
  totalHigh = roundToNearest(totalHigh, roundTo);

  // Ensure ordering: low <= mid <= high
  if (totalLow > totalMid) totalLow = totalMid;
  if (totalHigh < totalMid) totalHigh = totalMid;

  // ─── Build included/extras/assumptions ──────────────────────────
  const included = buildIncluded(task, recipe);
  const possible_extras = buildExtras(task, permitRule);
  const assumptions = buildAssumptions(task, recipe, input.scope);

  return {
    estimate: {
      low: totalLow,
      mid: totalMid,
      high: totalHigh,
      currency: "USD",
    },
    included,
    possible_extras,
    assumptions,
    geography_basis: geo.basis,
    geography_label: geo.label,
    labor_recipe_version: recipe.recipe_version,
    materials_profile_version: materials.profile_version,
    trade_rate_version: tradeRate.rate_version,
    geography_mapping_version: geo.mapping_version,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────

function buildIncluded(task: CanonicalTask, recipe: LaborRecipe): string[] {
  const items: string[] = ["Service call"];
  items.push(task.task_name);

  if (task.default_visit_type === "diagnostic" || task.default_visit_type === "repair") {
    items.push("Diagnosis");
  }

  items.push("Basic labor and small parts");

  if (recipe.helper_required) {
    items.push("Two-person crew");
  }

  return items;
}

function buildExtras(task: CanonicalTask, permitRule: PermitRule | null): string[] {
  const extras: string[] = [];

  if (task.permit_flag && (!permitRule || permitRule.permit_likelihood !== "likely")) {
    extras.push("Permit (may be required in your area)");
  }
  if (permitRule && permitRule.permit_likelihood === "likely") {
    extras.push("Permit (included in estimate)");
  }

  // Common extras by category
  if (task.category === "plumbing") {
    extras.push("Wall or floor repair if access is needed");
    extras.push("Code upgrades");
  } else if (task.category === "electrical") {
    extras.push("Drywall repair");
    extras.push("Panel upgrade if at capacity");
  } else if (task.category === "hvac") {
    extras.push("Refrigerant recharge");
    extras.push("Ductwork modifications");
  } else if (task.category === "painting") {
    extras.push("Wallpaper removal");
    extras.push("Ceiling painting");
  } else if (task.category === "roofing") {
    extras.push("Structural repair");
    extras.push("Interior damage repair");
  } else if (task.category === "flooring") {
    extras.push("Old floor removal");
    extras.push("Subfloor repair");
  } else if (task.category === "landscaping") {
    extras.push("Stump grinding");
    extras.push("Property survey");
  }

  extras.push("Emergency or after-hours scheduling");

  return extras;
}

function buildAssumptions(
  task: CanonicalTask,
  recipe: LaborRecipe,
  scope?: Partial<NormalizationScope>
): string[] {
  const assumptions: string[] = [];
  const units = scope?.units ?? 1;
  const access = scope?.access_difficulty ?? "standard";

  if (units === 1) {
    assumptions.push(`One ${task.task_name.toLowerCase()}`);
  } else {
    assumptions.push(`${units} units`);
  }

  if (access === "standard") {
    assumptions.push("Standard access (no unusual difficulty)");
  }

  if (!task.permit_flag) {
    assumptions.push("No permit required");
  }

  if (recipe.helper_required) {
    assumptions.push("Two-person job (helper included)");
  }

  assumptions.push("No hidden damage or complications");

  return assumptions;
}
