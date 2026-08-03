import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useInstructorAccess } from "@/components/instructor/useInstructorAccess";
import { InstructorShell } from "@/components/instructor/InstructorShell";

export const Route = createFileRoute("/instructor/students")({
  head: () => ({
    meta: [
      { title: "My Students — Instructor — Gators Learning" },
      { name: "description", content: "See who is enrolled in your courses and how far they have progressed." },
      { property: "og:title", content: "My Students — Instructor — Gators Learning" },
      { property: "og:description", content: "Track enrolled students and their progress." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InstructorStudentsPage,
});

interface Row {
  id: string;
  name: string;
  email: string | null;
  course: string;
  enrolled_at: string | null;
  progress: number;
}

function InstructorStudentsPage() {
  const { user, loading, isApproved } = useInstructorAccess();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!user || !isApproved) return;
    let cancelled = false;
    (async () => {
      const { data: courses } = await supabase.from("courses").select("id, title").eq("instructor_id", user.id);
      const ids = (courses ?? []).map((c) => c.id);
      if (ids.length === 0) {
        if (!cancelled) setBusy(false);
        return;
      }
      const courseMap = new Map((courses ?? []).map((c) => [c.id, c.title]));
      const [{ data: enrollments }, { data: contents }] = await Promise.all([
        supabase.from("enrollments").select("id, profile_id, course_id, enrolled_at").in("course_id", ids),
        supabase.from("course_contents").select("id, course_id").in("course_id", ids),
      ]);
      const studentIds = [...new Set((enrollments ?? []).map((e) => e.profile_id))];
      const [{ data: profiles }, { data: progress }] = await Promise.all([
        studentIds.length
          ? supabase.from("profiles").select("id, full_name, email").in("id", studentIds)
          : Promise.resolve({ data: [] as { id: string; full_name: string | null; email: string | null }[] }),
        studentIds.length
          ? supabase.from("lesson_progress").select("user_id, course_id, completed").in("course_id", ids)
          : Promise.resolve({ data: [] as { user_id: string; course_id: string; completed: boolean }[] }),
      ]);
      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      const totalPerCourse = new Map<string, number>();
      for (const c of contents ?? []) totalPerCourse.set(c.course_id, (totalPerCourse.get(c.course_id) ?? 0) + 1);

      if (cancelled) return;
      setRows(
        (enrollments ?? []).map((e) => {
          const done = (progress ?? []).filter((p) => p.user_id === e.profile_id && p.course_id === e.course_id && p.completed).length;
          const total = totalPerCourse.get(e.course_id) ?? 0;
          const prof = profileMap.get(e.profile_id);
          return {
            id: e.id,
            name: prof?.full_name ?? "Student",
            email: (prof as { email?: string | null } | undefined)?.email ?? null,
            course: courseMap.get(e.course_id) ?? "Course",
            enrolled_at: e.enrolled_at,
            progress: total ? Math.round((done / total) * 100) : 0,
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

  const filtered = rows.filter(
    (r) => r.name.toLowerCase().includes(q.toLowerCase()) || r.course.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <InstructorShell title="My Students">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by student or course…"
        className="w-full max-w-sm mb-6 rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-brand"
      />
      <div className="rounded-2xl bg-background border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-ink-muted">
            <tr>
              <th className="text-left px-4 py-3 font-bold">Student</th>
              <th className="text-left px-4 py-3 font-bold">Course</th>
              <th className="text-left px-4 py-3 font-bold">Enrolled</th>
              <th className="text-left px-4 py-3 font-bold">Progress</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {busy && (
              <tr>
                <td className="px-4 py-4 text-ink-muted" colSpan={4}>
                  Loading…
                </td>
              </tr>
            )}
            {!busy && filtered.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-ink-muted" colSpan={4}>
                  No students yet.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-bold text-ink">{r.name}</td>
                <td className="px-4 py-3 text-ink-muted">{r.course}</td>
                <td className="px-4 py-3 text-ink-muted">{r.enrolled_at ? new Date(r.enrolled_at).toLocaleDateString() : "—"}</td>
                <td className="px-4 py-3 text-ink-muted">{r.progress}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </InstructorShell>
  );
}
