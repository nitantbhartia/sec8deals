import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";

const RequestSchema = z.object({
  request_id: z.string().optional(),
  task_id: z.string().optional(),
  zip_code: z.string().regex(/^\d{5}$/).optional(),
  quoted_amount: z.number().positive(),
  final_paid_amount: z.number().positive().optional(),
  quote_status: z.enum(["pending", "accepted", "declined", "completed"]).optional(),
  quote_date: z.string().optional(),
  contractor_type: z.string().optional(),
  free_text_scope: z.string().max(500).optional(),
});

// In-memory store for V1 (no database)
// In production, this would write to a database
const quoteStore: Array<Record<string, unknown>> = [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const quote = RequestSchema.parse(body);

    const quoteRecord = {
      quote_id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ...quote,
      created_at: new Date().toISOString(),
    };

    quoteStore.push(quoteRecord);

    // Log for later analysis
    console.log("[QUOTE_SUBMITTED]", JSON.stringify(quoteRecord));

    return NextResponse.json({ status: "ok", quote_id: quoteRecord.quote_id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input. Please provide a valid quoted amount." },
        { status: 400 }
      );
    }

    console.error("Submit quote error:", error);
    return NextResponse.json(
      { error: "Failed to submit quote. Please try again." },
      { status: 500 }
    );
  }
}
