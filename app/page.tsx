import type { Metadata } from "next";
import Link from "next/link";
import { Activity, ShieldAlert, TrendingUp, Zap } from "lucide-react";
import { AccessClaimForm } from "@/components/AccessClaimForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Stripe Account Monitor | Early Warnings Before Stripe Restricts You",
  description:
    "Monitor decline rate spikes, chargeback drift, and account health degradation before Stripe takes action. Built for SaaS and e-commerce teams processing $10k+/month.",
  openGraph: {
    title: "Stripe Account Monitor",
    description:
      "Early warning system for Stripe account shutdown risk. Detect and fix risk signals before Stripe intervenes.",
    type: "website",
  },
  alternates: {
    canonical: "/",
  },
};

const faqs = [
  {
    question: "How is this different from the Stripe dashboard?",
    answer:
      "Stripe shows point-in-time data. Stripe Account Monitor tracks trend shifts over time, highlights sudden ratio changes, and sends proactive alerts when risk crosses custom thresholds.",
  },
  {
    question: "Will this work for high-risk categories?",
    answer:
      "Yes. In higher-risk verticals, monitoring volatility is even more important. You can tune thresholds by business model and watch for trend acceleration instead of waiting for monthly reports.",
  },
  {
    question: "How do I unlock the dashboard after purchase?",
    answer:
      "Buy through the Stripe Payment Link. Once the webhook records your successful checkout, enter the same purchase email in the unlock form and the app issues a secure access cookie.",
  },
  {
    question: "What alerts can I receive?",
    answer:
      "Email and webhook alerts are built in. You can route webhook payloads to Slack, incident tools, or your own automation workflows.",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-7xl space-y-16 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-cyan-300/20 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.24),rgba(13,17,23,0.96)_45%)] p-6 sm:p-10">
        <p className="mb-4 inline-flex rounded-full border border-cyan-300/30 px-3 py-1 text-xs tracking-[0.22em] text-cyan-200">
          FINTECH TOOLS
        </p>
        <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-white sm:text-6xl">
          Early warning system for payment processor account issues
        </h1>
        <p className="mt-5 max-w-3xl text-lg text-slate-200">
          Stripe shutdowns often look sudden from the outside, but operational signals
          usually degrade weeks in advance. Stripe Account Monitor tracks those
          changes continuously so your team can fix root causes before Stripe applies
          restrictions.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href={process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-500 px-4 text-sm font-medium text-[#052117] hover:bg-emerald-400"
          >
            Buy Now • $19/mo
          </a>
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-white/20 px-4 text-sm font-medium text-slate-100 hover:bg-white/10"
          >
            Open Dashboard
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-white/10 bg-[#111827]/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUp className="h-5 w-5 text-cyan-300" />
              Problem
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-300">
            Decline rates can jump fast during pricing changes, geo expansion, or
            issuer pressure. Merchants usually notice after revenue is already down.
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#111827]/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <ShieldAlert className="h-5 w-5 text-amber-300" />
              Risk
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-300">
            Account health degradation can trigger reserve increases, payout delays, or
            processing restrictions that stall growth overnight.
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#111827]/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Zap className="h-5 w-5 text-emerald-300" />
              Outcome
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-300">
            You get clear, actionable alerts when thresholds break, giving your team
            time to mitigate before Stripe escalates.
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          <h2 className="text-3xl font-semibold text-white">What the monitor tracks</h2>
          <p className="text-slate-300">
            Built for SaaS founders and e-commerce operators processing $10k+ monthly
            who cannot absorb sudden payment disruption.
          </p>
          <ul className="space-y-3 text-sm text-slate-200">
            <li className="rounded-lg border border-white/10 bg-[#111827]/65 p-3">
              24-hour decline rate shifts and spike multipliers against your baseline.
            </li>
            <li className="rounded-lg border border-white/10 bg-[#111827]/65 p-3">
              Chargeback ratio drift and dispute volume acceleration.
            </li>
            <li className="rounded-lg border border-white/10 bg-[#111827]/65 p-3">
              Payout failure events and composite account risk score trends.
            </li>
            <li className="rounded-lg border border-white/10 bg-[#111827]/65 p-3">
              Instant email or webhook alerts with threshold context and severity.
            </li>
          </ul>
        </div>

        <Card className="border-cyan-300/30 bg-[#0f172a]">
          <CardHeader>
            <CardTitle className="text-white">Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-4xl font-semibold text-white">
              $19<span className="text-base text-slate-300">/month</span>
            </p>
            <p className="text-sm text-slate-300">
              Flat pricing. No usage tiers. Includes dashboard access, trend storage,
              and real-time alerting.
            </p>
            <a
              href={process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK}
              className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-emerald-500 px-4 text-sm font-medium text-[#052117] hover:bg-emerald-400"
            >
              Start Monitoring Now
            </a>
            <p className="text-xs text-slate-400">
              Hosted checkout on Stripe Payment Link. No embedded checkout.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#101826] p-6 sm:p-8">
        <h2 className="text-2xl font-semibold text-white">Already purchased?</h2>
        <p className="mt-2 text-sm text-slate-300">
          Enter the same email used at checkout to unlock the dashboard with a secure
          access cookie.
        </p>
        <div className="mt-4 max-w-2xl">
          <AccessClaimForm />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-3xl font-semibold text-white">FAQ</h2>
        <div className="space-y-3">
          {faqs.map((faq) => (
            <Card key={faq.question} className="border-white/10 bg-[#111827]/70">
              <CardHeader>
                <CardTitle className="text-base text-white">{faq.question}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-300">{faq.answer}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-cyan-300/25 bg-[#0f172a] p-6 text-center">
        <Activity className="mx-auto h-8 w-8 text-cyan-300" />
        <h2 className="mt-3 text-2xl font-semibold text-white">
          Protect your payment rails before they break
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-300">
          Stripe moves quickly when risk rises. This gives you the same urgency,
          earlier.
        </p>
      </section>
    </main>
  );
}
