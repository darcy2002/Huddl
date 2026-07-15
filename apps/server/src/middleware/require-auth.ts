import { createMiddleware } from "hono/factory";
import { auth } from "../auth";

export type AuthEnv = {
  Variables: { user: typeof auth.$Infer.Session.user };
};

// covers dashboard session cookie AND extension x-api-key header
export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "unauthorized" }, 401);
  c.set("user", session.user);
  await next();
});
