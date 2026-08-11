import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import logo from "@/assets/tooth-boutique-logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Acceso staff — Tooth Boutique" },
      {
        name: "description",
        content: "Herramienta interna de Tooth Boutique para gestionar fotos y progreso de pacientes.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Acceso staff — Tooth Boutique" },
      {
        property: "og:description",
        content: "Herramienta interna de Tooth Boutique para gestionar fotos y progreso de pacientes.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session) navigate({ to: "/patients", replace: true });
  }, [session, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (signInError) {
      setError("Credenciales inválidas. Revisa tu email y contraseña.");
      return;
    }
    navigate({ to: "/patients", replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center surface-gradient px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <img src={logo} alt="Tooth Boutique" width={72} height={72} className="h-16 w-16" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Tooth Boutique</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestión de fotos y progreso de pacientes
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft"
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@toothboutique.cl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {!isSupabaseConfigured ? (
            <p className="rounded-lg bg-secondary p-3 text-xs text-secondary-foreground">
              La conexión con la base de datos aún no está configurada.
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={submitting || loading}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Entrar
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Uso interno del equipo clínico de Tooth Boutique.
        </p>
      </div>
    </main>
  );
}
