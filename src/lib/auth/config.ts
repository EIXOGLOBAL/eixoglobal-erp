import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { 
  twoFactor, 
  organization,
  admin,
  multiSession,
  bearer,
  oneTap,
  username
} from "better-auth/plugins";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import argon2 from "argon2";

// Initialize rate limiter for auth endpoints
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "15 m"), // 10 requests per 15 minutes
  analytics: true,
  prefix: "@upstash/ratelimit/auth",
});

// Custom password hasher using Argon2
const argon2Hasher = {
  hash: async (password: string) => {
    return await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3,
      parallelism: 4,
    });
  },
  verify: async (hash: string, password: string) => {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  },
};

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
      twoFactor: schema.twoFactors,
      organization: schema.organizations,
      member: schema.members,
      invitation: schema.invitations,
    },
  }),
  
  // Email and password configuration
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      // TODO: Implement email sending logic
      console.log(`Reset password URL for ${user.email}: ${url}`);
    },
    sendVerificationEmail: async ({ user, url }) => {
      // TODO: Implement email sending logic
      console.log(`Verification URL for ${user.email}: ${url}`);
    },
    password: {
      hash: argon2Hasher.hash,
      verify: argon2Hasher.verify,
    },
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },

  // Security settings
  advanced: {
    cookiePrefix: "eixo-erp",
    crossSubDomainCookies: {
      enabled: false,
    },
    useSecureCookies: process.env.NODE_ENV === "production",
    generateId: () => crypto.randomUUID(),
  },

  // Rate limiting
  rateLimit: {
    enabled: true,
    window: 15 * 60, // 15 minutes
    max: 10, // 10 requests
    storage: "memory", // Use memory storage for rate limiting
  },

  // Plugins configuration
  plugins: [
    // Username support
    username(),

    // Two-Factor Authentication (TOTP)
    twoFactor({
      issuer: "EixoGlobal ERP",
      otpOptions: {
        period: 30,
        digits: 6,
      },
    }),

    // Organizations (Multi-tenant)
    organization({
      async sendInvitationEmail(data) {
        // TODO: Implement email sending logic
        console.log(`Invitation email to ${data.email} for organization ${data.organization.name}`);
      },
      allowUserToCreateOrganization: async (user) => {
        // Only ADMIN and MANAGER can create organizations
        return user.role === "ADMIN" || user.role === "MANAGER";
      },
    }),

    // Admin plugin for user management
    admin({
      impersonationSessionDuration: 60 * 60, // 1 hour
    }),

    // Multi-session support
    multiSession({
      maximumSessions: 5,
    }),

    // Bearer token support for API access
    bearer(),

    // Google One Tap (optional)
    oneTap({
      clientId: process.env.GOOGLE_CLIENT_ID,
    }),
  ],

  // Account linking
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "github"],
    },
  },

  // Social providers (optional - configure as needed)
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      enabled: !!process.env.GOOGLE_CLIENT_ID,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      enabled: !!process.env.GITHUB_CLIENT_ID,
    },
  },

  // Trusted origins for CORS
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ],

  // Base path for auth routes
  basePath: "/api/auth",

  // Logger configuration
  logger: {
    level: process.env.NODE_ENV === "production" ? "error" : "debug",
    disabled: false,
  },

  // Hooks for audit logging
  hooks: {
    after: [
      {
        matcher: () => true,
        handler: async (ctx) => {
          // Audit log for all auth events
          const event = ctx.context.request.url;
          const userId = ctx.context.session?.userId;
          
          if (userId) {
            // TODO: Implement audit logging to database
            console.log(`[AUDIT] User ${userId} - Event: ${event}`);
          }
        },
      },
    ],
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.User;
