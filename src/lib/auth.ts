import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        identifier: { label: "Email or username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) return null;

        // Lazy import to avoid Edge Runtime issues — only runs in Node.js
        const { getUserByIdentifier } = await import("./db-helpers");
        const user = await getUserByIdentifier(credentials.identifier as string);
        if (!user) return null;

        const match = await bcrypt.compare(credentials.password as string, user.password);
        if (!match) return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
});
