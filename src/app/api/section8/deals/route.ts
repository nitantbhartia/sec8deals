import { NextResponse } from "next/server";
import { getDealsDataset } from "@/lib/section8/service";

export const runtime = "nodejs";

export async function GET() {
  const dataset = await getDealsDataset();
  return NextResponse.json(dataset);
}
