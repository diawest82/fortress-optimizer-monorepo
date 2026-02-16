import { NextAuthOptions, Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { JWT } from "next-auth/jwt";

// Extend session type
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      provider?: string;
    };
  }
}

// This will be replaced with actual database queries
// For now, using in-memory storage for demo
const users: Record<string, { id: string; email: string; password: string; name: string }> = {};

export const authConfig: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required");
        }

        const user = users[credentials.email];
        if (!user) {
          throw new Error("Invalid credentials");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || "";
        (session.user as any).provider = (token as any).provider;
      }
      return session;
    },
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.sub = user.id;
      }
      if (account) {
        (token as any).provider = account.provider;
        (token as any).providerAccountId = account.providerAccountId;
      }
      // Auto-enable MFA for OAuth users
      if (account && account.type === 'oauth') {
        (token as any).mfaEnabled = true;
      }
      return token;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Helper for signup
export async function createUser(
  email: string,
  password: string,
  name: string
) {
  if (users[email]) {
    throw new Error("User already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const id = `user_${Date.now()}`;

  users[email] = {
    id,
    email,
    password: hashedPassword,
    name,
  };

  return { id, email, name };
}
