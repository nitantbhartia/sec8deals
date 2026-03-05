import { NextRequest, NextResponse } from "next/server";
import { refreshDeals } from "@/lib/section8/service";

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

  let body: { markets?: string[]; limitPerMarket?: number } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const dataset = await refreshDeals({
    markets: body.markets,
    limitPerMarket: body.limitPerMarket,
  });

  return NextResponse.json({
    generatedAt: dataset.generatedAt,
    dealCount: dataset.deals.length,
    topMarkets: dataset.topMarkets,
    sourceHealth: dataset.sourceHealth,
  });
}
