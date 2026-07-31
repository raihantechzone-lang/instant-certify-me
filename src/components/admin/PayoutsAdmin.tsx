import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { btn, btnGhost, card, input, type Notify } from "./shared";

interface PayoutRow {
  id: string;
  instructor_id: string;
  amount: number;
  method: string;
  account: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  processed_at: string | null;
}

export default function PayoutsAdmin({ notify }: { notify: Notify }) {
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = () =>
    supabase
      .from("payout_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows((data as PayoutRow[]) ?? []));

  useEffect(() => {
    load();
    const channel = supabase
      .channel("payouts-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "payout_requests" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const decide = async (r: PayoutRow, status: "approved" | "paid" | "rejected") => {
    const { error } = await supabase
      .from("payout_requests")
      .update({ status, admin_note: notes[r.id] ?? r.admin_note, processed_at: new Date().toISOString() })
      .eq("id", r.id);
    notify(error ? error.message : `Payout ${status}`);
    load();
  };

  const pending = rows.filter((r) => r.status === "pending" || r.status === "approved");
  const history = rows.filter((r) => r.status === "paid" || r.status === "rejected");

  return (
    <div className="space-y-6">
      <div className={card}>
        <h2 className="font-bold text-ink mb-4">Payout requests</h2>
        <ul className="divide-y divide-border">
          {pending.map((r) => (
            <li key={r.id} className="py-4 space-y-2">
              <p className="font-bold text-sm text-ink">Instructor {r.instructor_id}</p>
              <p className="text-sm text-ink-muted">
                ৳{r.amount} via {r.method} · {r.account ?? "—"} · <span className="capitalize font-bold">{r.status}</span>
              </p>
              <input
                className={input}
                placeholder="Admin note"
                value={notes[r.id] ?? r.admin_note ?? ""}
                onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
              />
              <div className="flex gap-2">
                {r.status === "pending" && (
                  <button onClick={() => decide(r, "approved")} className={btn}>
                    Approve
                  </button>
                )}
                <button onClick={() => decide(r, "paid")} className={btn}>
                  Mark paid
                </button>
                <button onClick={() => decide(r, "rejected")} className={btnGhost}>
                  Reject
                </button>
              </div>
            </li>
          ))}
          {pending.length === 0 && <p className="text-sm text-ink-muted">No pending payouts.</p>}
        </ul>
      </div>

      <div className={card}>
        <h2 className="font-bold text-ink mb-4">History</h2>
        <ul className="divide-y divide-border">
          {history.map((r) => (
            <li key={r.id} className="py-3 text-sm text-ink-muted">
              ৳{r.amount} · <span className="capitalize font-bold text-ink">{r.status}</span> · {r.admin_note ?? ""} ·{" "}
              {r.processed_at ? new Date(r.processed_at).toLocaleString() : ""}
            </li>
          ))}
          {history.length === 0 && <p className="text-sm text-ink-muted">No processed payouts yet.</p>}
        </ul>
      </div>
    </div>
  );
}
