import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    // Überschreibt den edge-safe jwt-Callback aus auth.config.ts: liest role/gruppeId
    // bei jedem Session-Zugriff frisch aus der DB, damit Gruppen-Umzuordnung und
    // Deaktivierung ohne Re-Login greifen. (proxy.ts nutzt weiter die edge-Variante.)
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id as string;
        token.role = user.role;
        token.gruppeId = user.gruppeId;
        return token;
      }
      if (token.uid) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.uid as string },
          select: { role: true, gruppeId: true, isActive: true },
        });
        if (!dbUser || !dbUser.isActive) return null;
        token.role = dbUser.role;
        token.gruppeId = dbUser.gruppeId;
      }
      return token;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase().trim() },
        });
        if (!user || !user.passwordHash || !user.isActive) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          gruppeId: user.gruppeId,
        };
      },
    }),
  ],
});
