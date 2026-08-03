import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useInstructorAccess } from "@/components/instructor/useInstructorAccess";
import { InstructorShell, StatusBadge } from "@/components/instructor/InstructorShell";
import { LessonEditor, type LessonRow } from "@/components/instructor/LessonEditor";

export const Route = createFileRoute("/instructor/courses/$courseId")({
  head: () => ({
    meta: [
      { title: "Course Builder — Instructor — Gators Learning" },
      { name: "description", content: "Build your course curriculum: sections, lessons, quizzes and assignments." },
      { property: "og:title", content: "Course Builder — Instructor — Gators Learning" },
      { property: "og:description", content: "Build sections and lessons for your course." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CourseBuilderPage,
});

interface Section {
  id: string;
  course_id: string;
  title: string;
  position: number;
}

function CourseBuilderPage() {
  const { courseId } = Route.useParams();
  const { user, loading, isApproved } = useInstructorAccess();
  const [course, setCourse] = useState<{ id: string; title: string; status: string } | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [newSection, setNewSection] = useState("");
  const [openLesson, setOpenLesson] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: c }, { data: s }, { data: l }] = await Promise.all([
      supabase.from("courses").select("id, title, status").eq("id", courseId).maybeSingle(),
      supabase.from("course_sections").select("*").eq("course_id", courseId).order("position"),
      supabase.from("course_contents").select("*").eq("course_id", courseId).order("position"),
    ]);
    setCourse((c as { id: string; title: string; status: string }) ?? null);
    setSections((s as Section[]) ?? []);
    setLessons((l as LessonRow[]) ?? []);
  }, [courseId]);

  useEffect(() => {
    if (user && isApproved) load();
  }, [user, isApproved, load]);

  const addSection = async () => {
    if (!newSection.trim()) return;
    await supabase.from("course_sections").insert({ course_id: courseId, title: newSection.trim(), position: sections.length });
    setNewSection("");
    load();
  };

  const deleteSection = async (id: string) => {
    if (!window.confirm("Delete this section and its lessons?")) return;
    await supabase.from("course_sections").delete().eq("id", id);
    load();
  };

  const addLesson = async (sectionId: string | null) => {
    const inSection = lessons.filter((l) => l.section_id === sectionId);
    await supabase.from("course_contents").insert({
      course_id: courseId,
      section_id: sectionId,
      title: "New lesson",
      position: inSection.length,
      lesson_type: "video",
    });
    load();
  };

  const deleteLesson = async (id: string) => {
    if (!window.confirm("Delete this lesson?")) return;
    await supabase.from("course_contents").delete().eq("id", id);
    load();
  };

  const submitForReview = async () => {
    await supabase.from("courses").update({ status: "pending" }).eq("id", courseId);
    load();
  };

  if (loading || !isApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-alt">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  const renderLessons = (sectionId: string | null) => {
    const rows = lessons.filter((l) => l.section_id === sectionId);
    return (
      <ul className="space-y-2 mt-3">
        {rows.map((l) => (
          <li key={l.id} className="rounded-xl border border-border bg-surface-alt">
            <div className="flex items-center justify-between px-4 py-3">
              <button className="text-sm font-bold text-ink text-left" onClick={() => setOpenLesson(openLesson === l.id ? null : l.id)}>
                {l.title} <span className="text-xs text-ink-muted font-normal">({l.lesson_type})</span>
              </button>
              <button className="text-xs font-bold text-destructive" onClick={() => deleteLesson(l.id)}>
                Delete
              </button>
            </div>
            {openLesson === l.id && (
              <div className="border-t border-border p-4">
                <LessonEditor lesson={l} onChanged={load} />
              </div>
            )}
          </li>
        ))}
        <li>
          <button className="text-xs font-bold text-brand" onClick={() => addLesson(sectionId)}>
            + Add lesson
          </button>
        </li>
      </ul>
    );
  };

  return (
    <InstructorShell title={course?.title ?? "Course Builder"}>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Link to="/instructor/courses" className="text-sm font-bold text-brand">
          ← Back to courses
        </Link>
        {course && <StatusBadge status={course.status} />}
        {course && course.status !== "pending" && course.status !== "published" && (
          <button onClick={submitForReview} className="px-4 py-2 rounded-xl bg-brand text-brand-foreground text-xs font-bold">
            Submit for review
          </button>
        )}
      </div>

      <div className="rounded-2xl bg-background border border-border p-6 mb-6">
        <h2 className="font-bold text-ink mb-3">Add section</h2>
        <div className="flex gap-2">
          <input
            value={newSection}
            onChange={(e) => setNewSection(e.target.value)}
            placeholder="Section title"
            className="flex-1 rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm outline-none focus:border-brand"
          />
          <button onClick={addSection} className="px-5 py-3 rounded-xl bg-brand text-brand-foreground text-sm font-bold">
            Add
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {sections.map((s) => (
          <div key={s.id} className="rounded-2xl bg-background border border-border p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-ink">{s.title}</h3>
              <button className="text-xs font-bold text-destructive" onClick={() => deleteSection(s.id)}>
                Delete section
              </button>
            </div>
            {renderLessons(s.id)}
          </div>
        ))}

        <div className="rounded-2xl bg-background border border-border p-6">
          <h3 className="font-bold text-ink">Unsectioned lessons</h3>
          {renderLessons(null)}
        </div>
      </div>
    </InstructorShell>
  );
}
