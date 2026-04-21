import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, verifyAccessToken } from "@/lib/auth";

function unauthorized(request: NextRequest): NextResponse {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Payment required" }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.searchParams.set("paywall", "1");

  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(ACCESS_COOKIE_NAME)?.value;

  if (!token) {
    return unauthorized(request);
  }

  const verified = await verifyAccessToken(token);
  if (!verified) {
    return unauthorized(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/metrics/:path*", "/api/alerts/:path*"],
};
