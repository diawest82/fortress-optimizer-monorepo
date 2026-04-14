import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Extend session type
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      provider?: string;
      role?: string;
    };
  }
}

// Extend the JWT type so the callback below can read/write provider info.
// Without this, the callback has to cast `token as any` which is a lint error.
declare module "next-auth/jwt" {
  interface JWT {
    provider?: string;
    providerAccountId?: string;
    mfaEnabled?: boolean;
    role?: string;
  }
}

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

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

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
            role: user.role,
          };
        } catch (error) {
          console.error("Auth error:", error);
          throw new Error("Authentication failed");
        }
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
    async signIn({ user, account, profile }) {
      // OAuth sign-in: auto-create user in DB if they don't exist yet
      if (account?.type === "oauth" && user.email) {
        try {
          const existing = await prisma.user.findUnique({
            where: { email: user.email },
          });
          if (!existing) {
            const newUser = await prisma.user.create({
              data: {
                email: user.email,
                name: user.name || profile?.name || user.email.split("@")[0],
                password: "", // OAuth users have no password
              },
            });
            // Store the DB id so the jwt callback can use it
            user.id = newUser.id;
          } else {
            user.id = existing.id;
          }
          // Link the OAuth account
          const existingAccount = await prisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
          });
          if (!existingAccount) {
            await prisma.account.create({
              data: {
                userId: user.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                refresh_token: account.refresh_token,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state as string | undefined,
              },
            });
          }
        } catch (err) {
          console.error("OAuth signIn callback error:", err);
          return false;
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || "";
        session.user.provider = token.provider;
        session.user.role = token.role;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.sub = user.id;
        token.role = (user as any).role;
      }
      // For OAuth users, fetch role from DB (since authorize() isn't called)
      if (account?.type === "oauth" && token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true },
        });
        token.role = dbUser?.role || "viewer";
      }
      if (account) {
        token.provider = account.provider;
        token.providerAccountId = account.providerAccountId;
      }
      if (account && account.type === "oauth") {
        token.mfaEnabled = true;
      }
      return token;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  useSecureCookies: process.env.NODE_ENV === 'production',
};

// Helper for signup
export async function createUser(
  email: string,
  password: string,
  name: string
) {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        // role omitted — defaults to "viewer" via prisma/schema.prisma.
        // Was hardcoded to "admin" until 2026-04-08, which made every
        // signup automatically an admin. Admins must now be promoted
        // explicitly via /api/admin/users.
      },
    });

    // Send welcome email
    try {
      const { sendWelcomeEmail } = await import("@/lib/email");
      await sendWelcomeEmail(email, name || email);
    } catch (err) {
      console.warn("Failed to send welcome email:", err);
      // Don't fail signup if email fails
    }

    return { id: user.id, email: user.email, name: user.name };
  } catch (error) {
    console.error("Create user error:", error);
    throw error;
  }
}
