import { useState } from "react";
import { NavLink, useNavigate } from "react-router";
import { toast } from "sonner";
import { SunIcon, MoonIcon, TypeIcon } from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { getTheme, toggleTheme, type Theme } from "@/lib/theme";
import { FONTS, getFont, setFont, type FontId } from "@/lib/font";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const links = [
  { to: "/import", label: "Import" },
  { to: "/", label: "Context", end: true },
  { to: "/live", label: "Live" },
];

export function Nav() {
  const navigate = useNavigate();
  const [theme, setThemeState] = useState<Theme>(() => getTheme());
  const [font, setFontState] = useState<FontId>(() => getFont());

  async function handleSignOut() {
    await signOut();
    toast.success("Signed out");
    navigate("/login", { replace: true });
  }

  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-1">
          <span className="mr-4 font-display text-lg font-semibold">Huddl</span>
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Change font" title="Font">
                <TypeIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Typeface</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={font}
                onValueChange={(v) => {
                  setFont(v as FontId);
                  setFontState(v as FontId);
                }}
              >
                {FONTS.map((f) => (
                  <DropdownMenuRadioItem key={f.id} value={f.id}>
                    <span className="font-medium">{f.label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{f.note}</span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
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
