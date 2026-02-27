import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { normalizeTask } from "@/lib/engine";

const RequestSchema = z.object({
  text: z.string().min(3).max(500),
  zip_code: z.string().regex(/^\d{5}$/).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, zip_code } = RequestSchema.parse(body);

    const result = await normalizeTask(text, zip_code);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input. Please describe your task (3-500 characters)." },
        { status: 400 }
      );
    }

    console.error("Normalize task error:", error);
    return NextResponse.json(
      { error: "Failed to normalize task. Please try again." },
      { status: 500 }
    );
  }
}
