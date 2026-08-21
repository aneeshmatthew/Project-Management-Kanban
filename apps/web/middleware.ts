import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Protects everything except the sign-in page, auth API routes, the
 * GitHub webhook (which authenticates via HMAC signature, not a session),
 * and static assets.
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isPublic =
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/github/webhook") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico";

  if (isPublic) return NextResponse.next();

  if (!req.auth) {
    const signInUrl = new URL("/sign-in", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
