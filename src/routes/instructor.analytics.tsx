import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useInstructorAccess } from "@/components/instructor/useInstructorAccess";
import { InstructorShell, StatCard } from "@/components/instructor/InstructorShell";

export const Route = createFileRoute("/instructor/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Instructor — Gators Learning" },
      { name: "description", content: "Per-course enrollments, revenue, completion rate and ratings." },
      { property: "og:title", content: "Analytics — Instructor — Gators Learning" },
      { property: "og:description", content: "Course performance analytics." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InstructorAnalyticsPage,
});

interface Row {
  id: string;
  title: string;
  enrollments: number;
  revenue: number;
  completion: number;
  rating: number;
}

function InstructorAnalyticsPage() {
  const { user, loading, isApproved } = useInstructorAccess();
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!user || !isApproved) return;
    let cancelled = false;
    (async () => {
      const { data: courses } = await supabase
        .from("courses")
        .select("id, title, rating_avg")
        .eq("instructor_id", user.id);
      const ids = (courses ?? []).map((c) => c.id);
      if (ids.length === 0) {
        if (!cancelled) setBusy(false);
        return;
      }
      const [{ data: enrollments }, { data: invoices }, { data: contents }, { data: progress }] = await Promise.all([
        supabase.from("enrollments").select("profile_id, course_id").in("course_id", ids),
        supabase.from("invoices").select("amount, discount, course_id").in("course_id", ids).eq("status", "paid"),
        supabase.from("course_contents").select("id, course_id").in("course_id", ids),
        supabase.from("lesson_progress").select("user_id, course_id, completed").in("course_id", ids),
      ]);
      if (cancelled) return;
      setRows(
        (courses ?? []).map((c) => {
          const enrolled = (enrollments ?? []).filter((e) => e.course_id === c.id);
          const lessonCount = (contents ?? []).filter((x) => x.course_id === c.id).length;
          const perStudentDone = new Map<string, number>();
          for (const p of progress ?? []) {
            if (p.course_id === c.id && p.completed) perStudentDone.set(p.user_id, (perStudentDone.get(p.user_id) ?? 0) + 1);
          }
          const completedStudents = [...perStudentDone.values()].filter((n) => lessonCount > 0 && n >= lessonCount).length;
          return {
            id: c.id,
            title: c.title,
            enrollments: enrolled.length,
            revenue: (invoices ?? [])
              .filter((i) => i.course_id === c.id)
              .reduce((s, i) => s + (Number(i.amount) - Number(i.discount ?? 0)), 0),
            completion: enrolled.length ? Math.round((completedStudents / enrolled.length) * 100) : 0,
            rating: Number(c.rating_avg ?? 0),
          };
        })
      );
      setBusy(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isApproved]);

  if (loading || !isApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-alt">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalEnroll = rows.reduce((s, r) => s + r.enrollments, 0);
  const avgCompletion = rows.length ? Math.round(rows.reduce((s, r) => s + r.completion, 0) / rows.length) : 0;

  return (
    <InstructorShell title="Analytics">
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <StatCard label="Total Enrollments" value={busy ? "…" : totalEnroll} />
        <StatCard label="Gross Revenue" value={busy ? "…" : `৳${totalRevenue.toFixed(2)}`} />
        <StatCard label="Avg. Completion" value={busy ? "…" : `${avgCompletion}%`} />
      </div>

      <div className="rounded-2xl bg-background border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-ink-muted">
            <tr>
              <th className="text-left px-4 py-3 font-bold">Course</th>
              <th className="text-left px-4 py-3 font-bold">Enrollments</th>
              <th className="text-left px-4 py-3 font-bold">Revenue</th>
              <th className="text-left px-4 py-3 font-bold">Completion</th>
              <th className="text-left px-4 py-3 font-bold">Rating</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {!busy && rows.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-ink-muted" colSpan={5}>
                  No courses yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-bold text-ink">{r.title}</td>
                <td className="px-4 py-3 text-ink-muted">{r.enrollments}</td>
                <td className="px-4 py-3 text-ink-muted">৳{r.revenue.toFixed(2)}</td>
                <td className="px-4 py-3 text-ink-muted">{r.completion}%</td>
                <td className="px-4 py-3 text-ink-muted">{r.rating.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </InstructorShell>
  );
}
