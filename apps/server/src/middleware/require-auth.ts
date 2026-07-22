import { createMiddleware } from "hono/factory";
import { auth } from "../auth";

export type AuthEnv = {
  Variables: { user: typeof auth.$Infer.Session.user };
};

// covers dashboard session cookie AND extension x-api-key header
export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  // Better Auth's api-key plugin throws (APIError) on a disabled/invalid key
  // instead of returning null, so treat any thrown error as a clean 401.
  let session: Awaited<ReturnType<typeof auth.api.getSession>> = null;
  try {
    session = await auth.api.getSession({ headers: c.req.raw.headers });
  } catch {
    return c.json({ error: "unauthorized" }, 401);
  }
  if (!session) return c.json({ error: "unauthorized" }, 401);
  c.set("user", session.user);
  await next();
});
