import type { ConfidenceResult, CanonicalTask, NormalizationResult } from "./types";

interface ConfidenceInput {
  normalization: NormalizationResult;
  task: CanonicalTask | null;
  geographyBasis: "metro" | "region" | "state" | "national";
  hasZipCode: boolean;
}

/**
 * Compute confidence score using weighted dimensions:
 *   0.30 * normalization_confidence
 * + 0.20 * scope_completeness_score
 * + 0.20 * geography_coverage_score
 * + 0.15 * task_variance_score
 * + 0.15 * quote_density_score (static for v1)
 */
export function computeConfidence(input: ConfidenceInput): ConfidenceResult {
  const { normalization, task, geographyBasis, hasZipCode } = input;

  // 1. Normalization confidence (0-1) — from LLM
  const normScore = normalization.normalization_confidence;

  // 2. Scope completeness (0-1)
  let scopeScore = 0.8; // Base: we have a task match
  if (normalization.clarifications_needed.length > 0) {
    scopeScore -= 0.15 * Math.min(normalization.clarifications_needed.length, 3);
  }
  if (normalization.task_id === "unknown_task") {
    scopeScore = 0.1;
  }

  // 3. Geography coverage (0-1)
  let geoScore: number;
  switch (geographyBasis) {
    case "metro":
      geoScore = 1.0;
      break;
    case "region":
      geoScore = 0.8;
      break;
    case "state":
      geoScore = 0.6;
      break;
    case "national":
      geoScore = hasZipCode ? 0.3 : 0.4; // Worse if they gave ZIP but we couldn't match
      break;
    default:
      geoScore = 0.4;
  }

  // 4. Task variance (0-1) — lower variance = higher score
  let varianceScore: number;
  if (task) {
    switch (task.variance_level) {
      case "low":
        varianceScore = 0.9;
        break;
      case "medium":
        varianceScore = 0.6;
        break;
      case "high":
        varianceScore = 0.3;
        break;
      default:
        varianceScore = 0.5;
    }
  } else {
    varianceScore = 0.2;
  }

  // 5. Quote density (0-1) — static 0.3 for v1 (no first-party data yet)
  const quoteDensityScore = 0.3;

  // Weighted sum
  const score =
    0.3 * normScore +
    0.2 * scopeScore +
    0.2 * geoScore +
    0.15 * varianceScore +
    0.15 * quoteDensityScore;

  // Map to level
  let level: "high" | "medium" | "low";
  if (score >= 0.7) level = "high";
  else if (score >= 0.45) level = "medium";
  else level = "low";

  // Build explanation
  const explanation = buildExplanation(level, geographyBasis, task, normalization);

  return { level, score: Math.round(score * 100) / 100, explanation };
}

function buildExplanation(
  level: "high" | "medium" | "low",
  geographyBasis: string,
  task: CanonicalTask | null,
  normalization: NormalizationResult
): string {
  const parts: string[] = [];

  if (geographyBasis === "region") {
    parts.push("Based on regional pricing data for this area.");
  } else if (geographyBasis === "national") {
    parts.push("Based on national average pricing.");
  } else if (geographyBasis === "metro") {
    parts.push("Based on metro-level pricing for your area.");
  }

  if (task?.variance_level === "high") {
    parts.push("This task has high scope variability — final cost depends heavily on specifics.");
  } else if (task?.variance_level === "medium") {
    parts.push("Final cost may vary based on access difficulty or hidden conditions.");
  }

  if (normalization.clarifications_needed.length > 0) {
    parts.push("Answering follow-up questions could improve accuracy.");
  }

  if (level === "low") {
    parts.push("This estimate is directional — we recommend getting 2-3 quotes.");
  }

  return parts.join(" ");
}
