import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import {
  normalizeTask,
  computeEstimate,
  getCanonicalTask,
  computeConfidence,
} from "@/lib/engine";
import type { EstimateResponse, CanonicalTask } from "@/lib/engine";

// Support both input forms:
// 1. Raw text input (requires normalization)
// 2. Pre-normalized task_id (skips normalization)
const TextInputSchema = z.object({
  text: z.string().min(3).max(500),
  zip_code: z.string().regex(/^\d{5}$/).optional(),
});

const TaskIdInputSchema = z.object({
  task_id: z.string(),
  zip_code: z.string().regex(/^\d{5}$/).optional(),
  scope: z
    .object({
      units: z.number().optional(),
      severity: z.enum(["minor", "moderate", "major"]).optional(),
      access_difficulty: z.enum(["standard", "difficult", "very_difficult"]).optional(),
    })
    .optional(),
});

// Legacy format for backwards compatibility
const LegacyInputSchema = z.object({
  taskDescription: z.string().min(3).max(500),
  zipCode: z.string().regex(/^\d{5}$/).optional(),
});

const RequestSchema = z.union([TextInputSchema, TaskIdInputSchema, LegacyInputSchema]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = RequestSchema.parse(body);

    let taskId: string;
    let taskLabel: string;
    let trade: string;
    let searchTerms: string[] = [];
    let normalizationConfidence = 1.0;
    let clarificationsNeeded: Array<{
      field: string;
      question: string;
      default: string | number | boolean;
    }> = [];
    let scope:
      | {
          units?: number;
          severity?: "minor" | "moderate" | "major";
          access_difficulty?: "standard" | "difficult" | "very_difficult";
        }
      | undefined;
    let zipCode: string | undefined;

    if ("task_id" in input) {
      // Pre-normalized path
      taskId = input.task_id;
      zipCode = input.zip_code;
      scope = input.scope;

      const task = getCanonicalTask(taskId);
      if (!task) {
        return NextResponse.json(
          { error: `Unknown task_id: ${taskId}` },
          { status: 400 }
        );
      }
      taskLabel = task.task_name;
      trade = task.primary_trade;
      searchTerms = task.search_aliases.slice(0, 3);
    } else {
      // Raw text path — needs normalization
      let text: string;
      if ("text" in input) {
        text = input.text;
        zipCode = input.zip_code;
      } else {
        text = input.taskDescription;
        zipCode = input.zipCode;
      }

      const normalization = await normalizeTask(text, zipCode);

      if (normalization.task_id === "unknown_task") {
        return NextResponse.json(
          {
            error:
              "We couldn't identify the specific task. Could you describe it differently?",
            clarifications_needed: normalization.clarifications_needed,
            reasoning: normalization.reasoning_summary,
          },
          { status: 422 }
        );
      }

      taskId = normalization.task_id;
      taskLabel = normalization.task_label;
      trade = normalization.primary_trade;
      normalizationConfidence = normalization.normalization_confidence;
      clarificationsNeeded = normalization.clarifications_needed;
      scope = normalization.scope;

      const task = getCanonicalTask(taskId);
      if (task) {
        searchTerms = task.search_aliases.slice(0, 3);
      }
    }

    // Load task for metadata
    const task = getCanonicalTask(taskId);

    // Compute deterministic estimate
    const pricing = computeEstimate({
      taskId,
      zipCode,
      scope,
    });

    // Compute confidence
    const normResult = {
      task_id: taskId,
      task_label: taskLabel,
      primary_trade: trade,
      problem_type: task?.default_visit_type ?? "service",
      scope: {
        units: scope?.units ?? 1,
        severity: (scope?.severity ?? "minor") as "minor" | "moderate" | "major",
        access_difficulty: (scope?.access_difficulty ?? "standard") as
          | "standard"
          | "difficult"
          | "very_difficult",
        materials_needed: [] as string[],
        diagnostic_required: false,
        permit_required: task?.permit_flag ?? false,
      },
      location_requirements: {
        state_license_likely: task?.license_flag ?? false,
        city_permit_likely: task?.permit_flag ?? false,
      },
      clarifications_needed: clarificationsNeeded,
      normalization_confidence: normalizationConfidence,
      reasoning_summary: "",
    };

    const confidence = computeConfidence({
      normalization: normResult,
      task: task ?? null,
      geographyBasis: pricing.geography_basis,
      hasZipCode: !!zipCode,
    });

    // Build red flags
    const redFlags = buildRedFlags(task, pricing.estimate.low);

    const response: EstimateResponse = {
      task_id: taskId,
      task_label: taskLabel,
      trade,
      estimate: pricing.estimate,
      confidence,
      included: pricing.included,
      possible_extras: pricing.possible_extras,
      assumptions: pricing.assumptions,
      red_flags: redFlags,
      search_terms: searchTerms,
      geography_basis: pricing.geography_basis,
      geography_label: pricing.geography_label,
      labor_recipe_version: pricing.labor_recipe_version,
      materials_profile_version: pricing.materials_profile_version,
      trade_rate_version: pricing.trade_rate_version,
      geography_mapping_version: pricing.geography_mapping_version,
    };

    // Log the estimate request (for future calibration)
    console.log(
      "[ESTIMATE_REQUEST]",
      JSON.stringify({
        timestamp: new Date().toISOString(),
        task_id: taskId,
        zip_code: zipCode ?? null,
        estimate_low: pricing.estimate.low,
        estimate_mid: pricing.estimate.mid,
        estimate_high: pricing.estimate.high,
        confidence: confidence.level,
        geography_basis: pricing.geography_basis,
      })
    );

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error:
            "Invalid input. Please describe your task in at least 3 characters.",
        },
        { status: 400 }
      );
    }

    console.error("Estimate API error:", error);
    return NextResponse.json(
      { error: "Failed to generate estimate. Please try again." },
      { status: 500 }
    );
  }
}

function buildRedFlags(
  task: CanonicalTask | null,
  estimateLow: number
): string[] {
  const flags: string[] = [];

  if (task?.license_flag) {
    flags.push(
      `Verify the ${task.primary_trade} is properly licensed in your state`
    );
  }

  if (
    task?.primary_trade === "plumber" ||
    task?.primary_trade === "electrician"
  ) {
    flags.push("Ask for proof of insurance before work begins");
  }

  if (estimateLow > 0) {
    const tooLow = Math.round(estimateLow * 0.4);
    if (tooLow > 25) {
      flags.push(
        `Be cautious of quotes under $${tooLow} — may indicate cut corners`
      );
    }
  }

  flags.push("Get at least 2-3 quotes before committing");

  return flags;
}
