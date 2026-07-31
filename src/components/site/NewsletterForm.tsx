import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from("newsletter_subscribers").insert({ email });
    setBusy(false);
    if (err && !err.message.toLowerCase().includes("duplicate") && err.code !== "23505") {
      setError(err.message);
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <p className="text-sm font-semibold text-brand bg-brand-soft rounded-xl px-4 py-3">
        Thanks for subscribing! 🎉
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email address"
        className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-brand"
      />
      <button
        type="submit"
        disabled={busy}
        className="px-6 py-3 rounded-xl bg-brand text-brand-foreground font-bold text-sm disabled:opacity-60"
      >
        {busy ? "Subscribing…" : "Subscribe"}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </form>
  );
}
