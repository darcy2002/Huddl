import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { apiKey } from "@better-auth/api-key";
import { db, schema } from "./db";

const isProd = process.env.NODE_ENV === "production";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    // fails closed: signups are off unless explicitly enabled
    disableSignUp: process.env.ALLOW_SIGNUP !== "true",
    autoSignIn: true,
  },
  trustedOrigins: [process.env.DASHBOARD_ORIGIN ?? "http://localhost:5173"],
  advanced: isProd
    ? { defaultCookieAttributes: { sameSite: "none", secure: true, partitioned: true } }
    : {},
  plugins: [
    apiKey({
      // x-api-key header mints a session, so one middleware covers both auth paths
      enableSessionForAPIKeys: true,
      // default is 10 requests/day — far too low for the extension
      rateLimit: { enabled: true, timeWindow: 1000 * 60 * 60 * 24, maxRequests: 5000 },
    }),
  ],
});
