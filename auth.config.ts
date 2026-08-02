import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const { pathname } = nextUrl;

      // This runs in a separate NextAuth() instance (middleware/proxy) that
      // doesn't have the custom `session` callback from lib/auth.ts, so
      // auth.user.role is never populated here — only check "is there a
      // session at all" and redirect to /login if not. The actual
      // role-specific check (redirecting to /nicht-berechtigt) happens in
      // app/admin/layout.tsx and app/gruppe/layout.tsx, which use the full
      // auth() and do have role/mustChangePassword on the session.
      if (pathname.startsWith("/admin") || pathname.startsWith("/gruppe")) {
        return Boolean(auth);
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
