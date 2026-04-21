import { CronJob } from "cron";
import Stripe from "stripe";
import {
  evaluateSnapshot,
  getAlertSettings,
  persistAndDispatchAlerts,
} from "@/lib/alert-engine";
import {
  getLatestMetricSnapshot,
  getMetricSnapshots,
  getSetting,
  saveMetricSnapshot,
  setSetting,
} from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/security";
import type { MetricSnapshot, MetricsApiResponse } from "@/types/metrics";

const MONITOR_WINDOW_SECONDS = 24 * 60 * 60;
const STALE_SECONDS = 15 * 60;
const STRIPE_KEY_SETTING = "stripe_key_encrypted";
const STRIPE_CONNECTED_AT_SETTING = "stripe_connected_at";

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function computeRisk(input: {
  declineRate: number;
  chargebackRate: number;
  payoutFailures: number;
  declineSpike: number;
  chargebackSpike: number;
}): { score: number; level: MetricSnapshot["riskLevel"] } {
  let score = 0;

  score += Math.min(45, input.declineRate * 260);
  score += Math.min(30, input.chargebackRate * 3500);
  score += Math.min(20, Math.max(0, input.declineSpike - 1) * 30);
  score += Math.min(10, Math.max(0, input.chargebackSpike - 1) * 20);

  if (input.payoutFailures > 0) {
    score += Math.min(40, 18 + input.payoutFailures * 9);
  }

  const normalized = Math.min(100, Math.round(score));

  if (normalized >= 75) {
    return { score: normalized, level: "critical" };
  }

  if (normalized >= 45) {
    return { score: normalized, level: "elevated" };
  }

  return { score: normalized, level: "healthy" };
}

async function getStripeSecretKey(): Promise<string | null> {
  const encrypted = getSetting<string | null>(STRIPE_KEY_SETTING, null);

  if (encrypted) {
    try {
      return await decryptSecret(encrypted);
    } catch {
      return null;
    }
  }

  return process.env.STRIPE_SECRET_KEY ?? null;
}

export async function connectStripeSecretKey(secretKey: string): Promise<void> {
  const stripe = new Stripe(secretKey);

  // Validate credentials with a low-cost request.
  await stripe.balance.retrieve();

  const encrypted = await encryptSecret(secretKey);
  setSetting(STRIPE_KEY_SETTING, encrypted);
  setSetting(STRIPE_CONNECTED_AT_SETTING, new Date().toISOString());
}

export function stripeConnectionState(): {
  connected: boolean;
  connectedAt: string | null;
} {
  const connectedAt = getSetting<string | null>(STRIPE_CONNECTED_AT_SETTING, null);
  const fromEnv = Boolean(process.env.STRIPE_SECRET_KEY);

  return {
    connected: fromEnv || Boolean(connectedAt),
    connectedAt,
  };
}

async function fetchCurrentWindowMetrics(secretKey: string): Promise<{
  attempts: number;
  successful: number;
  declined: number;
  disputeCount: number;
  disputeAmountCents: number;
  payoutFailures: number;
}> {
  const stripe = new Stripe(secretKey);
  const fromUnix = Math.floor(Date.now() / 1000) - MONITOR_WINDOW_SECONDS;

  const charges = await stripe.charges
    .list({
      created: { gte: fromUnix },
      limit: 100,
    })
    .autoPagingToArray({ limit: 1000 });

  const disputes = await stripe.disputes
    .list({
      created: { gte: fromUnix },
      limit: 100,
    })
    .autoPagingToArray({ limit: 500 });

  const payoutFailureEvents = await stripe.events
    .list({
      type: "payout.failed",
      created: { gte: fromUnix },
      limit: 100,
    })
    .autoPagingToArray({ limit: 200 });

  const successful = charges.filter((charge) => charge.status === "succeeded").length;
  const declined = charges.filter((charge) => {
    if (charge.status === "failed") {
      return true;
    }

    return charge.outcome?.type === "issuer_declined";
  }).length;

  return {
    attempts: charges.length,
    successful,
    declined,
    disputeCount: disputes.length,
    disputeAmountCents: disputes.reduce((sum, dispute) => sum + dispute.amount, 0),
    payoutFailures: payoutFailureEvents.length,
  };
}

function mapTrendDirection(
  latest: MetricSnapshot | null,
  baselineDeclineRate: number,
): "up" | "down" | "flat" {
  if (!latest) {
    return "flat";
  }

  const delta = latest.declineRate - baselineDeclineRate;

  if (Math.abs(delta) < 0.005) {
    return "flat";
  }

  return delta > 0 ? "up" : "down";
}

export async function collectAndAnalyzeMetrics(input?: {
  source?: "manual" | "auto" | "cron";
  force?: boolean;
}): Promise<{
  snapshot: MetricSnapshot;
  alertsTriggered: number;
  baselineDeclineRate: number;
  baselineChargebackRate: number;
}> {
  const latest = getLatestMetricSnapshot();

  if (!input?.force && latest) {
    const lastCapturedMs = Date.parse(latest.capturedAt);
    const ageSeconds = Number.isNaN(lastCapturedMs)
      ? Number.MAX_SAFE_INTEGER
      : (Date.now() - lastCapturedMs) / 1000;

    if (ageSeconds < 4 * 60) {
      return {
        snapshot: latest,
        alertsTriggered: 0,
        baselineDeclineRate: latest.declineRate,
        baselineChargebackRate: latest.chargebackRate,
      };
    }
  }

  const secretKey = await getStripeSecretKey();
  if (!secretKey) {
    throw new Error(
      "Stripe key missing. Connect a Stripe secret key in the dashboard settings.",
    );
  }

  const historical = getMetricSnapshots(30);
  const baselineDeclineRate = average(historical.map((item) => item.declineRate));
  const baselineChargebackRate = average(historical.map((item) => item.chargebackRate));

  const raw = await fetchCurrentWindowMetrics(secretKey);

  const declineRate =
    raw.attempts === 0 ? 0 : Number((raw.declined / raw.attempts).toFixed(6));
  const chargebackRate =
    raw.successful === 0 ? 0 : Number((raw.disputeCount / raw.successful).toFixed(6));

  const declineRateSpike =
    baselineDeclineRate > 0
      ? Number((declineRate / baselineDeclineRate).toFixed(3))
      : 1;

  const chargebackRateSpike =
    baselineChargebackRate > 0
      ? Number((chargebackRate / baselineChargebackRate).toFixed(3))
      : 1;

  const risk = computeRisk({
    declineRate,
    chargebackRate,
    payoutFailures: raw.payoutFailures,
    declineSpike: declineRateSpike,
    chargebackSpike: chargebackRateSpike,
  });

  const snapshot: MetricSnapshot = {
    capturedAt: new Date().toISOString(),
    attempts: raw.attempts,
    successful: raw.successful,
    declined: raw.declined,
    disputeCount: raw.disputeCount,
    disputeAmountCents: raw.disputeAmountCents,
    payoutFailures: raw.payoutFailures,
    declineRate,
    chargebackRate,
    declineRateSpike,
    chargebackRateSpike,
    riskScore: risk.score,
    riskLevel: risk.level,
    note: `source=${input?.source ?? "auto"}; baseline_decline=${baselineDeclineRate.toFixed(4)}; baseline_chargeback=${baselineChargebackRate.toFixed(4)}`,
  };

  const insertedId = saveMetricSnapshot(snapshot);
  snapshot.id = insertedId;

  const settings = getAlertSettings();
  const alerts = evaluateSnapshot(
    snapshot,
    {
      declineRate: baselineDeclineRate,
      chargebackRate: baselineChargebackRate,
    },
    settings,
  );

  await persistAndDispatchAlerts({
    alerts,
    snapshot,
    settings,
  });

  return {
    snapshot,
    alertsTriggered: alerts.length,
    baselineDeclineRate,
    baselineChargebackRate,
  };
}

export async function getMetricsApiResponse(
  refresh: boolean,
): Promise<MetricsApiResponse> {
  const latest = getLatestMetricSnapshot();

  const stale = !latest
    ? true
    : (Date.now() - Date.parse(latest.capturedAt)) / 1000 > STALE_SECONDS;

  if (refresh || stale) {
    await collectAndAnalyzeMetrics({
      source: refresh ? "manual" : "auto",
      force: refresh,
    });
  }

  const historyDesc = getMetricSnapshots(96);
  const history = [...historyDesc].reverse();
  const current = history.length > 0 ? history[history.length - 1] : null;

  const baselineDeclineRate = average(
    history.slice(0, Math.max(0, history.length - 1)).map((item) => item.declineRate),
  );

  const baselineChargebackRate = average(
    history
      .slice(0, Math.max(0, history.length - 1))
      .map((item) => item.chargebackRate),
  );

  return {
    summary: {
      latest: current,
      baselineDeclineRate,
      baselineChargebackRate,
      trendDirection: mapTrendDirection(current, baselineDeclineRate),
      generatedAt: new Date().toISOString(),
    },
    history,
  };
}

declare global {
  var __stripeMonitorCronStarted: boolean | undefined;
  var __stripeMonitorCronJob: CronJob | undefined;
}

export function ensureMonitorCronStarted(): void {
  if (globalThis.__stripeMonitorCronStarted) {
    return;
  }

  if (process.env.DISABLE_MONITOR_CRON === "true") {
    return;
  }

  const job = new CronJob("*/15 * * * *", () => {
    void collectAndAnalyzeMetrics({ source: "cron", force: true }).catch((error) => {
      console.error("stripe monitor cron error", error);
    });
  });

  job.start();
  globalThis.__stripeMonitorCronJob = job;
  globalThis.__stripeMonitorCronStarted = true;
}
