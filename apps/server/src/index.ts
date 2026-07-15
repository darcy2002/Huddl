import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth";
import { summaries } from "./routes/summaries";

const app = new Hono();

// CORS must be registered before all routes (Better Auth requirement)
app.use(
  "*",
  cors({
    origin: [process.env.DASHBOARD_ORIGIN ?? "http://localhost:5173"],
    allowHeaders: ["Content-Type", "Authorization", "x-api-key"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));
app.route("/summaries", summaries);
app.get("/health", (c) => c.json({ ok: true }));

export default app;
