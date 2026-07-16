import { createAuthClient } from "better-auth/react";
import { apiKeyClient } from "@better-auth/api-key/client";

export const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:8787";

export const authClient = createAuthClient({
  baseURL: SERVER_URL,
  plugins: [apiKeyClient()],
});

export const { signIn, signOut, useSession } = authClient;
