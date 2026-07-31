import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth.js";
import { summaries } from "./routes/summaries.js";
import { compile } from "./routes/compile.js";
import { context } from "./routes/context.js";
import { answer } from "./routes/answer.js";
import { sttToken } from "./routes/stt-token.js";
import { importRoute } from "./routes/import.js";

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
app.route("/compile", compile);
app.route("/context", context);
app.route("/answer", answer);
app.route("/stt-token", sttToken);
app.route("/import", importRoute);
app.get("/health", (c) => c.json({ ok: true }));

export default app;
