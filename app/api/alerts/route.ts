import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAlertSettings,
  listRecentAlerts,
  updateAlertSettings,
  updateAlertSettingsSchema,
} from "@/lib/alert-engine";
import {
  collectAndAnalyzeMetrics,
  connectStripeSecretKey,
  ensureMonitorCronStarted,
  stripeConnectionState,
} from "@/lib/stripe-monitor";

export const runtime = "nodejs";

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update-settings"),
    data: updateAlertSettingsSchema,
  }),
  z.object({
    action: z.literal("run-check"),
  }),
  z.object({
    action: z.literal("connect-stripe"),
    secretKey: z.string().min(20).startsWith("sk_"),
  }),
]);

export async function GET() {
  try {
    ensureMonitorCronStarted();

    return NextResponse.json({
      settings: getAlertSettings(),
      alerts: listRecentAlerts(20),
      stripeConnection: stripeConnectionState(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch alert settings";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    ensureMonitorCronStarted();

    const body = requestSchema.parse(await request.json());

    if (body.action === "update-settings") {
      const next = updateAlertSettings({
        ...body.data,
        webhookUrl:
          body.data.webhookUrl === "" ? null : (body.data.webhookUrl ?? undefined),
      });

      return NextResponse.json({
        ok: true,
        settings: next,
      });
    }

    if (body.action === "connect-stripe") {
      await connectStripeSecretKey(body.secretKey.trim());

      return NextResponse.json({
        ok: true,
        stripeConnection: stripeConnectionState(),
      });
    }

    const result = await collectAndAnalyzeMetrics({
      source: "manual",
      force: true,
    });

    return NextResponse.json({
      ok: true,
      run: result,
      alerts: listRecentAlerts(20),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request payload", details: error.flatten() },
        { status: 400 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Failed to process alert action";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
