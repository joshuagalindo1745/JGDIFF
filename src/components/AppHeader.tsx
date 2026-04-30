import { Link, NavLink, useNavigate } from "react-router-dom";
import { Sword, Users, Bookmark, LogOut, LogIn, Hexagon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/matchup", label: "Matchup", icon: Sword },
  { to: "/champions", label: "Champions", icon: Users },
  { to: "/saved", label: "Saved", icon: Bookmark },
];

export default function AppHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border/60">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative">
            <Hexagon className="h-7 w-7 text-primary group-hover:text-primary-glow transition-colors" />
            <Hexagon className="h-7 w-7 text-primary absolute inset-0 rotate-30 opacity-40" />
          </div>
          <div className="font-display text-lg tracking-widest gold-text font-bold">RIFT ORACLE</div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "px-4 py-2 rounded-md font-display text-sm tracking-wider uppercase flex items-center gap-2 transition-all",
                  isActive
                    ? "text-primary bg-primary/10 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.3)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <Button variant="ghost" size="sm" onClick={signOut} className="font-display tracking-wider">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          ) : (
            <Button asChild variant="default" size="sm" className="bg-gradient-gold text-primary-foreground hover:opacity-90 font-display tracking-wider shadow-gold">
              <Link to="/auth">
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
            </Button>
          )}
        </div>
      </div>

      <nav className="md:hidden flex items-center justify-around border-t border-border/60 bg-background/80">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex-1 px-3 py-2.5 text-xs font-display tracking-wider flex flex-col items-center gap-0.5",
                isActive ? "text-primary" : "text-muted-foreground",
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
