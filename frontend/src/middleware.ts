import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Supabase session lives in localStorage (not cookies), so we cannot check
// auth state here. Auth redirects are handled client-side:
//   - / (landing)   → if session exists, redirects to /dashboard
//   - /login        → if session exists, redirects to /dashboard
//   - /dashboard    → if no session, redirects to /
// This middleware only ensures public routes are never blocked.

const PUBLIC_PATHS = ["/", "/login", "/payment"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/payment") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/screenshots") ||
    pathname.includes(".");

  if (isPublic) return NextResponse.next();

  // For all other paths (e.g. /dashboard), pass through —
  // the page component handles the session check and redirect.
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
