import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { VideoPlayer } from "@/components/site/VideoPlayer";
import { CourseProgress } from "@/components/lesson/CourseProgress";
import { ArticleLesson } from "@/components/lesson/ArticleLesson";
import { QuizRunner } from "@/components/lesson/QuizRunner";
import { LessonResources } from "@/components/lesson/LessonResources";
import { LessonNotes } from "@/components/lesson/LessonNotes";
import { LessonQA } from "@/components/lesson/LessonQA";
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

interface Section {
  id: string;
  course_id: string;
  title: string;
  position: number;
  created_at: string;
}
interface RichContent extends CourseContent {
  section_id?: string | null;
  position?: number;
  lesson_type?: string;
  article_html?: string | null;
  video_file_url?: string | null;
  subtitles_url?: string | null;
}
interface InstructorProfile {
  id: string;
  display_name: string | null;
  bio: string | null;
  photo_url: string | null;
}
interface Review {
  id: string;
  user_id: string;
  rating: number;
  message: string | null;
  student_name: string | null;
  student_photo: string | null;
  status: string;
  created_at: string;
}
interface Assignment {
  id: string;
  content_id: string | null;
  title: string;
  instructions: string | null;
}
interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  body: string | null;
  file_url: string | null;
  grade: number | null;
  feedback: string | null;
  status: string;
}

type Tab = "overview" | "resources" | "notes" | "qa" | "reviews";

function CourseDetailPage() {
  const { courseId } = Route.useParams();
  const { user, profile } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [contents, setContents] = useState<RichContent[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [pending, setPending] = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [progressRow, setProgressRow] = useState<{ last_position_seconds: number } | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [instructor, setInstructor] = useState<InstructorProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myReview, setMyReview] = useState<{ rating: number; message: string } | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<AssignmentSubmission | null>(null);
  const [assignBody, setAssignBody] = useState("");
  const [assignFileUrl, setAssignFileUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [{ data: c }, { data: list }, { data: secs }] = await Promise.all([
        supabase.from("courses").select("*").eq("id", courseId).maybeSingle(),
        supabase.from("course_contents").select("*").eq("course_id", courseId).order("position", { ascending: true }).order("created_at", { ascending: true }),
        supabase.from("course_sections").select("*").eq("course_id", courseId).order("position", { ascending: true }),
      ]);
      if (cancelled) return;
      setCourse((c as Course) ?? null);
      const items = (list as RichContent[]) ?? [];
      setContents(items);
      setSections((secs as Section[]) ?? []);
      setActiveId((prev) => prev ?? items[0]?.id ?? null);
      if ((c as any)?.instructor_id) {
        const { data: instr } = await supabase
          .from("instructor_profiles")
          .select("id, display_name, bio, photo_url")
          .eq("id", (c as any).instructor_id)
          .maybeSingle();
        if (!cancelled) setInstructor((instr as InstructorProfile) ?? null);
      }
    };
    load();
    const channel = supabase
      .channel(`course-${courseId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "course_contents" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "course_sections" }, () => load())
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [courseId]);

  useEffect(() => {
    if (!user) {
      setEnrolled(false);
      setPending(false);
      return;
    }
    const load = async () => {
      const [{ data: en }, { data: req }] = await Promise.all([
        supabase.from("enrollments").select("id, status").eq("profile_id", user.id).eq("course_id", courseId).maybeSingle(),
        supabase
          .from("enrollment_requests")
          .select("id, status")
          .eq("user_id", user.id)
          .eq("course_id", courseId)
          .eq("status", "pending")
          .maybeSingle(),
      ]);
      setEnrolled(!!en);
      setPending(!!req);
    };
    load();
    const channel = supabase
      .channel(`enroll-${courseId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "enrollments" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "enrollment_requests" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, courseId]);

  // Load progress rows for the whole course (completion + resume position).
  useEffect(() => {
    if (!user) {
      setCompletedIds(new Set());
      return;
    }
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("lesson_progress")
        .select("content_id, completed")
        .eq("user_id", user.id)
        .eq("course_id", courseId);
      if (cancelled) return;
      setCompletedIds(new Set((data ?? []).filter((r: any) => r.completed).map((r: any) => r.content_id)));
    };
    load();
    const channel = supabase
      .channel(`lp-${courseId}-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "lesson_progress" }, () => load())
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, courseId]);

  const active = contents.find((c) => c.id === activeId) ?? null;
  const canWatch = enrolled || active?.is_free;

  useEffect(() => {
    if (!user || !active) {
      setProgressRow(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("lesson_progress")
      .select("last_position_seconds")
      .eq("user_id", user.id)
      .eq("content_id", active.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setProgressRow((data as any) ?? { last_position_seconds: 0 });
      });
    return () => {
      cancelled = true;
    };
  }, [user, active?.id]);

  // Assignment lesson type: load assignment + own submission.
  useEffect(() => {
    if (!active || active.lesson_type !== "assignment") {
      setAssignment(null);
      setSubmission(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("assignments")
      .select("id, content_id, title, instructions")
      .eq("content_id", active.id)
      .maybeSingle()
      .then(async ({ data }) => {
        if (cancelled) return;
        const a = (data as Assignment) ?? null;
        setAssignment(a);
        if (a && user) {
          const { data: sub } = await supabase
            .from("assignment_submissions")
            .select("id, assignment_id, body, file_url, grade, feedback, status")
            .eq("assignment_id", a.id)
            .eq("user_id", user.id)
            .maybeSingle();
          if (!cancelled) {
            setSubmission((sub as AssignmentSubmission) ?? null);
            setAssignBody((sub as any)?.body ?? "");
            setAssignFileUrl((sub as any)?.file_url ?? "");
          }
        }
      });
    return () => {
      cancelled = true;
    };
  }, [active?.id, active?.lesson_type, user]);

  // Reviews for the course + own review.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("reviews")
        .select("id, user_id, rating, message, student_name, student_photo, status, created_at")
        .eq("course_id", courseId)
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      setReviews((data as Review[]) ?? []);
      if (user) {
        const { data: mine } = await supabase
          .from("reviews")
          .select("rating, message")
          .eq("course_id", courseId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (!cancelled) setMyReview(mine ? { rating: (mine as any).rating, message: (mine as any).message ?? "" } : { rating: 5, message: "" });
      }
    };
    load();
    const channel = supabase
      .channel(`reviews-${courseId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () => load())
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [courseId, user]);

  const toggleComplete = async (contentId: string, next: boolean) => {
    if (!user) return;
    setCompletedIds((prev) => {
      const s = new Set(prev);
      if (next) s.add(contentId);
      else s.delete(contentId);
      return s;
    });
    await supabase
      .from("lesson_progress")
      .upsert(
        { user_id: user.id, course_id: courseId, content_id: contentId, completed: next, updated_at: new Date().toISOString() },
        { onConflict: "user_id,content_id" }
      );
  };

  const handleProgress = async (seconds: number, duration: number) => {
    if (!user || !active) return;
    await supabase.from("lesson_progress").upsert(
      {
        user_id: user.id,
        course_id: courseId,
        content_id: active.id,
        last_position_seconds: Math.floor(seconds),
        seconds_watched: Math.floor(seconds),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,content_id" }
    );
  };

  const handleEnded = async () => {
    if (!active) return;
    await toggleComplete(active.id, true);
  };

  const submitReview = async () => {
    if (!user || !myReview) return;
    const payload = {
      user_id: user.id,
      course_id: courseId,
      rating: myReview.rating,
      message: myReview.message,
      student_name: profile?.full_name ?? user.email,
      student_photo: profile?.photo_url ?? null,
      status: "pending",
    };
    const { data: existing } = await supabase
      .from("reviews")
      .select("id")
      .eq("course_id", courseId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) {
      await supabase.from("reviews").update(payload).eq("id", (existing as any).id);
    } else {
      await supabase.from("reviews").insert(payload);
    }
  };

  const submitAssignment = async () => {
    if (!user || !assignment) return;
    const payload = {
      assignment_id: assignment.id,
      user_id: user.id,
      body: assignBody,
      file_url: assignFileUrl || null,
      status: "submitted",
    };
    if (submission) {
      await supabase.from("assignment_submissions").update(payload).eq("id", submission.id);
    } else {
      const { data } = await supabase.from("assignment_submissions").insert(payload).select().maybeSingle();
      setSubmission((data as AssignmentSubmission) ?? null);
    }
  };

  const vid = youtubeId(active?.youtube_url);

  const grouped = useMemo(() => {
    if (sections.length === 0) return null;
    return sections.map((s) => ({
      section: s,
      items: contents.filter((c) => c.section_id === s.id),
    }));
  }, [sections, contents]);
  const ungrouped = useMemo(() => contents.filter((c) => !c.section_id), [contents]);

  return (
    <div className="min-h-screen bg-surface-alt">
      <SiteHeader />
      <main className="pt-32 sm:pt-40 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-ink mb-1">{course?.title ?? "Course"}</h1>
        <p className="text-sm text-ink-muted mb-8">{course?.category}</p>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {active && canWatch && active.lesson_type === "text" ? (
              <div className="rounded-2xl bg-background border border-border p-6 shadow-sm">
                <ArticleLesson html={active.article_html} />
              </div>
            ) : active && canWatch && active.lesson_type === "quiz" ? (
              <div className="rounded-2xl bg-background border border-border p-6 shadow-sm">
                <QuizRunner contentId={active.id} />
              </div>
            ) : active && canWatch && active.lesson_type === "assignment" ? (
              <div className="rounded-2xl bg-background border border-border p-6 shadow-sm space-y-3">
                <h2 className="font-bold text-ink">{assignment?.title ?? active.title}</h2>
                {assignment?.instructions && <p className="text-sm text-ink-muted">{assignment.instructions}</p>}
                {submission?.status === "graded" ? (
                  <div className="p-3 rounded-xl bg-brand-soft text-brand text-sm">
                    <p className="font-bold">Grade: {submission.grade}</p>
                    {submission.feedback && <p>{submission.feedback}</p>}
                  </div>
                ) : (
                  <>
                    <textarea
                      value={assignBody}
                      onChange={(e) => setAssignBody(e.target.value)}
                      placeholder="Write your submission..."
                      className="w-full px-3 py-2 rounded-xl border border-border bg-surface-alt text-sm text-ink min-h-[100px]"
                    />
                    <input
                      value={assignFileUrl}
                      onChange={(e) => setAssignFileUrl(e.target.value)}
                      placeholder="File URL (optional)"
                      className="w-full px-3 py-2 rounded-xl border border-border bg-surface-alt text-sm text-ink"
                    />
                    <button onClick={submitAssignment} className="px-5 py-2.5 rounded-xl bg-brand text-brand-foreground text-sm font-bold">
                      {submission ? "Update submission" : "Submit"}
                    </button>
                  </>
                )}
              </div>
            ) : active && canWatch && vid ? (
              <VideoPlayer
                youtubeId={vid}
                videoUrl={active.video_file_url ?? undefined}
                title={active.title}
                startSeconds={progressRow?.last_position_seconds ?? 0}
                subtitlesUrl={active.subtitles_url ?? undefined}
                watermark={user?.email ?? undefined}
                onProgress={handleProgress}
                onEnded={handleEnded}
              />
            ) : (
              <div className="aspect-video rounded-2xl bg-ink/90 flex flex-col items-center justify-center text-background text-center px-6">
                <span className="text-4xl mb-3">{pending ? "⏳" : "🔒"}</span>
                <p className="font-bold">
                  {contents.length === 0
                    ? "No lessons added yet."
                    : pending
                      ? "Payment verification pending"
                      : "Enroll in this course to unlock the lessons."}
                </p>
                {pending ? (
                  <p className="text-sm mt-2 font-bengali text-background/80">
                    ১ ঘণ্টার মধ্যে পেমেন্ট কনফার্ম হলে কোর্সটি আনলক হয়ে যাবে।
                  </p>
                ) : (
                  <Link
                    to="/enroll/$courseId"
                    params={{ courseId }}
                    className="mt-4 px-6 py-3 rounded-xl bg-brand text-brand-foreground font-bold text-sm"
                  >
                    Enroll now
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

            {active && canWatch && (
              <div className="rounded-2xl bg-background border border-border p-6 shadow-sm">
                <div className="flex flex-wrap gap-2 mb-4 border-b border-border pb-3">
                  {(["overview", "resources", "notes", "qa", "reviews"] as Tab[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold capitalize ${
                        tab === t ? "bg-brand-soft text-brand" : "text-ink-muted hover:bg-muted"
                      }`}
                    >
                      {t === "qa" ? "Q&A" : t}
                    </button>
                  ))}
                </div>

                {tab === "overview" && (
                  <div className="space-y-3">
                    <p className="text-sm text-ink-muted">{course?.details}</p>
                    {instructor && (
                      <div className="flex items-center gap-3 pt-3 border-t border-border">
                        {instructor.photo_url && (
                          <img src={instructor.photo_url} className="h-12 w-12 rounded-full object-cover" alt="" />
                        )}
                        <div>
                          <p className="font-bold text-ink text-sm">{instructor.display_name ?? "Instructor"}</p>
                          <p className="text-xs text-ink-muted">{instructor.bio}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {tab === "resources" && <LessonResources contentId={active.id} pdfUrl={active.pdf_url} />}

                {tab === "notes" && (
                  <LessonNotes
                    courseId={courseId}
                    contentId={active.id}
                    currentTime={progressRow?.last_position_seconds ?? 0}
                  />
                )}

                {tab === "qa" && (
                  <LessonQA courseId={courseId} contentId={active.id} instructorId={(course as any)?.instructor_id} />
                )}

                {tab === "reviews" && (
                  <div className="space-y-4">
                    {user && myReview && (
                      <div className="p-4 rounded-xl bg-surface-alt border border-border space-y-2">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              onClick={() => setMyReview((r) => (r ? { ...r, rating: n } : r))}
                              className={n <= myReview.rating ? "text-brand" : "text-ink-muted"}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                        <textarea
                          value={myReview.message}
                          onChange={(e) => setMyReview((r) => (r ? { ...r, message: e.target.value } : r))}
                          placeholder="Share your experience..."
                          className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-ink"
                        />
                        <button onClick={submitReview} className="px-4 py-2 rounded-xl bg-brand text-brand-foreground text-sm font-bold">
                          {reviews.some((r) => r.user_id === user.id) ? "Update review" : "Submit review"}
                        </button>
                      </div>
                    )}
                    <ul className="space-y-3">
                      {reviews.map((r) => (
                        <li key={r.id} className="p-3 rounded-xl bg-surface-alt border border-border">
                          <div className="flex items-center gap-2 mb-1">
                            {r.student_photo && <img src={r.student_photo} className="h-6 w-6 rounded-full object-cover" alt="" />}
                            <span className="text-xs font-bold text-ink">{r.student_name}</span>
                            <span className="text-brand text-xs">{"★".repeat(r.rating)}</span>
                          </div>
                          <p className="text-sm text-ink-muted">{r.message}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className="rounded-2xl bg-background border border-border p-4 shadow-sm h-fit">
            <CourseProgress courseId={courseId} contents={contents} sections={sections} />
            <h2 className="font-bold text-ink px-2 py-2">Lessons ({contents.length})</h2>
            {grouped ? (
              <div className="space-y-4">
                {grouped.map(({ section, items }) => (
                  <div key={section.id}>
                    <p className="px-2 text-xs font-bold uppercase text-ink-muted mb-1">{section.title}</p>
                    <LessonList
                      items={items}
                      activeId={activeId}
                      setActiveId={setActiveId}
                      completedIds={completedIds}
                      user={!!user}
                      onToggle={toggleComplete}
                      offset={0}
                    />
                  </div>
                ))}
                {ungrouped.length > 0 && (
                  <LessonList
                    items={ungrouped}
                    activeId={activeId}
                    setActiveId={setActiveId}
                    completedIds={completedIds}
                    user={!!user}
                    onToggle={toggleComplete}
                    offset={0}
                  />
                )}
              </div>
            ) : (
              <LessonList
                items={contents}
                activeId={activeId}
                setActiveId={setActiveId}
                completedIds={completedIds}
                user={!!user}
                onToggle={toggleComplete}
                offset={0}
              />
            )}
          </aside>
        </div>
      </main>
      <SiteFooter />
      {course && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Course",
              name: course.title,
              description: course.details ?? undefined,
              provider: { "@type": "Organization", name: "Gators Learning" },
              image: course.thumbnail_url ?? undefined,
            }),
          }}
        />
      )}
    </div>
  );
}

function LessonList({
  items,
  activeId,
  setActiveId,
  completedIds,
  user,
  onToggle,
  offset,
}: {
  items: RichContent[];
  activeId: string | null;
  setActiveId: (id: string) => void;
  completedIds: Set<string>;
  user: boolean;
  onToggle: (id: string, next: boolean) => void;
  offset: number;
}) {
  return (
    <ul className="space-y-1">
      {items.map((c, i) => (
        <li key={c.id} className="flex items-center gap-1">
          {user && (
            <input
              type="checkbox"
              checked={completedIds.has(c.id)}
              onChange={(e) => onToggle(c.id, e.target.checked)}
              className="ml-1 shrink-0"
              aria-label="Mark complete"
            />
          )}
          <button
            onClick={() => setActiveId(c.id)}
            className={`flex-1 text-left px-3 py-3 rounded-xl text-sm font-semibold transition ${
              c.id === activeId ? "bg-brand-soft text-brand" : "hover:bg-muted text-ink"
            }`}
          >
            <span className="text-ink-muted mr-2">{String(offset + i + 1).padStart(2, "0")}</span>
            {c.title}
            {isLiveLinkActive(c) && <span className="ml-2 text-xs text-destructive font-bold">LIVE</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}
