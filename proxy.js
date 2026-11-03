import { NextResponse } from "next/server";
import { COOKIE_NAME, verifyToken } from "./lib/session";

const PUBLIC_PATHS = ["/login", "/register", "/api/auth/login", "/api/auth/register"];

// Runs before every page and API request: this is the role-based route protection.
export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const session = await verifyToken(request.cookies.get(COOKIE_NAME)?.value);
  const isApi = pathname.startsWith("/api/");
  const home = session?.role === "ADMIN" ? "/admin" : "/tasks";

  if (PUBLIC_PATHS.includes(pathname)) {
    if (session && !isApi) return NextResponse.redirect(new URL(home, request.url));
    return NextResponse.next();
  }

  if (!session) {
    if (isApi) return NextResponse.json({ error: "Please log in" }, { status: 401 });
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/api/auth/logout" || pathname === "/api/auth/me") {
    return NextResponse.next();
  }

  // Admins only get the admin area, students get everything except it.
  const isAdminPath = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  if (isAdminPath !== (session.role === "ADMIN")) {
    if (isApi) return NextResponse.json({ error: "Not allowed for your role" }, { status: 403 });
    return NextResponse.redirect(new URL(home, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
