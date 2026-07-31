import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { btn, btnGhost, card, input, type Notify } from "./shared";

interface RefundRow {
  id: string;
  user_id: string;
  invoice_id: string | null;
  course_id: string | null;
  reason: string;
  status: string;
  admin_note: string | null;
  created_at: string;
}

export default function RefundsAdmin({ notify }: { notify: Notify }) {
  const [rows, setRows] = useState<RefundRow[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = () =>
    supabase
      .from("refund_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows((data as RefundRow[]) ?? []));

  useEffect(() => {
    load();
    const channel = supabase
      .channel("refunds-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "refund_requests" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const approve = async (r: RefundRow) => {
    const { error } = await supabase
      .from("refund_requests")
      .update({ status: "approved", admin_note: notes[r.id] ?? r.admin_note, processed_at: new Date().toISOString() })
      .eq("id", r.id);
    if (error) return notify(error.message);
    if (r.invoice_id) await supabase.from("invoices").update({ status: "refunded" }).eq("id", r.invoice_id);
    if (r.course_id) {
      await supabase.from("enrollments").update({ status: "refunded" }).eq("profile_id", r.user_id).eq("course_id", r.course_id);
    }
    notify("Refund approved");
    load();
  };

  const reject = async (r: RefundRow) => {
    const { error } = await supabase
      .from("refund_requests")
      .update({ status: "rejected", admin_note: notes[r.id] ?? r.admin_note, processed_at: new Date().toISOString() })
      .eq("id", r.id);
    notify(error ? error.message : "Refund rejected");
    load();
  };

  return (
    <div className={card}>
      <h2 className="font-bold text-ink mb-4">Refund requests</h2>
      <ul className="divide-y divide-border">
        {rows.map((r) => (
          <li key={r.id} className="py-4 space-y-2">
            <p className="font-bold text-sm text-ink">User {r.user_id}</p>
            <p className="text-sm text-ink-muted">{r.reason}</p>
            <p className="text-xs font-bold capitalize text-brand">{r.status}</p>
            {r.status === "pending" && (
              <>
                <input
                  className={input}
                  placeholder="Admin note"
                  value={notes[r.id] ?? ""}
                  onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                />
                <div className="flex gap-2">
                  <button onClick={() => approve(r)} className={btn}>
                    Approve
                  </button>
                  <button onClick={() => reject(r)} className={btnGhost}>
                    Reject
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
        {rows.length === 0 && <p className="text-sm text-ink-muted">No refund requests.</p>}
      </ul>
    </div>
  );
}
