import { useSession as useBetterAuthSession } from "@/lib/auth-client";

/** Thin re-export so views import session state from one place. */
export const useSession = useBetterAuthSession;
