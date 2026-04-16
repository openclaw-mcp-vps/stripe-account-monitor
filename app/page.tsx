export default function Home() {
  const checkoutUrl = process.env.NEXT_PUBLIC_LS_CHECKOUT_URL || "#";

  return (
    <main className="min-h-screen bg-[#0d1117] text-[#c9d1d9]">
      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-24 pb-16 text-center">
        <span className="inline-block mb-4 px-3 py-1 rounded-full bg-[#161b22] border border-[#30363d] text-xs text-[#58a6ff] uppercase tracking-widest">
          Fintech Tools
        </span>
        <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-5">
          Early Warning System for{" "}
          <span className="text-[#58a6ff]">Stripe Account Issues</span>
        </h1>
        <p className="text-lg text-[#8b949e] max-w-xl mx-auto mb-8">
          Monitor your Stripe account health, track transaction patterns, and receive real-time alerts via email or SMS before problems escalate into account suspensions.
        </p>
        <a
          href={checkoutUrl}
          className="inline-block px-8 py-3 rounded-lg bg-[#58a6ff] text-[#0d1117] font-semibold text-base hover:bg-[#79b8ff] transition-colors"
        >
          Get Early Access — $19/mo
        </a>
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          {[
            { icon: "⚡", title: "Real-Time Alerts", desc: "Instant email & SMS notifications when anomalies are detected." },
            { icon: "📊", title: "Health Dashboard", desc: "Live metrics on disputes, refunds, and compliance status." },
            { icon: "🔔", title: "Webhook Monitoring", desc: "Listens to Stripe events 24/7 to catch issues as they happen." }
          ].map((f) => (
            <div key={f.title} className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
              <div className="text-2xl mb-2">{f.icon}</div>
              <div className="font-semibold text-white mb-1">{f.title}</div>
              <div className="text-sm text-[#8b949e]">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-sm mx-auto px-6 pb-20">
        <div className="bg-[#161b22] border border-[#58a6ff] rounded-2xl p-8 text-center shadow-lg">
          <div className="text-sm text-[#58a6ff] font-semibold uppercase tracking-widest mb-2">Pro Plan</div>
          <div className="text-5xl font-bold text-white mb-1">$19</div>
          <div className="text-[#8b949e] mb-6">per month</div>
          <ul className="text-sm text-left space-y-3 mb-8">
            {[
              "Stripe account health monitoring",
              "Dispute & refund rate tracking",
              "Compliance status alerts",
              "Email & SMS notifications",
              "Webhook anomaly detection",
              "Unlimited alert rules"
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="text-[#58a6ff]">✓</span>
                <span className="text-[#c9d1d9]">{item}</span>
              </li>
            ))}
          </ul>
          <a
            href={checkoutUrl}
            className="block w-full py-3 rounded-lg bg-[#58a6ff] text-[#0d1117] font-semibold hover:bg-[#79b8ff] transition-colors"
          >
            Start Monitoring Now
          </a>
          <p className="mt-3 text-xs text-[#8b949e]">Cancel anytime. No contracts.</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-2xl mx-auto px-6 pb-24">
        <h2 className="text-2xl font-bold text-white text-center mb-8">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {[
            {
              q: "How does Stripe Account Monitor work?",
              a: "It connects to your Stripe account via API and listens to webhooks. When it detects unusual patterns — like a spike in disputes or failed payments — it immediately sends you an alert so you can act before Stripe flags your account."
            },
            {
              q: "Will this prevent my Stripe account from being suspended?",
              a: "It gives you early warnings so you can investigate and resolve issues proactively. While no tool can guarantee prevention, catching problems early dramatically reduces the risk of account suspension."
            },
            {
              q: "Is my Stripe data secure?",
              a: "Yes. We use read-only Stripe API keys and never store sensitive payment data. All connections are encrypted and your credentials are never shared with third parties."
            }
          ].map((item) => (
            <div key={item.q} className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
              <div className="font-semibold text-white mb-2">{item.q}</div>
              <div className="text-sm text-[#8b949e]">{item.a}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-[#21262d] text-center py-6 text-xs text-[#8b949e]">
        © {new Date().getFullYear()} Stripe Account Monitor. Not affiliated with Stripe, Inc.
      </footer>
    </main>
  );
}
