import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useInstructorAccess } from "@/components/instructor/useInstructorAccess";
import { InstructorShell, StatCard, StatusBadge } from "@/components/instructor/InstructorShell";

export const Route = createFileRoute("/instructor/earnings")({
  head: () => ({
    meta: [
      { title: "Earnings & Payouts — Instructor — Gators Learning" },
      { name: "description", content: "Track your course revenue, commission share and request payouts." },
      { property: "og:title", content: "Earnings & Payouts — Instructor — Gators Learning" },
      { property: "og:description", content: "Revenue, commission and payout requests." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InstructorEarningsPage,
});

interface Payout {
  id: string;
  amount: number;
  method: string;
  account: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
}

function InstructorEarningsPage() {
  const { user, loading, isApproved, instructorProfile } = useInstructorAccess();
  const [gross, setGross] = useState(0);
  const [rate, setRate] = useState(70);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [form, setForm] = useState({ amount: "", method: "bkash", account: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data: courses } = await supabase.from("courses").select("id").eq("instructor_id", user.id);
    const ids = (courses ?? []).map((c) => c.id);
    const { data: invoices } = ids.length
      ? await supabase.from("invoices").select("amount, discount").in("course_id", ids).eq("status", "paid")
      : { data: [] as { amount: number; discount: number }[] };
    setGross((invoices ?? []).reduce((s, i) => s + (Number(i.amount) - Number(i.discount ?? 0)), 0));
    const { data: p } = await supabase
      .from("payout_requests")
      .select("*")
      .eq("instructor_id", user.id)
      .order("created_at", { ascending: false });
    setPayouts((p as Payout[]) ?? []);
  }, [user]);

  useEffect(() => {
    if (user && isApproved) load();
  }, [user, isApproved, load]);

  useEffect(() => {
    if (instructorProfile) {
      setRate(instructorProfile.commission_rate ?? 70);
      setForm((f) => ({
        ...f,
        method: instructorProfile.payout_method ?? "bkash",
        account: instructorProfile.payout_account ?? "",
      }));
    }
  }, [instructorProfile]);

  const net = (gross * rate) / 100;
  const requested = payouts.filter((p) => p.status !== "rejected").reduce((s, p) => s + Number(p.amount), 0);
  const available = Math.max(0, net - requested);

  const requestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const amount = Number(form.amount);
    if (!amount || amount <= 0) return;
    if (amount > available) {
      setMsg("Amount exceeds your available balance.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("payout_requests").insert({
      instructor_id: user.id,
      amount,
      method: form.method,
      account: form.account || null,
    });
    setBusy(false);
    setMsg(error ? error.message : "Payout request submitted.");
    if (!error) {
      setForm((f) => ({ ...f, amount: "" }));
      load();
    }
  };

  if (loading || !isApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-alt">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  return (
    <InstructorShell title="Earnings & Payouts">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard label="Gross Sales" value={`৳${gross.toFixed(2)}`} />
        <StatCard label="Your Share" value={`৳${net.toFixed(2)}`} hint={`${rate}% commission`} />
        <StatCard label="Requested / Paid" value={`৳${requested.toFixed(2)}`} />
        <StatCard label="Available" value={`৳${available.toFixed(2)}`} />
      </div>

      <form onSubmit={requestPayout} className="rounded-2xl bg-background border border-border p-6 mb-8 grid gap-3 sm:grid-cols-4">
        <input
          type="number"
          min="1"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          placeholder="Amount"
          className="rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm outline-none focus:border-brand"
          required
        />
        <select
          value={form.method}
          onChange={(e) => setForm({ ...form, method: e.target.value })}
          className="rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm outline-none focus:border-brand"
        >
          <option value="bkash">bKash</option>
          <option value="bank">Bank</option>
        </select>
        <input
          value={form.account}
          onChange={(e) => setForm({ ...form, account: e.target.value })}
          placeholder="Account / number"
          className="rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm outline-none focus:border-brand"
        />
        <button disabled={busy} className="px-5 py-3 rounded-xl bg-brand text-brand-foreground text-sm font-bold disabled:opacity-60">
          {busy ? "Sending…" : "Request payout"}
        </button>
        {msg && <p className="sm:col-span-4 text-sm text-ink-muted">{msg}</p>}
      </form>

      <div className="rounded-2xl bg-background border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-ink-muted">
            <tr>
              <th className="text-left px-4 py-3 font-bold">Date</th>
              <th className="text-left px-4 py-3 font-bold">Amount</th>
              <th className="text-left px-4 py-3 font-bold">Method</th>
              <th className="text-left px-4 py-3 font-bold">Status</th>
              <th className="text-left px-4 py-3 font-bold">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {payouts.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-ink-muted" colSpan={5}>
                  No payout requests yet.
                </td>
              </tr>
            )}
            {payouts.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 text-ink-muted">{new Date(p.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 font-bold text-ink">৳{Number(p.amount).toFixed(2)}</td>
                <td className="px-4 py-3 text-ink-muted capitalize">{p.method}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-4 py-3 text-ink-muted">{p.admin_note ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </InstructorShell>
  );
}
