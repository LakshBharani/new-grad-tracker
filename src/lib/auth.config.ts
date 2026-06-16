import type { NextAuthConfig } from "next-auth";

// Edge-safe config — no Node.js modules, no database access.
// Used only by middleware for JWT validation.
export const authConfig: NextAuthConfig = {
  providers: [],
  pages: { signIn: "/login" },
  // Trust the deployment host (Vercel domain) instead of requiring a hardcoded
  // NEXTAUTH_URL — without this, NextAuth v5 throws an UntrustedHost
  // ("Configuration") error in production. Shared by the edge middleware and the
  // main auth instance.
  trustHost: true,
  // Resolve the secret under either env-var name (v5 prefers AUTH_SECRET; this
  // app historically used NEXTAUTH_SECRET). A missing secret throws in prod.
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
  session: { strategy: "jwt" },
};
