import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { VideoPlayer } from "@/components/site/VideoPlayer";
import { isLiveLinkActive, youtubeId, type Course, type CourseContent } from "@/lib/data";

export const Route = createFileRoute("/courses/$courseId")({
  head: () => ({
    meta: [
      { title: "Course — Gators Learning" },
      { name: "description", content: "Live classes, video lessons, PDF notes and exams for this course." },
      { property: "og:title", content: "Course — Gators Learning" },
      { property: "og:description", content: "Live classes, video lessons, PDF notes and exams." },
    ],
  }),
  component: CourseDetailPage,
});

function CourseDetailPage() {
  const { courseId } = Route.useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [contents, setContents] = useState<CourseContent[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [enrolled, setEnrolled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [{ data: c }, { data: list }] = await Promise.all([
        supabase.from("courses").select("*").eq("id", courseId).maybeSingle(),
        supabase.from("course_contents").select("*").eq("course_id", courseId).order("created_at", { ascending: true }),
      ]);
      if (cancelled) return;
      setCourse((c as Course) ?? null);
      const items = (list as CourseContent[]) ?? [];
      setContents(items);
      setActiveId((prev) => prev ?? items[0]?.id ?? null);
    };
    load();
    const channel = supabase
      .channel(`course-${courseId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "course_contents" }, () => load())
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [courseId]);

  useEffect(() => {
    if (!user) return setEnrolled(false);
    supabase
      .from("enrollments")
      .select("id, status")
      .eq("profile_id", user.id)
      .eq("course_id", courseId)
      .maybeSingle()
      .then(({ data }) => setEnrolled(!!data));
  }, [user, courseId]);

  const active = contents.find((c) => c.id === activeId) ?? null;
  const canWatch = enrolled || active?.is_free;
  const vid = youtubeId(active?.youtube_url);

  return (
    <div className="min-h-screen bg-surface-alt">
      <SiteHeader />
      <main className="pt-32 sm:pt-40 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-ink mb-1">{course?.title ?? "Course"}</h1>
        <p className="text-sm text-ink-muted mb-8">{course?.category}</p>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {active && canWatch && vid ? (
              <VideoPlayer youtubeId={vid} title={active.title} />
            ) : (
              <div className="aspect-video rounded-2xl bg-ink/90 flex flex-col items-center justify-center text-background text-center px-6">
                <span className="text-4xl mb-3">🔒</span>
                <p className="font-bold">
                  {contents.length === 0 ? "No lessons added yet." : "Enroll in this course to unlock the lessons."}
                </p>
                {!user && (
                  <Link
                    to="/auth"
                    search={{ mode: "login" }}
                    className="mt-4 px-6 py-3 rounded-xl bg-brand text-brand-foreground font-bold text-sm"
                  >
                    Log in
                  </Link>
                )}
              </div>
            )}

            {active && canWatch && (
              <div className="rounded-2xl bg-background border border-border p-6 shadow-sm">
                <h2 className="font-bold text-ink mb-4">{active.title}</h2>
                <div className="flex flex-wrap gap-3">
                  {isLiveLinkActive(active) && (
                    <a
                      href={active.live_url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2.5 rounded-xl bg-destructive text-background text-sm font-bold"
                    >
                      🔴 Join live class
                    </a>
                  )}
                  {active.pdf_url && (
                    <a
                      href={active.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2.5 rounded-xl border-2 border-border text-sm font-bold"
                    >
                      📄 PDF notes
                    </a>
                  )}
                  {active.exam_link && (
                    <a
                      href={active.exam_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2.5 rounded-xl bg-brand text-brand-foreground text-sm font-bold"
                    >
                      📝 Take exam
                    </a>
                  )}
                </div>
                {active.live_url && !isLiveLinkActive(active) && (
                  <p className="text-xs text-ink-muted mt-4 font-bengali">
                    লাইভ ক্লাসের লিংকটির মেয়াদ শেষ হয়ে গেছে (২৪ ঘণ্টা পর স্বয়ংক্রিয়ভাবে মুছে যায়)।
                  </p>
                )}
              </div>
            )}
          </div>

          <aside className="rounded-2xl bg-background border border-border p-4 shadow-sm h-fit">
            <h2 className="font-bold text-ink px-2 py-2">Lessons ({contents.length})</h2>
            <ul className="space-y-1">
              {contents.map((c, i) => (
                <li key={c.id}>
                  <button
                    onClick={() => setActiveId(c.id)}
                    className={`w-full text-left px-3 py-3 rounded-xl text-sm font-semibold transition ${
                      c.id === activeId ? "bg-brand-soft text-brand" : "hover:bg-muted text-ink"
                    }`}
                  >
                    <span className="text-ink-muted mr-2">{String(i + 1).padStart(2, "0")}</span>
                    {c.title}
                    {isLiveLinkActive(c) && <span className="ml-2 text-xs text-destructive font-bold">LIVE</span>}
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
