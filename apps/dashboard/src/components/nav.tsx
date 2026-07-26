import { useState } from "react";
import { NavLink, useNavigate } from "react-router";
import { toast } from "sonner";
import { SunIcon, MoonIcon } from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { getTheme, toggleTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const links = [
  { to: "/import", label: "Import" },
  { to: "/", label: "Context", end: true },
  { to: "/live", label: "Live" },
];

export function Nav() {
  const navigate = useNavigate();
  const [theme, setThemeState] = useState<Theme>(() => getTheme());

  async function handleSignOut() {
    await signOut();
    toast.success("Signed out");
    navigate("/login", { replace: true });
  }

  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-1">
          <span className="mr-4 font-heading text-lg font-semibold">Huddl</span>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setThemeState(toggleTheme())}
            aria-label="Toggle theme"
            title="Toggle light / dark"
          >
            {theme === "dark" ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
