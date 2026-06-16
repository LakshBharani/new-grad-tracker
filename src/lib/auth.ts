import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  // Trust the deployment's host header so auth redirects use the real domain
  // (e.g. the Vercel URL) instead of a hardcoded NEXTAUTH_URL. Required for
  // correct redirects on Vercel preview/production deployments.
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Lazy import to avoid Edge Runtime issues — only runs in Node.js
        const { getUserByEmail } = await import("./db-helpers");
        const user = await getUserByEmail(credentials.email as string);
        if (!user) return null;

        const match = await bcrypt.compare(credentials.password as string, user.password);
        if (!match) return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
});
