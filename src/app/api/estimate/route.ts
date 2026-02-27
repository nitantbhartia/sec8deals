import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { getEstimate } from "@/lib/ai";

const RequestSchema = z.object({
  taskDescription: z.string().min(3).max(500),
  zipCode: z
    .string()
    .regex(/^\d{5}$/)
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskDescription, zipCode } = RequestSchema.parse(body);

    const estimate = await getEstimate(taskDescription, zipCode);

    return NextResponse.json(estimate);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input. Please describe your task in at least 3 characters." },
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
