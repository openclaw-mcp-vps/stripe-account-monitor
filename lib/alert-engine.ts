import { z } from "zod";
import { getRecentAlerts, getSetting, saveAlert, setSetting } from "@/lib/db";
import { sendAlertEmail } from "@/lib/email";
import type {
  AlertRecord,
  AlertSettingsConfig,
  MetricSnapshot,
  ThresholdConfig,
} from "@/types/metrics";

export const thresholdSchema = z.object({
  declineRateWarning: z.number().min(0).max(1),
  declineRateCritical: z.number().min(0).max(1),
  declineSpikeWarning: z.number().min(1),
  declineSpikeCritical: z.number().min(1),
  chargebackRateWarning: z.number().min(0).max(1),
  chargebackRateCritical: z.number().min(0).max(1),
  payoutFailureCritical: z.number().int().min(0),
  riskScoreWarning: z.number().min(0).max(100),
  riskScoreCritical: z.number().min(0).max(100),
});

export const defaultThresholds: ThresholdConfig = {
  declineRateWarning: 0.11,
  declineRateCritical: 0.17,
  declineSpikeWarning: 1.5,
  declineSpikeCritical: 2,
  chargebackRateWarning: 0.006,
  chargebackRateCritical: 0.01,
  payoutFailureCritical: 1,
  riskScoreWarning: 60,
  riskScoreCritical: 80,
};

const alertSettingsSchema = z.object({
  alertEmails: z.array(z.string().email()).default([]),
  webhookUrl: z.string().url().nullable().default(null),
  enableEmailAlerts: z.boolean().default(true),
  enableWebhookAlerts: z.boolean().default(false),
  thresholds: thresholdSchema.default(defaultThresholds),
});

export type AlertDraft = {
  type: string;
  severity: AlertRecord["severity"];
  message: string;
  payload: Record<string, unknown>;
};

type AlertSettingsPatch = Partial<Omit<AlertSettingsConfig, "thresholds">> & {
  thresholds?: Partial<ThresholdConfig>;
};

export function getAlertSettings(): AlertSettingsConfig {
  const raw = getSetting<AlertSettingsConfig>("alert_settings", {
    alertEmails: [],
    webhookUrl: null,
    enableEmailAlerts: true,
    enableWebhookAlerts: false,
    thresholds: defaultThresholds,
  });

  return alertSettingsSchema.parse({
    ...raw,
    thresholds: {
      ...defaultThresholds,
      ...(raw?.thresholds ?? {}),
    },
  });
}

export function updateAlertSettings(
  partial: AlertSettingsPatch,
): AlertSettingsConfig {
  const current = getAlertSettings();
  const next = alertSettingsSchema.parse({
    ...current,
    ...partial,
    thresholds: {
      ...current.thresholds,
      ...(partial.thresholds ?? {}),
    },
  });

  setSetting("alert_settings", next);
  return next;
}

export function evaluateSnapshot(
  snapshot: MetricSnapshot,
  baseline: { declineRate: number; chargebackRate: number },
  settings: AlertSettingsConfig,
): AlertDraft[] {
  const alerts: AlertDraft[] = [];
  const t = settings.thresholds;

  if (snapshot.declineRate >= t.declineRateCritical) {
    alerts.push({
      type: "decline_rate",
      severity: "critical",
      message: `Decline rate is ${(snapshot.declineRate * 100).toFixed(1)}%, above the critical threshold of ${(t.declineRateCritical * 100).toFixed(1)}%.`,
      payload: { snapshot, baseline },
    });
  } else if (snapshot.declineRate >= t.declineRateWarning) {
    alerts.push({
      type: "decline_rate",
      severity: "warning",
      message: `Decline rate is ${(snapshot.declineRate * 100).toFixed(1)}%, above the warning threshold of ${(t.declineRateWarning * 100).toFixed(1)}%.`,
      payload: { snapshot, baseline },
    });
  }

  if (snapshot.declineRateSpike >= t.declineSpikeCritical) {
    alerts.push({
      type: "decline_spike",
      severity: "critical",
      message: `Decline rate spiked to ${snapshot.declineRateSpike.toFixed(2)}x baseline (${(baseline.declineRate * 100).toFixed(1)}%).`,
      payload: { snapshot, baseline },
    });
  } else if (snapshot.declineRateSpike >= t.declineSpikeWarning) {
    alerts.push({
      type: "decline_spike",
      severity: "warning",
      message: `Decline rate increased to ${snapshot.declineRateSpike.toFixed(2)}x the recent baseline.`,
      payload: { snapshot, baseline },
    });
  }

  if (snapshot.chargebackRate >= t.chargebackRateCritical) {
    alerts.push({
      type: "chargeback_rate",
      severity: "critical",
      message: `Chargeback rate reached ${(snapshot.chargebackRate * 100).toFixed(2)}%, above the critical threshold of ${(t.chargebackRateCritical * 100).toFixed(2)}%.`,
      payload: { snapshot, baseline },
    });
  } else if (snapshot.chargebackRate >= t.chargebackRateWarning) {
    alerts.push({
      type: "chargeback_rate",
      severity: "warning",
      message: `Chargeback rate is ${(snapshot.chargebackRate * 100).toFixed(2)}%, above warning threshold.`,
      payload: { snapshot, baseline },
    });
  }

  if (snapshot.payoutFailures >= t.payoutFailureCritical) {
    alerts.push({
      type: "payout_failure",
      severity: "critical",
      message: `${snapshot.payoutFailures} payout failure event(s) detected in the monitoring window.`,
      payload: { snapshot, baseline },
    });
  }

  if (snapshot.riskScore >= t.riskScoreCritical) {
    alerts.push({
      type: "risk_score",
      severity: "critical",
      message: `Composite risk score is ${snapshot.riskScore.toFixed(0)}/100, indicating elevated shutdown risk.`,
      payload: { snapshot, baseline },
    });
  } else if (snapshot.riskScore >= t.riskScoreWarning) {
    alerts.push({
      type: "risk_score",
      severity: "warning",
      message: `Composite risk score is ${snapshot.riskScore.toFixed(0)}/100, indicating trend deterioration.`,
      payload: { snapshot, baseline },
    });
  }

  return dedupeAlerts(alerts);
}

function dedupeAlerts(alerts: AlertDraft[]): AlertDraft[] {
  const seen = new Set<string>();
  const unique: AlertDraft[] = [];

  for (const alert of alerts) {
    const key = `${alert.type}:${alert.severity}:${alert.message}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(alert);
  }

  return unique;
}

export async function persistAndDispatchAlerts(input: {
  alerts: AlertDraft[];
  snapshot: MetricSnapshot;
  settings: AlertSettingsConfig;
}): Promise<{ sentEmail: boolean; sentWebhook: boolean }> {
  if (input.alerts.length === 0) {
    return { sentEmail: false, sentWebhook: false };
  }

  const alertIds = input.alerts.map((alert) =>
    saveAlert({
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      payload: alert.payload,
    }),
  );

  const sentEmail = await maybeSendEmail(input.alerts, input.settings, input.snapshot, alertIds);
  const sentWebhook = await maybeSendWebhook(input.alerts, input.settings, input.snapshot, alertIds);

  return { sentEmail, sentWebhook };
}

async function maybeSendEmail(
  alerts: AlertDraft[],
  settings: AlertSettingsConfig,
  snapshot: MetricSnapshot,
  alertIds: number[],
): Promise<boolean> {
  if (!settings.enableEmailAlerts || settings.alertEmails.length === 0) {
    return false;
  }

  const highestSeverity = alerts.some((alert) => alert.severity === "critical")
    ? "Critical"
    : "Warning";

  const subject = `[Stripe Monitor] ${highestSeverity} account risk signal detected`;

  const bulletLines = alerts
    .map((alert) => `- [${alert.severity.toUpperCase()}] ${alert.message}`)
    .join("\n");

  const text = `${subject}\n\nCaptured: ${snapshot.capturedAt}\nRisk Score: ${snapshot.riskScore.toFixed(0)}\nDecline Rate: ${(snapshot.declineRate * 100).toFixed(2)}%\nChargeback Rate: ${(snapshot.chargebackRate * 100).toFixed(2)}%\n\nSignals:\n${bulletLines}\n\nAlert IDs: ${alertIds.join(", ")}`;

  const html = `
    <h2>${subject}</h2>
    <p><strong>Captured:</strong> ${snapshot.capturedAt}</p>
    <p><strong>Risk Score:</strong> ${snapshot.riskScore.toFixed(0)}</p>
    <p><strong>Decline Rate:</strong> ${(snapshot.declineRate * 100).toFixed(2)}%</p>
    <p><strong>Chargeback Rate:</strong> ${(snapshot.chargebackRate * 100).toFixed(2)}%</p>
    <h3>Signals</h3>
    <ul>${alerts.map((alert) => `<li><strong>${alert.severity.toUpperCase()}</strong> ${alert.message}</li>`).join("")}</ul>
    <p><small>Alert IDs: ${alertIds.join(", ")}</small></p>
  `;

  const result = await sendAlertEmail({
    to: settings.alertEmails,
    subject,
    text,
    html,
  });

  return result.sent;
}

async function maybeSendWebhook(
  alerts: AlertDraft[],
  settings: AlertSettingsConfig,
  snapshot: MetricSnapshot,
  alertIds: number[],
): Promise<boolean> {
  if (!settings.enableWebhookAlerts || !settings.webhookUrl) {
    return false;
  }

  const response = await fetch(settings.webhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      source: "stripe-account-monitor",
      alertIds,
      capturedAt: snapshot.capturedAt,
      riskScore: snapshot.riskScore,
      riskLevel: snapshot.riskLevel,
      alerts,
    }),
  });

  return response.ok;
}

export function listRecentAlerts(limit = 30): AlertRecord[] {
  return getRecentAlerts(limit);
}

export const updateAlertSettingsSchema = z.object({
  alertEmails: z.array(z.string().email()).optional(),
  webhookUrl: z.union([z.string().url(), z.literal(""), z.null()]).optional(),
  enableEmailAlerts: z.boolean().optional(),
  enableWebhookAlerts: z.boolean().optional(),
  thresholds: thresholdSchema.partial().optional(),
});
