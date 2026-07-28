import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, signInWithGoogle } from "@/lib/auth";
import { SiteHeader } from "@/components/site/SiteHeader";

type Mode = "login" | "signup";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { mode: Mode } => ({
    mode: search.mode === "signup" ? "signup" : "login",
  }),
  head: () => ({
    meta: [
      { title: "Log in — Gators Learning" },
      { name: "description", content: "Log in or create your Gators Learning student account." },
      { property: "og:title", content: "Log in — Gators Learning" },
      { property: "og:description", content: "Access your courses, live classes and certificates." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const { user } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Session is persisted, so a logged-in visitor goes straight to the dashboard.
  useEffect(() => {
    if (user) router.navigate({ to: "/dashboard", replace: true });
  }, [user, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res =
      mode === "signup"
        ? await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin + "/dashboard" },
          })
        : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (res.error) setError(res.error.message);
    else router.navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-surface-alt">
      <SiteHeader />
      <main className="pt-32 sm:pt-40 pb-20 px-4">
        <div className="max-w-md mx-auto bg-background rounded-2xl border border-border shadow-lg p-8">
          <h1 className="text-2xl font-bold text-ink">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
          <p className="text-sm text-ink-muted mt-1 mb-6 font-bengali">
            {mode === "signup" ? "নতুন একাউন্ট খুলুন" : "আপনার একাউন্টে লগ ইন করুন"}
          </p>

          <button
            onClick={() => signInWithGoogle()}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border-2 border-border font-bold text-sm hover:bg-muted transition"
          >
            <img src="https://www.google.com/favicon.ico" alt="" className="h-5 w-5" />
            Continue with Google
          </button>

          <div className="flex items-center gap-3 my-6 text-xs text-ink-muted">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name"
                className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm outline-none focus:border-brand"
              />
            )}
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm outline-none focus:border-brand"
            />
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "Password" : "Password or Roll number"}
              className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm outline-none focus:border-brand"
            />
            {mode === "login" && (
              <p className="text-xs text-ink-muted font-bengali">
                কোর্স কেনার সময় পাওয়া Roll Number দিয়েই লগ ইন করতে পারবেন।
              </p>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full py-3.5 rounded-xl bg-brand text-brand-foreground font-bold disabled:opacity-60"
            >
              {busy ? "Please wait…" : mode === "signup" ? "Sign up" : "Log in"}
            </button>
          </form>

          <p className="text-sm text-center mt-6 text-ink-muted">
            {mode === "signup" ? "Already have an account?" : "New to Gators Learning?"}{" "}
            <Link
              to="/auth"
              search={{ mode: mode === "signup" ? "login" : "signup" }}
              className="font-bold text-brand hover:underline"
            >
              {mode === "signup" ? "Log in" : "Sign up"}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
