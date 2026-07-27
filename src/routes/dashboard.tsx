import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { InterstitialAd } from "@/components/site/InterstitialAd";
import type { Course, Enrollment } from "@/lib/data";

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

type Tab = "courses" | "certificates";

function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("courses");
  const [rows, setRows] = useState<(Enrollment & { courses: Course | null })[]>([]);

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

  const certifiedCourseIds = new Set(rows.filter((r) => r.status === "certified" && r.certificate_url).map((r) => r.course_id));

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
          {profile?.avatar_url ? (
            <img src={String(profile.avatar_url)} alt="" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="h-16 w-16 rounded-full bg-brand-soft text-brand text-xl font-bold flex items-center justify-center">
              {(profile?.full_name ?? user.email ?? "S").charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-ink">{profile?.full_name ?? user.email}</h1>
            {profile?.roll_number && <p className="text-sm font-bold text-brand">Roll: {String(profile.roll_number)}</p>}
          </div>
        </div>

        <div className="flex gap-2 mb-8">
          {(["courses", "certificates"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold capitalize transition ${
                tab === t ? "bg-brand text-brand-foreground shadow" : "bg-background border border-border text-ink-muted"
              }`}
            >
              {t === "courses" ? "My Courses" : "Certificates"}
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
