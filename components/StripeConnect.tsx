"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, RefreshCw } from "lucide-react";
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

type StripeConnectionState = {
  connected: boolean;
  connectedAt: string | null;
};

type StripeConnectProps = {
  onConnected?: () => void;
};

export function StripeConnect({ onConnected }: StripeConnectProps) {
  const [secretKey, setSecretKey] = useState("");
  const [pending, setPending] = useState(false);
  const [runningCheck, setRunningCheck] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [connection, setConnection] = useState<StripeConnectionState>({
    connected: false,
    connectedAt: null,
  });

  useEffect(() => {
    let active = true;

    async function loadConnection() {
      try {
        const response = await fetch("/api/alerts", { cache: "no-store" });
        const payload = (await response.json()) as {
          stripeConnection?: StripeConnectionState;
        };

        if (active && payload.stripeConnection) {
          setConnection(payload.stripeConnection);
        }
      } catch {
        // no-op
      }
    }

    void loadConnection();

    return () => {
      active = false;
    };
  }, []);

  async function handleConnect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch("/api/alerts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "connect-stripe",
          secretKey,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        stripeConnection?: StripeConnectionState;
      };

      if (!response.ok) {
        setError(payload.error ?? "Failed to connect Stripe key");
        return;
      }

      setConnection(
        payload.stripeConnection ?? {
          connected: true,
          connectedAt: new Date().toISOString(),
        },
      );
      setSecretKey("");
      setInfo("Stripe API key verified. Monitoring jobs can now pull account signals.");
      onConnected?.();
    } catch {
      setError("Network error while saving Stripe credentials.");
    } finally {
      setPending(false);
    }
  }

  async function runHealthCheck() {
    setRunningCheck(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch("/api/alerts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "run-check" }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Unable to run live check");
        return;
      }

      setInfo("Live account check completed. Metrics and alerts are refreshed.");
      onConnected?.();
    } catch {
      setError("Network error while running manual check.");
    } finally {
      setRunningCheck(false);
    }
  }

  return (
    <Card className="border-white/10 bg-[#111827]/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          {connection.connected ? (
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
          ) : (
            <ShieldAlert className="h-5 w-5 text-amber-400" />
          )}
          Stripe Connection
        </CardTitle>
        <CardDescription className="text-slate-300">
          Connect a restricted Stripe secret key with read access to charges,
          disputes, payouts, and events.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-white/10 bg-[#0d1117] p-3 text-sm text-slate-300">
          {connection.connected
            ? `Connected${connection.connectedAt ? ` on ${new Date(connection.connectedAt).toLocaleString()}` : ""}`
            : "No key connected yet. Monitoring cannot run until a key is added."}
        </div>

        <form onSubmit={handleConnect} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="stripe-secret" className="text-slate-200">
              Stripe Secret Key
            </Label>
            <Input
              id="stripe-secret"
              type="password"
              value={secretKey}
              onChange={(event) => setSecretKey(event.target.value)}
              placeholder="sk_live_..."
              className="border-white/20 bg-[#0d1117] text-white"
              required
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="submit"
              disabled={pending}
              className="bg-cyan-400 text-[#031426] hover:bg-cyan-300"
            >
              {pending ? "Validating..." : "Save Stripe Key"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={runningCheck}
              onClick={runHealthCheck}
              className="border-white/20 bg-transparent text-slate-100 hover:bg-white/10"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {runningCheck ? "Running Check..." : "Run Manual Health Check"}
            </Button>
          </div>
        </form>

        {info ? <p className="text-sm text-emerald-300">{info}</p> : null}
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
