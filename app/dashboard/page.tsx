import type { Metadata } from "next";
import { AlertSettings } from "@/components/AlertSettings";
import { MetricsDashboard } from "@/components/MetricsDashboard";
import { StripeConnect } from "@/components/StripeConnect";

export const metadata: Metadata = {
  title: "Dashboard | Stripe Account Monitor",
  description:
    "Live Stripe account risk dashboard for decline spikes, chargeback drift, and payout reliability.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-xl border border-cyan-300/20 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.2),_rgba(13,17,23,0.95)_48%)] p-6">
        <p className="mb-2 text-sm uppercase tracking-[0.24em] text-cyan-300">
          Stripe Account Monitor
        </p>
        <h1 className="text-3xl font-semibold text-white sm:text-4xl">
          Early Warning Dashboard
        </h1>
        <p className="mt-3 max-w-3xl text-slate-200">
          Detect decline spikes, chargeback drift, and payout instability before they
          escalate into account restrictions. Alerts are sent instantly when risk
          thresholds are breached.
        </p>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <StripeConnect />
        <AlertSettings />
      </div>

      <MetricsDashboard />
    </main>
  );
}
