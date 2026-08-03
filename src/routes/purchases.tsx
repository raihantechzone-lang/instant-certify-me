import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const Route = createFileRoute("/purchases")({
  head: () => ({
    meta: [
      { title: "My Purchases — Gators Learning" },
      { name: "description", content: "View your invoices, payments and request a refund for a course you bought." },
      { property: "og:title", content: "My Purchases — Gators Learning" },
      { property: "og:description", content: "Invoices, payments and refund requests." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PurchasesPage,
});

interface Invoice {
  id: string;
  invoice_no: string;
  course_id: string | null;
  amount: number;
  discount: number;
  coupon_code: string | null;
  method: string;
  transaction_id: string | null;
  status: string;
  created_at: string;
}

function PurchasesPage() {
  const { user, loading } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [refunds, setRefunds] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(true);

  const load = async (uid: string) => {
    const { data } = await supabase
      .from("invoices")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    const rows = (data as Invoice[]) ?? [];
    setInvoices(rows);
    const ids = [...new Set(rows.map((r) => r.course_id).filter(Boolean))] as string[];
    if (ids.length) {
      const { data: cs } = await supabase.from("courses").select("id, title").in("id", ids);
      setTitles(Object.fromEntries(((cs as { id: string; title: string }[]) ?? []).map((c) => [c.id, c.title])));
    }
    const { data: rr } = await supabase.from("refund_requests").select("invoice_id, status").eq("user_id", uid);
    setRefunds(
      Object.fromEntries(((rr as { invoice_id: string | null; status: string }[]) ?? []).map((r) => [r.invoice_id ?? "", r.status]))
    );
    setBusy(false);
  };

  useEffect(() => {
    if (!user) {
      if (!loading) setBusy(false);
      return;
    }
    load(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  const requestRefund = async (inv: Invoice) => {
    if (!user) return;
    const reason = window.prompt("Why do you want a refund?");
    if (!reason) return;
    await supabase.from("refund_requests").insert({
      user_id: user.id,
      invoice_id: inv.id,
      course_id: inv.course_id,
      reason,
    });
    load(user.id);
  };

  return (
    <div className="min-h-screen bg-surface-alt">
      <SiteHeader />
      <main className="pt-32 sm:pt-40 pb-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-ink mb-6">My Purchases</h1>

        {!loading && !user ? (
          <p className="text-sm text-ink-muted">
            Please{" "}
            <Link to="/auth" search={{ mode: "login" }} className="text-brand font-bold">
              log in
            </Link>{" "}
            to see your purchases.
          </p>
        ) : (
          <div className="rounded-2xl bg-background border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-alt text-ink-muted">
                <tr>
                  <th className="text-left px-4 py-3 font-bold">Invoice</th>
                  <th className="text-left px-4 py-3 font-bold">Course</th>
                  <th className="text-left px-4 py-3 font-bold">Paid</th>
                  <th className="text-left px-4 py-3 font-bold">Date</th>
                  <th className="text-left px-4 py-3 font-bold">Status</th>
                  <th className="text-left px-4 py-3 font-bold">Refund</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {busy && (
                  <tr>
                    <td className="px-4 py-4 text-ink-muted" colSpan={6}>
                      Loading…
                    </td>
                  </tr>
                )}
                {!busy && invoices.length === 0 && (
                  <tr>
                    <td className="px-4 py-4 text-ink-muted" colSpan={6}>
                      No purchases yet.
                    </td>
                  </tr>
                )}
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="px-4 py-3 font-bold text-ink">{inv.invoice_no}</td>
                    <td className="px-4 py-3 text-ink-muted">{inv.course_id ? titles[inv.course_id] ?? "Course" : "—"}</td>
                    <td className="px-4 py-3 text-ink-muted">
                      ৳{(Number(inv.amount) - Number(inv.discount ?? 0)).toFixed(2)}
                      {inv.coupon_code && <span className="text-xs"> ({inv.coupon_code})</span>}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{new Date(inv.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-ink-muted capitalize">{inv.status}</td>
                    <td className="px-4 py-3">
                      {refunds[inv.id] ? (
                        <span className="text-xs font-bold text-ink-muted capitalize">{refunds[inv.id]}</span>
                      ) : inv.status === "paid" ? (
                        <button className="text-xs font-bold text-brand" onClick={() => requestRefund(inv)}>
                          Request refund
                        </button>
                      ) : (
                        <span className="text-xs text-ink-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
