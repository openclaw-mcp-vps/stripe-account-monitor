import { NextResponse } from "next/server";
import Stripe from "stripe";
import { savePurchase } from "@/lib/db";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder");

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Webhook signature or secret is missing" },
      { status: 400 },
    );
  }

  const payload = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid Stripe webhook payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    const email =
      session.customer_details?.email?.trim().toLowerCase() ??
      session.customer_email?.trim().toLowerCase();

    if (email) {
      const purchasedAt = session.created
        ? new Date(session.created * 1000).toISOString()
        : new Date().toISOString();

      savePurchase({
        email,
        sessionId: session.id,
        purchasedAt,
      });
    }
  }

  return NextResponse.json({ received: true });
}
