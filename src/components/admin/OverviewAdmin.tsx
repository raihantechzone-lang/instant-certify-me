import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { card, type Notify } from "./shared";

interface Stat {
  label: string;
  value: string;
}

interface Activity {
  id: string;
  text: string;
  at: string;
}

export default function OverviewAdmin({ notify: _notify }: { notify: Notify }) {
  const [stats, setStats] = useState<Stat[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [invoices, students, instructors, courses, enrollToday, recentInvoices, recentEnrollments, recentPayouts] =
      await Promise.all([
        supabase.from("invoices").select("amount, discount"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("instructor_profiles").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("enrollments").select("id", { count: "exact", head: true }).gte("enrolled_at", startOfDay.toISOString()),
        supabase.from("invoices").select("id, full_name, amount, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("enrollments").select("id, course_id, enrolled_at").order("enrolled_at", { ascending: false }).limit(5),
        supabase.from("payout_requests").select("id, amount, status, created_at").order("created_at", { ascending: false }).limit(5),
      ]);

    const revenue = ((invoices.data as { amount: number; discount: number }[]) ?? []).reduce(
      (sum, r) => sum + Number(r.amount || 0) - Number(r.discount || 0),
      0,
    );

    setStats([
      { label: "Total revenue", value: `৳${revenue.toLocaleString()}` },
      { label: "Students", value: String(students.count ?? 0) },
      { label: "Approved instructors", value: String(instructors.count ?? 0) },
      { label: "Courses", value: String(courses.count ?? 0) },
      { label: "Enrollments today", value: String(enrollToday.count ?? 0) },
    ]);

    const acts: Activity[] = [
      ...((recentInvoices.data as { id: string; full_name: string | null; amount: number; created_at: string }[]) ?? []).map((r) => ({
        id: `inv-${r.id}`,
        text: `Invoice paid: ${r.full_name ?? "Student"} — ৳${r.amount}`,
        at: r.created_at,
      })),
      ...((recentEnrollments.data as { id: string; course_id: string; enrolled_at: string | null }[]) ?? []).map((r) => ({
        id: `enr-${r.id}`,
        text: `New enrollment in course ${r.course_id}`,
        at: r.enrolled_at ?? "",
      })),
      ...((recentPayouts.data as { id: string; amount: number; status: string; created_at: string }[]) ?? []).map((r) => ({
        id: `pay-${r.id}`,
        text: `Payout request ৳${r.amount} — ${r.status}`,
        at: r.created_at,
      })),
    ].sort((a, b) => (b.at > a.at ? 1 : -1)).slice(0, 10);

    setActivity(acts);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((s) => (
          <div key={s.label} className={card}>
            <p className="text-xs font-bold text-ink-muted">{s.label}</p>
            <p className="text-2xl font-extrabold text-ink mt-1">{s.value}</p>
          </div>
        ))}
      </div>
      <div className={card}>
        <h2 className="font-bold text-ink mb-4">Recent activity</h2>
        {loading && <p className="text-sm text-ink-muted">Loading…</p>}
        <ul className="divide-y divide-border">
          {activity.map((a) => (
            <li key={a.id} className="py-3 text-sm text-ink flex justify-between gap-4">
              <span>{a.text}</span>
              <span className="text-xs text-ink-muted whitespace-nowrap">{a.at ? new Date(a.at).toLocaleString() : ""}</span>
            </li>
          ))}
          {!loading && activity.length === 0 && <li className="py-3 text-sm text-ink-muted">No activity yet.</li>}
        </ul>
      </div>
    </div>
  );
}
