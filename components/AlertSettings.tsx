"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { AlertRecord, AlertSettingsConfig } from "@/types/metrics";

const defaultSettings: AlertSettingsConfig = {
  alertEmails: [],
  webhookUrl: null,
  enableEmailAlerts: true,
  enableWebhookAlerts: false,
  thresholds: {
    declineRateWarning: 0.11,
    declineRateCritical: 0.17,
    declineSpikeWarning: 1.5,
    declineSpikeCritical: 2,
    chargebackRateWarning: 0.006,
    chargebackRateCritical: 0.01,
    payoutFailureCritical: 1,
    riskScoreWarning: 60,
    riskScoreCritical: 80,
  },
};

function toPercent(value: number): string {
  return (value * 100).toFixed(2);
}

function fromPercent(value: string, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, parsed) / 100;
}

type AlertSettingsProps = {
  refreshKey?: number;
};

export function AlertSettings({ refreshKey = 0 }: AlertSettingsProps) {
  const [settings, setSettings] = useState<AlertSettingsConfig>(defaultSettings);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/alerts", { cache: "no-store" });
        const payload = (await response.json()) as {
          settings?: AlertSettingsConfig;
          alerts?: AlertRecord[];
          error?: string;
        };

        if (!response.ok || !active) {
          return;
        }

        if (payload.settings) {
          setSettings(payload.settings);
        }

        setAlerts(payload.alerts ?? []);
      } catch {
        if (active) {
          setError("Failed to load alert settings");
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch("/api/alerts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "update-settings", data: settings }),
      });

      const payload = (await response.json()) as {
        error?: string;
        settings?: AlertSettingsConfig;
      };

      if (!response.ok) {
        setError(payload.error ?? "Failed to update settings");
        return;
      }

      if (payload.settings) {
        setSettings(payload.settings);
      }
      setInfo("Alert configuration saved.");
    } catch {
      setError("Network error while saving settings.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="border-white/10 bg-[#111827]/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <BellRing className="h-5 w-5 text-cyan-300" />
          Alert Settings
        </CardTitle>
        <CardDescription className="text-slate-300">
          Configure thresholds and where instant risk alerts are delivered.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email-alerts" className="text-slate-200">
                Alert Emails (comma separated)
              </Label>
              <Input
                id="email-alerts"
                value={settings.alertEmails.join(", ")}
                onChange={(event) => {
                  const values = event.target.value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean);

                  setSettings((prev) => ({ ...prev, alertEmails: values }));
                }}
                placeholder="ops@company.com, founder@company.com"
                className="border-white/20 bg-[#0d1117] text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhook-url" className="text-slate-200">
                Webhook URL
              </Label>
              <Input
                id="webhook-url"
                value={settings.webhookUrl ?? ""}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    webhookUrl: event.target.value,
                  }))
                }
                placeholder="https://hooks.slack.com/services/..."
                className="border-white/20 bg-[#0d1117] text-white"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-md border border-white/10 bg-[#0d1117] px-3 py-2">
              <Label htmlFor="email-enabled" className="text-slate-200">
                Email Alerts
              </Label>
              <Switch
                id="email-enabled"
                checked={settings.enableEmailAlerts}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, enableEmailAlerts: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-md border border-white/10 bg-[#0d1117] px-3 py-2">
              <Label htmlFor="webhook-enabled" className="text-slate-200">
                Webhook Alerts
              </Label>
              <Switch
                id="webhook-enabled"
                checked={settings.enableWebhookAlerts}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, enableWebhookAlerts: checked }))
                }
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <ThresholdInput
              label="Decline Warn %"
              value={toPercent(settings.thresholds.declineRateWarning)}
              onChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  thresholds: {
                    ...prev.thresholds,
                    declineRateWarning: fromPercent(
                      value,
                      prev.thresholds.declineRateWarning,
                    ),
                  },
                }))
              }
            />
            <ThresholdInput
              label="Decline Critical %"
              value={toPercent(settings.thresholds.declineRateCritical)}
              onChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  thresholds: {
                    ...prev.thresholds,
                    declineRateCritical: fromPercent(
                      value,
                      prev.thresholds.declineRateCritical,
                    ),
                  },
                }))
              }
            />
            <ThresholdInput
              label="Chargeback Warn %"
              value={toPercent(settings.thresholds.chargebackRateWarning)}
              onChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  thresholds: {
                    ...prev.thresholds,
                    chargebackRateWarning: fromPercent(
                      value,
                      prev.thresholds.chargebackRateWarning,
                    ),
                  },
                }))
              }
            />
            <ThresholdInput
              label="Chargeback Critical %"
              value={toPercent(settings.thresholds.chargebackRateCritical)}
              onChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  thresholds: {
                    ...prev.thresholds,
                    chargebackRateCritical: fromPercent(
                      value,
                      prev.thresholds.chargebackRateCritical,
                    ),
                  },
                }))
              }
            />
            <ThresholdInput
              label="Decline Spike Warn"
              value={String(settings.thresholds.declineSpikeWarning)}
              onChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  thresholds: {
                    ...prev.thresholds,
                    declineSpikeWarning:
                      Number(value) || prev.thresholds.declineSpikeWarning,
                  },
                }))
              }
            />
            <ThresholdInput
              label="Decline Spike Critical"
              value={String(settings.thresholds.declineSpikeCritical)}
              onChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  thresholds: {
                    ...prev.thresholds,
                    declineSpikeCritical:
                      Number(value) || prev.thresholds.declineSpikeCritical,
                  },
                }))
              }
            />
            <ThresholdInput
              label="Risk Score Warn"
              value={String(settings.thresholds.riskScoreWarning)}
              onChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  thresholds: {
                    ...prev.thresholds,
                    riskScoreWarning:
                      Number(value) || prev.thresholds.riskScoreWarning,
                  },
                }))
              }
            />
            <ThresholdInput
              label="Risk Score Critical"
              value={String(settings.thresholds.riskScoreCritical)}
              onChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  thresholds: {
                    ...prev.thresholds,
                    riskScoreCritical:
                      Number(value) || prev.thresholds.riskScoreCritical,
                  },
                }))
              }
            />
            <ThresholdInput
              label="Payout Failure Critical"
              value={String(settings.thresholds.payoutFailureCritical)}
              onChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  thresholds: {
                    ...prev.thresholds,
                    payoutFailureCritical:
                      Number(value) || prev.thresholds.payoutFailureCritical,
                  },
                }))
              }
            />
          </div>

          <Button type="submit" disabled={pending} className="bg-cyan-400 text-[#031426]">
            {pending ? "Saving..." : "Save Alert Settings"}
          </Button>

          {info ? <p className="text-sm text-emerald-300">{info}</p> : null}
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
        </form>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold tracking-wide text-slate-200">
            Recent Alerts
          </h3>
          {alerts.length === 0 ? (
            <p className="text-sm text-slate-400">
              No alerts triggered yet. Connect Stripe and run a manual health check.
            </p>
          ) : (
            <ul className="space-y-2">
              {alerts.slice(0, 6).map((alert) => (
                <li
                  key={alert.id}
                  className="rounded-md border border-white/10 bg-[#0d1117] p-3"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Badge
                      variant={alert.severity === "critical" ? "destructive" : "secondary"}
                    >
                      {alert.severity.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-slate-400">
                      {new Date(alert.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-200">{alert.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

type ThresholdInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function ThresholdInput({ label, value, onChange }: ThresholdInputProps) {
  return (
    <div className="space-y-2">
      <Label className="text-slate-200">{label}</Label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border-white/20 bg-[#0d1117] text-white"
      />
    </div>
  );
}
