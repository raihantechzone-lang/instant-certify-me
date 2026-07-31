import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site/SiteHeader";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Gators Learning" },
      { name: "description", content: "Choose a new password for your Gators Learning student account." },
      { property: "og:title", content: "Reset password — Gators Learning" },
      { property: "og:description", content: "Set a new password and get back to your courses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase delivers a recovery session through the URL hash.
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (hash.includes("type=recovery")) setReady(true);
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(err.message);
    setDone(true);
    setTimeout(() => router.navigate({ to: "/dashboard", replace: true }), 1200);
  };

  return (
    <div className="min-h-screen bg-surface-alt">
      <SiteHeader />
      <main className="pt-32 sm:pt-40 pb-20 px-4">
        <div className="max-w-md mx-auto bg-background rounded-2xl border border-border shadow-lg p-8">
          <h1 className="text-2xl font-bold text-ink">Set a new password</h1>
          <p className="text-sm text-ink-muted mt-1 mb-6 font-bengali">নতুন পাসওয়ার্ড দিন</p>

          {done ? (
            <p className="text-sm font-bold text-brand">Password updated. Taking you to your dashboard…</p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {!ready && (
                <p className="text-xs text-ink-muted">
                  Open this page from the reset link in your email, otherwise the update will fail.
                </p>
              )}
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
                className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm outline-none focus:border-brand"
              />
              <input
                required
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm new password"
                className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm outline-none focus:border-brand"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="w-full py-3.5 rounded-xl bg-brand text-brand-foreground font-bold disabled:opacity-60"
              >
                {busy ? "Please wait…" : "Update password"}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
