import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useInstructorAccess } from "@/components/instructor/useInstructorAccess";
import { InstructorShell, StatCard } from "@/components/instructor/InstructorShell";

export const Route = createFileRoute("/instructor")({
  head: () => ({
    meta: [
      { title: "Instructor Dashboard — Gators Learning" },
      { name: "description", content: "Overview of your courses, students, revenue and ratings." },
      { property: "og:title", content: "Instructor Dashboard — Gators Learning" },
      { property: "og:description", content: "Manage your teaching on Gators Learning." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InstructorDashboard,
});

interface Recent {
  id: string;
  enrolled_at: string | null;
  course_title: string;
  student_name: string;
}

function InstructorDashboard() {
  const { user, loading, isApproved } = useInstructorAccess();
  const [stats, setStats] = useState({ students: 0, revenue: 0, rating: 0, courses: 0 });
  const [recent, setRecent] = useState<Recent[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!user || !isApproved) return;
    let cancelled = false;
    (async () => {
      const { data: courses } = await supabase
        .from("courses")
        .select("id, title, rating_avg")
        .eq("instructor_id", user.id);
      const courseIds = (courses ?? []).map((c) => c.id);
      if (courseIds.length === 0) {
        if (!cancelled) setDataLoading(false);
        return;
      }
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("id, profile_id, course_id, enrolled_at")
        .in("course_id", courseIds);
      const { data: invoices } = await supabase
        .from("invoices")
        .select("amount, discount, course_id, status")
        .in("course_id", courseIds)
        .eq("status", "paid");
      const { data: instructorProfile } = await supabase
        .from("instructor_profiles")
        .select("commission_rate")
        .eq("id", user.id)
        .maybeSingle();
      const rate = (instructorProfile?.commission_rate ?? 70) / 100;
      const revenue = (invoices ?? []).reduce((sum, inv) => sum + (Number(inv.amount) - Number(inv.discount ?? 0)) * rate, 0);
      const uniqueStudents = new Set((enrollments ?? []).map((e) => e.profile_id));
      const ratings = (courses ?? []).map((c) => Number(c.rating_avg ?? 0)).filter((r) => r > 0);
      const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

      const courseMap = new Map((courses ?? []).map((c) => [c.id, c.title]));
      const recentEnrollments = [...(enrollments ?? [])]
        .sort((a, b) => new Date(b.enrolled_at ?? 0).getTime() - new Date(a.enrolled_at ?? 0).getTime())
        .slice(0, 8);
      const studentIds = recentEnrollments.map((e) => e.profile_id);
      const { data: profiles } = studentIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", studentIds)
        : { data: [] as { id: string; full_name: string | null }[] };
      const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? "Student"]));

      if (cancelled) return;
      setStats({ students: uniqueStudents.size, revenue, rating: avgRating, courses: courseIds.length });
      setRecent(
        recentEnrollments.map((e) => ({
          id: e.id,
          enrolled_at: e.enrolled_at,
          course_title: courseMap.get(e.course_id) ?? "Course",
          student_name: nameMap.get(e.profile_id) ?? "Student",
        }))
      );
      setDataLoading(false);
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

  return (
    <InstructorShell title="Instructor Dashboard">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard label="Total Courses" value={dataLoading ? "…" : stats.courses} />
        <StatCard label="Total Students" value={dataLoading ? "…" : stats.students} />
        <StatCard label="Total Revenue" value={dataLoading ? "…" : `৳${stats.revenue.toFixed(2)}`} hint="Your share, after commission" />
        <StatCard label="Avg. Rating" value={dataLoading ? "…" : stats.rating.toFixed(2)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <Link to="/instructor/courses" className="rounded-2xl bg-brand-soft text-brand p-5 font-bold hover:opacity-90">
          Manage Courses →
        </Link>
        <Link to="/instructor/students" className="rounded-2xl bg-brand-soft text-brand p-5 font-bold hover:opacity-90">
          View Students →
        </Link>
        <Link to="/instructor/earnings" className="rounded-2xl bg-brand-soft text-brand p-5 font-bold hover:opacity-90">
          Earnings & Payouts →
        </Link>
      </div>

      <div className="rounded-2xl bg-background border border-border p-6">
        <h2 className="font-bold text-ink mb-4">Recent Enrollments</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-ink-muted">No enrollments yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((r) => (
              <li key={r.id} className="py-3 flex items-center justify-between text-sm">
                <span className="text-ink font-bold">{r.student_name}</span>
                <span className="text-ink-muted">{r.course_title}</span>
                <span className="text-ink-muted text-xs">{r.enrolled_at ? new Date(r.enrolled_at).toLocaleDateString() : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </InstructorShell>
  );
}
