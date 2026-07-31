import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { InterstitialAd } from "@/components/site/InterstitialAd";
import type { Course, Enrollment, EnrollmentRequest } from "@/lib/data";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Student Dashboard — Gators Learning" },
      { name: "description", content: "Your enrolled courses, live classes, exams and certificates in one place." },
      { property: "og:title", content: "Student Dashboard — Gators Learning" },
      { property: "og:description", content: "Track your courses, results and certificates." },
    ],
  }),
  component: DashboardPage,
});

type Tab = "courses" | "progress" | "certificates" | "notifications" | "announcements" | "deadlines";

interface NotificationRow {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

interface AnnouncementRow {
  id: string;
  course_id: string | null;
  title: string;
  body: string;
  created_at: string;
}

interface AssignmentRow {
  id: string;
  course_id: string;
  title: string;
  due_at: string | null;
}

const TAB_LABELS: Record<Tab, string> = {
  courses: "My Courses",
  progress: "Progress",
  certificates: "Certificates",
  notifications: "Notifications",
  announcements: "Announcements",
  deadlines: "Deadlines",
};

function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("courses");
  const [rows, setRows] = useState<(Enrollment & { courses: Course | null })[]>([]);
  const [pendingReqs, setPendingReqs] = useState<EnrollmentRequest[]>([]);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: "", photo_url: "" });
  const [lessonCounts, setLessonCounts] = useState<Record<string, number>>({});
  const [doneCounts, setDoneCounts] = useState<Record<string, number>>({});
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);

  useEffect(() => {
    if (!loading && !user) router.navigate({ to: "/auth", search: { mode: "login" }, replace: true });
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = () =>
      supabase
        .from("enrollments")
        .select("*, courses(*)")
        .eq("profile_id", user.id)
        .then(({ data }) => {
          if (!cancelled) setRows((data as (Enrollment & { courses: Course | null })[]) ?? []);
        });
    load();
    const channel = supabase
      .channel("enrollments-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "enrollments" }, () => load())
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const load = () =>
      supabase
        .from("enrollment_requests")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .then(({ data }) => setPendingReqs((data as EnrollmentRequest[]) ?? []));
    load();
    const channel = supabase
      .channel("my-requests-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "enrollment_requests" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const courseIds = useMemo(() => rows.map((r) => r.course_id), [rows]);
  const courseIdsKey = courseIds.join(",");

  /** Progress: how many lessons each enrolled course has, and how many are done. */
  useEffect(() => {
    if (!user || courseIds.length === 0) {
      setLessonCounts({});
      setDoneCounts({});
      return;
    }
    let cancelled = false;
    const load = async () => {
      const [{ data: lessons }, { data: progress }] = await Promise.all([
        supabase.from("course_contents").select("id, course_id").in("course_id", courseIds),
        supabase.from("lesson_progress").select("course_id, completed").eq("user_id", user.id).in("course_id", courseIds),
      ]);
      if (cancelled) return;
      const total: Record<string, number> = {};
      for (const l of (lessons as { course_id: string }[]) ?? []) total[l.course_id] = (total[l.course_id] ?? 0) + 1;
      const done: Record<string, number> = {};
      for (const p of (progress as { course_id: string; completed: boolean }[]) ?? []) {
        if (p.completed) done[p.course_id] = (done[p.course_id] ?? 0) + 1;
      }
      setLessonCounts(total);
      setDoneCounts(done);
    };
    load();
    const channel = supabase
      .channel("dashboard-progress-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "lesson_progress" }, () => load())
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, courseIdsKey]);

  /** Notifications (real time). */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = () =>
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50)
        .then(({ data }) => {
          if (!cancelled) setNotifications((data as NotificationRow[]) ?? []);
        });
    load();
    const channel = supabase
      .channel("notifications-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => load())
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  /** Announcements + assignment deadlines for the courses the student is enrolled in. */
  useEffect(() => {
    if (courseIds.length === 0) {
      setAnnouncements([]);
      setAssignments([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const [{ data: ann }, { data: asg }] = await Promise.all([
        supabase
          .from("announcements")
          .select("*")
          .in("course_id", courseIds)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("assignments").select("id, course_id, title, due_at").in("course_id", courseIds),
      ]);
      if (cancelled) return;
      setAnnouncements((ann as AnnouncementRow[]) ?? []);
      setAssignments((asg as AssignmentRow[]) ?? []);
    };
    load();
    const channel = supabase
      .channel("dashboard-announcements-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => load())
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseIdsKey]);

  useEffect(() => {
    setEditForm({ full_name: profile?.full_name ?? "", photo_url: String(profile?.photo_url ?? "") });
  }, [profile?.full_name, profile?.photo_url]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await supabase
      .from("profiles")
      .upsert({ id: user.id, full_name: editForm.full_name, photo_url: editForm.photo_url || null }, { onConflict: "id" });
    setEditing(false);
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const percentFor = (courseId: string) => {
    const total = lessonCounts[courseId] ?? 0;
    if (!total) return 0;
    return Math.min(100, Math.round(((doneCounts[courseId] ?? 0) / total) * 100));
  };

  const courseTitle = (courseId: string | null) =>
    rows.find((r) => r.course_id === courseId)?.courses?.title ?? "Course";

  const certifiedCourseIds = new Set(rows.filter((r) => r.status === "certified" && r.certificate_url).map((r) => r.course_id));
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const upcoming = assignments
    .filter((a) => a.due_at && new Date(a.due_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000)
    .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime());

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-alt">
        <p className="text-ink-muted">Loading your dashboard…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-alt">
      <SiteHeader />
      <InterstitialAd placement="dashboard" />

      <main className="pt-32 sm:pt-40 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 mb-8">
          {profile?.photo_url || profile?.avatar_url ? (
            <img src={String(profile.photo_url ?? profile.avatar_url)} alt="" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="h-16 w-16 rounded-full bg-brand-soft text-brand text-xl font-bold flex items-center justify-center">
              {(profile?.full_name ?? user.email ?? "S").charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-ink">{profile?.full_name ?? user.email}</h1>
            {profile?.roll_number && <p className="text-sm font-bold text-brand">Roll: {String(profile.roll_number)}</p>}
            <button onClick={() => setEditing((v) => !v)} className="text-xs font-bold text-ink-muted hover:text-ink mt-1">
              {editing ? "Cancel" : "Edit name / photo"}
            </button>
          </div>
        </div>

        {editing && (
          <form onSubmit={saveProfile} className="mb-8 rounded-2xl bg-background border border-border p-5 space-y-3 max-w-md">
            <input
              className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm outline-none focus:border-brand"
              placeholder="Full name"
              value={editForm.full_name}
              onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
            />
            <input
              className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm outline-none focus:border-brand"
              placeholder="Profile picture URL"
              value={editForm.photo_url}
              onChange={(e) => setEditForm({ ...editForm, photo_url: e.target.value })}
            />
            <button className="px-5 py-3 rounded-xl bg-brand text-brand-foreground text-sm font-bold">Save profile</button>
          </form>
        )}

        {pendingReqs.length > 0 && (
          <div className="mb-8 rounded-2xl border-2 border-brand bg-brand-soft p-5">
            <p className="font-bold text-ink">⏳ Payment verification pending ({pendingReqs.length})</p>
            <p className="text-sm text-ink-muted font-bengali mt-1">
              ১ ঘণ্টার মধ্যে অ্যাডমিন পেমেন্ট যাচাই করবেন। কনফার্ম হলে কোর্সটি এখানেই আনলক হয়ে যাবে।
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-8">
          {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold capitalize transition ${
                tab === t ? "bg-brand text-brand-foreground shadow" : "bg-background border border-border text-ink-muted"
              }`}
            >
              {TAB_LABELS[t]}
              {t === "notifications" && unreadCount > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-destructive text-background text-[10px]">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>

        {tab === "courses" && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rows.length === 0 && <p className="text-ink-muted">You are not enrolled in any course yet.</p>}
            {rows.map((r) => (
              <div key={r.id} className="rounded-2xl bg-background border border-border shadow-sm overflow-hidden">
                <div className="relative">
                  <img src={r.courses?.thumbnail_url ?? ""} alt="" className="h-40 w-full object-cover" />
                  {certifiedCourseIds.has(r.course_id) && (
                    <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-brand text-brand-foreground text-xs font-bold shadow">
                      ✔ Certified
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <h2 className="font-bold text-ink">{r.courses?.title}</h2>
                  <p className="text-xs text-ink-muted mt-1 capitalize">Status: {r.status.replace("_", " ")}</p>
                  <div className="mt-3">
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-brand" style={{ width: `${percentFor(r.course_id)}%` }} />
                    </div>
                    <p className="text-[11px] text-ink-muted mt-1 font-semibold">{percentFor(r.course_id)}% complete</p>
                  </div>
                  <Link
                    to="/courses/$courseId"
                    params={{ courseId: r.course_id }}
                    className="mt-4 inline-flex px-5 py-2.5 rounded-xl bg-ink text-background text-sm font-bold"
                  >
                    Continue learning
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "progress" && (
          <div className="rounded-2xl bg-background border border-border p-6 shadow-sm space-y-5">
            {rows.length === 0 && <p className="text-ink-muted">No courses yet.</p>}
            {rows.map((r) => {
              const pct = percentFor(r.course_id);
              return (
                <div key={r.id}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-ink text-sm">{r.courses?.title}</p>
                    <p className="text-xs font-bold text-ink-muted">
                      {doneCounts[r.course_id] ?? 0} / {lessonCounts[r.course_id] ?? 0} lessons · {pct}%
                    </p>
                  </div>
                  <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "notifications" && (
          <div className="rounded-2xl bg-background border border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-ink">Notifications</h2>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs font-bold text-brand hover:underline">
                  Mark all as read
                </button>
              )}
            </div>
            {notifications.length === 0 && <p className="text-ink-muted text-sm">Nothing here yet.</p>}
            <ul className="space-y-3">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`rounded-xl border p-4 ${n.is_read ? "border-border" : "border-brand bg-brand-soft"}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-bold text-ink text-sm">{n.title}</p>
                      {n.body && <p className="text-sm text-ink-muted mt-1">{n.body}</p>}
                      <p className="text-[11px] text-ink-muted mt-2">{new Date(n.created_at).toLocaleString()}</p>
                    </div>
                    {!n.is_read && (
                      <button onClick={() => markRead(n.id)} className="text-xs font-bold text-brand whitespace-nowrap">
                        Mark read
                      </button>
                    )}
                  </div>
                  {n.link && (
                    <a href={n.link} className="text-xs font-bold text-brand hover:underline mt-2 inline-block">
                      Open
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "announcements" && (
          <div className="rounded-2xl bg-background border border-border p-6 shadow-sm">
            <h2 className="font-bold text-ink mb-4">Course announcements</h2>
            {announcements.length === 0 && <p className="text-ink-muted text-sm">No announcements yet.</p>}
            <ul className="space-y-3">
              {announcements.map((a) => (
                <li key={a.id} className="rounded-xl border border-border p-4">
                  <p className="text-xs font-bold text-brand">{courseTitle(a.course_id)}</p>
                  <p className="font-bold text-ink text-sm mt-1">{a.title}</p>
                  <p className="text-sm text-ink-muted mt-1 whitespace-pre-line">{a.body}</p>
                  <p className="text-[11px] text-ink-muted mt-2">{new Date(a.created_at).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "deadlines" && (
          <div className="rounded-2xl bg-background border border-border p-6 shadow-sm">
            <h2 className="font-bold text-ink mb-4">Upcoming assignment deadlines</h2>
            {upcoming.length === 0 && <p className="text-ink-muted text-sm">No upcoming deadlines.</p>}
            <ul className="space-y-3">
              {upcoming.map((a) => {
                const overdue = new Date(a.due_at!).getTime() < Date.now();
                return (
                  <li
                    key={a.id}
                    className={`rounded-xl border p-4 flex items-center justify-between gap-4 ${
                      overdue ? "border-destructive/40" : "border-border"
                    }`}
                  >
                    <div>
                      <p className="font-bold text-ink text-sm">{a.title}</p>
                      <p className="text-xs text-ink-muted">{courseTitle(a.course_id)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-bold ${overdue ? "text-destructive" : "text-brand"}`}>
                        {overdue ? "Overdue" : "Due"}
                      </p>
                      <p className="text-[11px] text-ink-muted">{new Date(a.due_at!).toLocaleString()}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {tab === "certificates" && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rows.length === 0 && <p className="text-ink-muted">No courses yet.</p>}
            {rows.map((r) => {
              const unlocked = r.status === "certified" && !!r.certificate_url;
              return (
                <div
                  key={r.id}
                  className={`rounded-2xl border p-6 text-center shadow-sm ${
                    unlocked ? "border-brand bg-brand-soft" : "border-border bg-background"
                  }`}
                >
                  <div className="text-4xl mb-3">{unlocked ? "🎓" : "🔒"}</div>
                  <h2 className="font-bold text-ink">{r.courses?.title}</h2>
                  {unlocked ? (
                    <a
                      href={r.certificate_url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex px-5 py-2.5 rounded-xl bg-brand text-brand-foreground text-sm font-bold"
                    >
                      Download certificate
                    </a>
                  ) : (
                    <p className="text-xs text-ink-muted mt-3 font-bengali">
                      কোর্স শেষে অ্যাডমিন সার্টিফিকেট আপলোড করলে এটি আনলক হবে।
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
