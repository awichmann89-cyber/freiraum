import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

// Edge-safe: kein Prisma, kein bcryptjs — wird auch in proxy.ts verwendet.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id as string;
        token.role = user.role;
        token.gruppeId = user.gruppeId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.role = token.role as Role;
        session.user.gruppeId = (token.gruppeId as string | null) ?? null;
      }
      return session;
    },
  },
  providers: [], // wird in src/auth.ts befüllt
} satisfies NextAuthConfig;
