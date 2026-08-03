import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

// Präfixe, die ohne Login erreichbar sind.
const PUBLIC_PREFIXES = [
  "/login",
  "/belegung",
  "/anfrage",
  "/vertrag",
  "/einladung",
  "/passwort-vergessen",
  "/passwort-reset",
  "/api/auth",
  "/api/cron",
];

export default auth((req) => {
  const { nextUrl } = req;
  const path = nextUrl.pathname;

  if (path === "/" || PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  if (!req.auth?.user) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", path + nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  if (path.startsWith("/admin") && req.auth.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/kalender", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|uploads/|.*\\.(?:png|jpg|jpeg|svg|ico|webp|css|js|pdf)$).*)",
  ],
};
