import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import logo from "@/assets/tooth-boutique-logo.png";

export function AppHeader({ email }: { email?: string | null }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-card/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link to="/patients" className="flex items-center gap-2.5">
          <img src={logo} alt="Tooth Boutique" width={36} height={36} className="h-9 w-9" />
          <span className="text-base font-semibold tracking-tight">Tooth Boutique</span>
        </Link>
        <nav className="ml-6 hidden sm:flex">
          <Link
            to="/patients"
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            activeProps={{ className: "rounded-md px-3 py-1.5 text-sm bg-secondary text-foreground font-medium" }}
          >
            Pacientes
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {email ? (
            <span className="hidden text-sm text-muted-foreground md:inline">{email}</span>
          ) : null}
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-1.5 h-4 w-4" />
            Salir
          </Button>
        </div>
      </div>
    </header>
  );
}