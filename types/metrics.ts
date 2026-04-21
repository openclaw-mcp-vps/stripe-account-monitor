export type RiskLevel = "healthy" | "elevated" | "critical";

export type AlertSeverity = "warning" | "critical";

export interface MetricSnapshot {
  id?: number;
  capturedAt: string;
  attempts: number;
  successful: number;
  declined: number;
  disputeCount: number;
  disputeAmountCents: number;
  payoutFailures: number;
  declineRate: number;
  chargebackRate: number;
  declineRateSpike: number;
  chargebackRateSpike: number;
  riskScore: number;
  riskLevel: RiskLevel;
  note: string;
}

export interface ThresholdConfig {
  declineRateWarning: number;
  declineRateCritical: number;
  declineSpikeWarning: number;
  declineSpikeCritical: number;
  chargebackRateWarning: number;
  chargebackRateCritical: number;
  payoutFailureCritical: number;
  riskScoreWarning: number;
  riskScoreCritical: number;
}

export interface AlertSettingsConfig {
  alertEmails: string[];
  webhookUrl: string | null;
  enableEmailAlerts: boolean;
  enableWebhookAlerts: boolean;
  thresholds: ThresholdConfig;
}

export interface AlertRecord {
  id: number;
  type: string;
  severity: AlertSeverity;
  message: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface MetricsSummary {
  latest: MetricSnapshot | null;
  baselineDeclineRate: number;
  baselineChargebackRate: number;
  trendDirection: "up" | "down" | "flat";
  generatedAt: string;
}

export interface MetricsApiResponse {
  summary: MetricsSummary;
  history: MetricSnapshot[];
}
