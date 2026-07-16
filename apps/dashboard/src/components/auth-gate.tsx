import { Navigate, Outlet } from "react-router";
import { Loader2Icon } from "lucide-react";
import { useSession } from "@/hooks/use-session";

/** Wraps authed routes: shows a spinner while resolving, redirects to /login when signed out. */
export function AuthGate() {
  const { data, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return <Navigate to="/login" replace />;

  return <Outlet />;
}
