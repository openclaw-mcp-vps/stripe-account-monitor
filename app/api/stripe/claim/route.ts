import { NextResponse } from "next/server";
import { z } from "zod";
import {
  accessTokenCookieMaxAge,
  ACCESS_COOKIE_NAME,
  issueAccessToken,
} from "@/lib/auth";
import { findPurchaseByEmail, markPurchaseClaimed } from "@/lib/db";

const claimSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const body = claimSchema.parse(await request.json());
    const purchase = findPurchaseByEmail(body.email);

    if (!purchase) {
      return NextResponse.json(
        {
          error:
            "No Stripe purchase was found for that email yet. Complete checkout first or wait for webhook delivery.",
        },
        { status: 404 },
      );
    }

    const token = await issueAccessToken(purchase.email);
    markPurchaseClaimed(purchase.id);

    const response = NextResponse.json({
      ok: true,
      email: purchase.email,
      purchasedAt: purchase.purchasedAt,
    });

    response.cookies.set({
      name: ACCESS_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: accessTokenCookieMaxAge(),
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Please provide a valid purchase email." },
        { status: 400 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Unable to claim access at this time";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
