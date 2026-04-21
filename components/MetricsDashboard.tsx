"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, ShieldCheck } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MetricsApiResponse } from "@/types/metrics";

function percent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function compactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function MetricsDashboard() {
  const [data, setData] = useState<MetricsApiResponse | null>(null);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadMetrics(refresh: boolean) {
    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/metrics${refresh ? "?refresh=1" : ""}`, {
        cache: "no-store",
      });

      const payload = (await response.json()) as MetricsApiResponse & {
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "Failed to load metrics");
        return;
      }

      setData(payload);
    } catch {
      setError("Network error while fetching metrics");
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    void loadMetrics(false);
  }, []);

  const chartData = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.history.map((item) => ({
      time: new Date(item.capturedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
      }),
      declineRate: Number((item.declineRate * 100).toFixed(2)),
      chargebackRate: Number((item.chargebackRate * 100).toFixed(3)),
      riskScore: Number(item.riskScore.toFixed(0)),
    }));
  }, [data]);

  const latest = data?.summary.latest ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Account Health Overview</h2>
          <p className="text-sm text-slate-300">
            Rolling 24-hour Stripe risk signals with automatic drift detection.
          </p>
        </div>
        <Button
          onClick={() => void loadMetrics(true)}
          className="bg-cyan-400 text-[#031426] hover:bg-cyan-300"
          disabled={pending}
        >
          {pending ? "Refreshing..." : "Refresh Metrics"}
        </Button>
      </div>

      {error ? (
        <Card className="border-red-500/40 bg-red-950/20">
          <CardContent className="p-4 text-sm text-red-200">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Decline Rate"
          value={latest ? percent(latest.declineRate) : "--"}
          subtitle={`Baseline ${percent(data?.summary.baselineDeclineRate ?? 0)}`}
          icon={<AlertTriangle className="h-4 w-4 text-amber-300" />}
        />
        <MetricCard
          title="Chargeback Rate"
          value={latest ? percent(latest.chargebackRate) : "--"}
          subtitle={`Baseline ${percent(data?.summary.baselineChargebackRate ?? 0)}`}
          icon={<BarChart3 className="h-4 w-4 text-sky-300" />}
        />
        <MetricCard
          title="Risk Score"
          value={latest ? `${latest.riskScore.toFixed(0)}/100` : "--"}
          subtitle={latest ? `Level: ${latest.riskLevel}` : "Awaiting data"}
          icon={<ShieldCheck className="h-4 w-4 text-emerald-300" />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-white/10 bg-[#111827]/70">
          <CardHeader>
            <CardTitle className="text-white">Decline and Chargeback Trends</CardTitle>
            <CardDescription className="text-slate-300">
              Percent of failed charges and disputes over time.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                <XAxis dataKey="time" stroke="#94a3b8" minTickGap={24} />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    background: "#020617",
                    borderColor: "#334155",
                    color: "#f8fafc",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="declineRate"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="chargebackRate"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#111827]/70">
          <CardHeader>
            <CardTitle className="text-white">Composite Risk Score</CardTitle>
            <CardDescription className="text-slate-300">
              Weighted model combining decline spikes, disputes, and payout failures.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                <XAxis dataKey="time" stroke="#94a3b8" minTickGap={24} />
                <YAxis stroke="#94a3b8" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    background: "#020617",
                    borderColor: "#334155",
                    color: "#f8fafc",
                  }}
                />
                <Area
                  dataKey="riskScore"
                  type="monotone"
                  stroke="#22d3ee"
                  fillOpacity={1}
                  fill="url(#riskGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {latest ? (
        <Card className="border-white/10 bg-[#0d1117]">
          <CardContent className="grid gap-2 p-4 text-sm text-slate-200 sm:grid-cols-4">
            <p>
              Attempts: <span className="font-semibold">{compactNumber(latest.attempts)}</span>
            </p>
            <p>
              Successful: <span className="font-semibold">{compactNumber(latest.successful)}</span>
            </p>
            <p>
              Disputes: <span className="font-semibold">{compactNumber(latest.disputeCount)}</span>
            </p>
            <p>
              Payout failures: <span className="font-semibold">{latest.payoutFailures}</span>
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

type MetricCardProps = {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
};

function MetricCard({ title, value, subtitle, icon }: MetricCardProps) {
  return (
    <Card className="border-white/10 bg-[#111827]/70">
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center justify-between text-slate-300">
          {title}
          <span>{icon}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-white">{value}</p>
        <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
