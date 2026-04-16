# Build Task: stripe-account-monitor

Build a complete, production-ready Next.js 15 App Router application.

PROJECT: stripe-account-monitor
HEADLINE: Early warning system for payment processor account issues
WHAT: None
WHY: None
WHO PAYS: None
NICHE: fintech-tools
PRICE: $$19/mo

ARCHITECTURE SPEC:
A Next.js dashboard that connects to Stripe's API to monitor account health metrics, transaction patterns, and compliance status. Uses webhooks to detect anomalies and sends real-time alerts via email/SMS when potential account issues are detected.

PLANNED FILES:
- app/page.tsx
- app/dashboard/page.tsx
- app/api/stripe/webhook/route.ts
- app/api/alerts/route.ts
- app/api/auth/[...nextauth]/route.ts
- components/MetricCard.tsx
- components/AlertsList.tsx
- components/StripeConnect.tsx
- lib/stripe.ts
- lib/monitoring.ts
- lib/alerts.ts
- lib/db.ts

DEPENDENCIES: next, react, typescript, tailwindcss, stripe, next-auth, prisma, @prisma/client, nodemailer, twilio, recharts, @lemonsqueezy/lemonsqueezy.js, zod

REQUIREMENTS:
- Next.js 15 with App Router (app/ directory)
- TypeScript
- Tailwind CSS v4
- shadcn/ui components (npx shadcn@latest init, then add needed components)
- Dark theme ONLY — background #0d1117, no light mode
- Lemon Squeezy checkout overlay for payments
- Landing page that converts: hero, problem, solution, pricing, FAQ
- The actual tool/feature behind a paywall (cookie-based access after purchase)
- Mobile responsive
- SEO meta tags, Open Graph tags
- /api/health endpoint that returns {"status":"ok"}

ENVIRONMENT VARIABLES (create .env.example):
- NEXT_PUBLIC_LEMON_SQUEEZY_STORE_ID
- NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID
- LEMON_SQUEEZY_WEBHOOK_SECRET

After creating all files:
1. Run: npm install
2. Run: npm run build
3. Fix any build errors
4. Verify the build succeeds with exit code 0

Do NOT use placeholder text. Write real, helpful content for the landing page
and the tool itself. The tool should actually work and provide value.


PREVIOUS ATTEMPT FAILED WITH:
Codex exited 1: Reading additional input from stdin...
OpenAI Codex v0.121.0 (research preview)
--------
workdir: /tmp/openclaw-builds/stripe-account-monitor
model: gpt-5.3-codex
provider: openai
approval: never
sandbox: danger-full-access
reasoning effort: none
reasoning summaries: none
session id: 019d94de-5a8a-7602-88b0-2651dc47faad
--------
user
# Build Task: stripe-account-monitor

Build a complete, production-ready Next.js 15 App Router application.

PROJECT: stripe-account-monitor
HEADLINE: Early warning
Please fix the above errors and regenerate.