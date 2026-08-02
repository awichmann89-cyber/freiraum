import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const { pathname } = nextUrl;
      const role = auth?.user?.role;

      if (pathname.startsWith("/admin")) {
        if (!auth) return false;
        if (role !== "admin") {
          return Response.redirect(new URL("/nicht-berechtigt", nextUrl));
        }
        return true;
      }

      if (pathname.startsWith("/gruppe")) {
        if (!auth) return false;
        if (role !== "group" && role !== "admin") {
          return Response.redirect(new URL("/nicht-berechtigt", nextUrl));
        }
        return true;
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
