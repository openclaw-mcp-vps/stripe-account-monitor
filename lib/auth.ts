import { SignJWT, jwtVerify } from "jose";

export const ACCESS_COOKIE_NAME = "sam_access";
const ISSUER = "stripe-account-monitor";
const AUDIENCE = "dashboard";
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

function authSecret(): Uint8Array {
  const source =
    process.env.APP_JWT_SECRET ??
    process.env.STRIPE_WEBHOOK_SECRET ??
    "dev-secret-change-me-in-production";

  return new TextEncoder().encode(source);
}

export async function issueAccessToken(email: string): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();

  return new SignJWT({ email: normalizedEmail })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(authSecret());
}

export async function verifyAccessToken(token: string): Promise<{
  email: string;
} | null> {
  try {
    const { payload } = await jwtVerify(token, authSecret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    if (typeof payload.email !== "string") {
      return null;
    }

    return { email: payload.email };
  } catch {
    return null;
  }
}

export function accessTokenCookieMaxAge(): number {
  return ACCESS_TOKEN_TTL_SECONDS;
}
