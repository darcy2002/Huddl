import { createAuthClient } from "better-auth/react";

export const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:8787";

export const authClient = createAuthClient({
  baseURL: SERVER_URL,
});

export const { signIn, signOut, useSession } = authClient;
