import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { normalizeTask, computeEstimate, getCanonicalTask, computeConfidence } from "@/lib/engine";
import type { QuoteCheckResult } from "@/lib/engine";

const RequestSchema = z.object({
  text: z.string().min(3).max(500),
  zip_code: z.string().regex(/^\d{5}$/).optional(),
  quoted_amount: z.number().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, zip_code, quoted_amount } = RequestSchema.parse(body);

    // Normalize the task
    const normalization = await normalizeTask(text, zip_code);

    if (normalization.task_id === "unknown_task") {
      return NextResponse.json(
        { error: "Could not identify the task. Please describe it more specifically." },
        { status: 422 }
      );
    }

    // Compute estimate
    const pricing = computeEstimate({
      taskId: normalization.task_id,
      zipCode: zip_code,
      scope: normalization.scope,
    });

    const { low, mid, high } = pricing.estimate;

    // Determine verdict
    let verdict: "low" | "fair" | "high";
    let position: "below_range" | "within_range" | "above_range";

    if (quoted_amount < low) {
      verdict = "low";
      position = "below_range";
    } else if (quoted_amount > high) {
      verdict = "high";
      position = "above_range";
    } else {
      verdict = "fair";
      position = "within_range";
    }

    // Build explanation
    let explanation: string;
    if (verdict === "low") {
      explanation = `This quote is below the expected range ($${low}-$${high}). While it could be a good deal, verify the contractor's license, insurance, and whether the quote covers all expected work.`;
    } else if (verdict === "high") {
      explanation = `This quote is above the expected range ($${low}-$${high}). It may include premium materials, difficult access, or additional scope not captured in a standard estimate.`;
    } else {
      explanation = `This quote falls within the expected range ($${low}-$${high}) for this task in your area.`;
    }

    // Build negotiation tip
    let negotiation_tip: string;
    if (verdict === "high") {
      negotiation_tip = `Ask the contractor to itemize labor, materials, and any extras. Compare with 1-2 other quotes. Ask whether premium materials or unusual conditions justify the higher price.`;
    } else if (verdict === "low") {
      negotiation_tip = `Confirm the quote includes all expected work: ${pricing.included.join(", ")}. Ask about their license, insurance, and warranty.`;
    } else {
      negotiation_tip = `This is a fair quote. Before committing, confirm what's included and ask about their warranty and timeline.`;
    }

    const result: QuoteCheckResult = {
      task_id: normalization.task_id,
      market_range: pricing.estimate,
      quote_check: {
        quoted_amount,
        verdict,
        position,
        explanation,
      },
      negotiation_tip,
    };

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input. Please provide task description and quoted amount." },
        { status: 400 }
      );
    }

    console.error("Check quote error:", error);
    return NextResponse.json(
      { error: "Failed to check quote. Please try again." },
      { status: 500 }
    );
  }
}
