import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useInstructorAccess } from "@/components/instructor/useInstructorAccess";
import { InstructorShell } from "@/components/instructor/InstructorShell";

export const Route = createFileRoute("/instructor/announcements")({
  head: () => ({
    meta: [
      { title: "Announcements — Instructor — Gators Learning" },
      { name: "description", content: "Post announcements to the students enrolled in your courses." },
      { property: "og:title", content: "Announcements — Instructor — Gators Learning" },
      { property: "og:description", content: "Send course announcements to your students." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InstructorAnnouncementsPage,
});

interface Announcement {
  id: string;
  course_id: string | null;
  title: string;
  body: string;
  created_at: string;
}

function InstructorAnnouncementsPage() {
  const { user, loading, isApproved } = useInstructorAccess();
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [items, setItems] = useState<Announcement[]>([]);
  const [form, setForm] = useState({ course_id: "", title: "", body: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data: c } = await supabase.from("courses").select("id, title").eq("instructor_id", user.id);
    setCourses((c as { id: string; title: string }[]) ?? []);
    const { data: a } = await supabase
      .from("announcements")
      .select("*")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false });
    setItems((a as Announcement[]) ?? []);
  }, [user]);

  useEffect(() => {
    if (user && isApproved) load();
  }, [user, isApproved, load]);

  const post = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.title.trim() || !form.body.trim()) return;
    setBusy(true);
    await supabase.from("announcements").insert({
      course_id: form.course_id || null,
      author_id: user.id,
      title: form.title.trim(),
      body: form.body.trim(),
    });
    setBusy(false);
    setForm({ course_id: form.course_id, title: "", body: "" });
    load();
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this announcement?")) return;
    await supabase.from("announcements").delete().eq("id", id);
    load();
  };

  if (loading || !isApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-alt">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  const courseTitle = (id: string | null) => courses.find((c) => c.id === id)?.title ?? "All students";

  return (
    <InstructorShell title="Announcements">
      <form onSubmit={post} className="rounded-2xl bg-background border border-border p-6 mb-8 space-y-3">
        <select
          value={form.course_id}
          onChange={(e) => setForm({ ...form, course_id: e.target.value })}
          className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm outline-none focus:border-brand"
        >
          <option value="">All my students</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Title"
          className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm outline-none focus:border-brand"
          required
        />
        <textarea
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          placeholder="Write your announcement…"
          rows={4}
          className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm outline-none focus:border-brand"
          required
        />
        <button disabled={busy} className="px-5 py-3 rounded-xl bg-brand text-brand-foreground text-sm font-bold disabled:opacity-60">
          {busy ? "Posting…" : "Post announcement"}
        </button>
      </form>

      <div className="space-y-3">
        {items.length === 0 && <p className="text-sm text-ink-muted">No announcements yet.</p>}
        {items.map((a) => (
          <div key={a.id} className="rounded-2xl bg-background border border-border p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-ink">{a.title}</h3>
                <p className="text-xs text-ink-muted mt-1">
                  {courseTitle(a.course_id)} • {new Date(a.created_at).toLocaleString()}
                </p>
              </div>
              <button className="text-xs font-bold text-destructive" onClick={() => remove(a.id)}>
                Delete
              </button>
            </div>
            <p className="text-sm text-ink-muted mt-3 whitespace-pre-wrap">{a.body}</p>
          </div>
        ))}
      </div>
    </InstructorShell>
  );
}
