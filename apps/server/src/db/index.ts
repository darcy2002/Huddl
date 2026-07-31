import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as appSchema from "./schema.js";
import * as authSchema from "./auth-schema.js";

export const schema = { ...appSchema, ...authSchema };

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle({ client: sql, schema });
