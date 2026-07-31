import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { btn, btnGhost, card, input, type Notify } from "./shared";

interface InstructorProfile {
  id: string;
  display_name: string | null;
  bio: string | null;
  photo_url: string | null;
  expertise: string | null;
  status: string;
  commission_rate: number;
  payout_method: string | null;
  payout_account: string | null;
}

export default function InstructorsAdmin({ notify }: { notify: Notify }) {
  const [rows, setRows] = useState<InstructorProfile[]>([]);
  const [rates, setRates] = useState<Record<string, string>>({});

  const load = () =>
    supabase
      .from("instructor_profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows((data as InstructorProfile[]) ?? []));

  useEffect(() => {
    load();
    const channel = supabase
      .channel("instructor-profiles-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "instructor_profiles" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const setStatus = async (r: InstructorProfile, status: "approved" | "rejected") => {
    const commission_rate = rates[r.id] ? Number(rates[r.id]) : r.commission_rate;
    const { error } = await supabase.from("instructor_profiles").update({ status, commission_rate }).eq("id", r.id);
    if (error) return notify(error.message);
    if (status === "approved") {
      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert({ user_id: r.id, role: "instructor" }, { onConflict: "user_id,role" });
      if (roleError) notify(roleError.message);
    }
    notify(status === "approved" ? "Instructor approved" : "Instructor rejected");
    load();
  };

  const saveCommission = async (r: InstructorProfile) => {
    const commission_rate = rates[r.id] ? Number(rates[r.id]) : r.commission_rate;
    const { error } = await supabase.from("instructor_profiles").update({ commission_rate }).eq("id", r.id);
    notify(error ? error.message : "Commission rate saved");
    load();
  };

  return (
    <div className={card}>
      <h2 className="font-bold text-ink mb-4">Instructor applications</h2>
      <ul className="divide-y divide-border">
        {rows.map((r) => (
          <li key={r.id} className="py-4 flex flex-wrap items-start justify-between gap-4">
            <div className="flex gap-3">
              {r.photo_url ? (
                <img src={r.photo_url} alt="" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-brand-soft text-brand font-bold flex items-center justify-center">
                  {(r.display_name ?? "I").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-sm">
                <p className="font-bold text-ink">{r.display_name ?? r.id}</p>
                <p className="text-ink-muted">{r.expertise ?? "—"}</p>
                <p className="text-ink-muted">{r.bio ?? ""}</p>
                <p className="text-ink-muted">Payout: {r.payout_method ?? "—"} · {r.payout_account ?? "—"}</p>
                <p className="text-xs font-bold capitalize text-brand mt-1">{r.status}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <input
                  className={`${input} w-24`}
                  placeholder="Rate %"
                  value={rates[r.id] ?? String(r.commission_rate)}
                  onChange={(e) => setRates({ ...rates, [r.id]: e.target.value })}
                />
                <button onClick={() => saveCommission(r)} className="text-xs font-bold text-brand">
                  Save rate
                </button>
              </div>
              <div className="flex gap-2">
                {r.status !== "approved" && (
                  <button onClick={() => setStatus(r, "approved")} className={btn}>
                    Approve
                  </button>
                )}
                {r.status !== "rejected" && (
                  <button onClick={() => setStatus(r, "rejected")} className={btnGhost}>
                    Reject
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
        {rows.length === 0 && <p className="text-sm text-ink-muted">No instructor applications yet.</p>}
      </ul>
    </div>
  );
}
