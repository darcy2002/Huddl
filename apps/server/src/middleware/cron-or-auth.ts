import { createMiddleware } from "hono/factory";
import { requireAuth, type AuthEnv } from "./require-auth";

// Vercel Cron sends `Authorization: Bearer $CRON_SECRET` (GET only). Accept that,
// else fall back to session/api-key auth. Fails closed when CRON_SECRET is unset.
export const cronOrAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const secret = process.env.CRON_SECRET;
  const authz = c.req.header("authorization");
  if (secret && authz === `Bearer ${secret}`) return next();
  return requireAuth(c, next);
});
