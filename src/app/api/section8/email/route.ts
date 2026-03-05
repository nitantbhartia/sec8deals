import { NextRequest, NextResponse } from "next/server";
import { getDealsDataset, topDealsForEmail } from "@/lib/section8/service";
import { sendDigestEmail } from "@/lib/section8/email";

export const runtime = "nodejs";

function authorized(request: NextRequest) {
  const secret = process.env.SECTION8_CRON_SECRET;
  if (!secret) {
    return true;
  }

  const provided = request.headers.get("x-cron-secret");
  return provided === secret;
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dataset = await getDealsDataset();
  const topDeals = topDealsForEmail(dataset, 10, 10);
  const result = await sendDigestEmail(topDeals);

  return NextResponse.json({
    generatedAt: dataset.generatedAt,
    dealsIncluded: topDeals.length,
    ...result,
  });
}
