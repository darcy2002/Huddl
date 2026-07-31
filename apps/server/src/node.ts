import "dotenv/config";
import { serve } from "@hono/node-server";

const { default: app } = await import("./index.js");

serve({ fetch: app.fetch, port: 8787 });
console.log("huddl server on http://localhost:8787");
