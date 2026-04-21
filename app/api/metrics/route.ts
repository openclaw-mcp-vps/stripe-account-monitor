import { NextRequest, NextResponse } from "next/server";
import { getMetricsApiResponse, ensureMonitorCronStarted } from "@/lib/stripe-monitor";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    ensureMonitorCronStarted();

    const refresh = request.nextUrl.searchParams.get("refresh") === "1";
    const metrics = await getMetricsApiResponse(refresh);

    return NextResponse.json(metrics);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch metrics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
