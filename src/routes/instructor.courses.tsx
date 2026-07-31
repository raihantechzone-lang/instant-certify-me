import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useInstructorAccess } from "@/components/instructor/useInstructorAccess";
import { InstructorShell, StatusBadge } from "@/components/instructor/InstructorShell";
import type { Course } from "@/lib/data";

export const Route = createFileRoute("/instructor/courses")({
  head: () => ({
    meta: [
      { title: "My Courses — Instructor — Gators Learning" },
      { name: "description", content: "Create and manage your courses." },
      { property: "og:title", content: "My Courses — Instructor — Gators Learning" },
      { property: "og:description", content: "Manage your course catalog." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InstructorCoursesPage,
});

type ICourse = Course & { id: string; status: string; level: string | null; review_feedback: string | null };

const EMPTY_FORM = { title: "", details: "", category: "", price: "", discount_price: "", thumbnail_url: "", level: "all" };

function InstructorCoursesPage() {
  const { user, loading, isApproved } = useInstructorAccess();
  const [courses, setCourses] = useState<ICourse[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("courses").select("*").eq("instructor_id", user.id).order("created_at", { ascending: false });
    setCourses((data as ICourse[]) ?? []);
  };

  useEffect(() => {
    if (user && isApproved) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isApproved]);

  const createCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    await supabase.from("courses").insert({
      title: form.title,
      details: form.details || null,
      category: form.category || null,
      price: form.price ? Number(form.price) : 0,
      discount_price: form.discount_price ? Number(form.discount_price) : null,
      thumbnail_url: form.thumbnail_url || null,
      level: form.level,
      instructor_id: user.id,
      status: "draft",
    });
    setBusy(false);
    setForm(EMPTY_FORM);
    setShowForm(false);
    load();
  };

  const submitForApproval = async (id: string) => {
    await supabase.from("courses").update({ status: "pending" }).eq("id", id);
    load();
  };

  if (loading || !isApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-alt">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  return (
    <InstructorShell title="My Courses">
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-5 py-2.5 rounded-xl bg-brand text-brand-foreground text-sm font-bold"
        >
          {showForm ? "Cancel" : "+ New course"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createCourse} className="rounded-2xl bg-background border border-border p-6 mb-8 space-y-3">
          <input required placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm outline-none focus:border-brand" />
          <textarea placeholder="Details" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} rows={3}
            className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm outline-none focus:border-brand" />
          <div className="grid sm:grid-cols-2 gap-3">
            <input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm outline-none focus:border-brand" />
            <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}
              className="rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm outline-none focus:border-brand">
              <option value="all">All levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            <input type="number" step="0.01" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm outline-none focus:border-brand" />
            <input type="number" step="0.01" placeholder="Discount price" value={form.discount_price} onChange={(e) => setForm({ ...form, discount_price: e.target.value })}
              className="rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm outline-none focus:border-brand" />
          </div>
          <input placeholder="Thumbnail URL" value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
            className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm outline-none focus:border-brand" />
          <button disabled={busy} className="px-5 py-3 rounded-xl bg-brand text-brand-foreground text-sm font-bold disabled:opacity-60">
            {busy ? "Creating…" : "Create draft course"}
          </button>
        </form>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {courses.length === 0 && <p className="text-ink-muted">You haven't created any courses yet.</p>}
        {courses.map((c) => (
          <div key={c.id} className="rounded-2xl bg-background border border-border shadow-sm overflow-hidden">
            {c.thumbnail_url && <img src={c.thumbnail_url} alt="" className="h-36 w-full object-cover" />}
            <div className="p-5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-bold text-ink">{c.title}</h2>
                <StatusBadge status={c.status} />
              </div>
              {c.status === "rejected" && c.review_feedback && (
                <p className="text-xs text-destructive">{c.review_feedback}</p>
              )}
              <div className="flex gap-2 pt-2">
                <Link
                  to="/instructor/courses/$courseId"
                  params={{ courseId: c.id }}
                  className="px-4 py-2 rounded-xl bg-ink text-background text-xs font-bold"
                >
                  Open builder
                </Link>
                {c.status === "draft" && (
                  <button onClick={() => submitForApproval(c.id)} className="px-4 py-2 rounded-xl bg-brand-soft text-brand text-xs font-bold">
                    Submit for approval
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </InstructorShell>
  );
}
