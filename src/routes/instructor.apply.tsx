import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useInstructorAccess } from "@/components/instructor/useInstructorAccess";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { StatusBadge } from "@/components/instructor/InstructorShell";

export const Route = createFileRoute("/instructor/apply")({
  head: () => ({
    meta: [
      { title: "Become an Instructor — Gators Learning" },
      { name: "description", content: "Apply to become an instructor on Gators Learning." },
      { property: "og:title", content: "Become an Instructor — Gators Learning" },
      { property: "og:description", content: "Submit your instructor application for review." },
    ],
  }),
  component: ApplyPage,
});

function ApplyPage() {
  const { user, loading, instructorProfile, isApproved } = useInstructorAccess({ skipApprovalRedirect: true });
  const { profile } = useAuth();
  const [form, setForm] = useState({ display_name: "", bio: "", photo_url: "", expertise: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (instructorProfile) {
      setForm({
        display_name: instructorProfile.display_name ?? "",
        bio: instructorProfile.bio ?? "",
        photo_url: instructorProfile.photo_url ?? "",
        expertise: instructorProfile.expertise ?? "",
      });
    } else if (profile) {
      setForm((f) => ({ ...f, display_name: String(profile.full_name ?? "") }));
    }
  }, [instructorProfile, profile]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.from("instructor_profiles").upsert(
      { id: user.id, ...form, status: "pending" },
      { onConflict: "id" }
    );
    setBusy(false);
    setMsg(error ? error.message : "Application submitted — awaiting admin approval.");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-alt">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-alt">
      <SiteHeader />
      <main className="pt-32 sm:pt-40 pb-16 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-ink mb-2">Become an Instructor</h1>
        <p className="text-sm text-ink-muted mb-8">Fill in your details below to apply for an instructor account.</p>

        {isApproved && (
          <div className="mb-6 rounded-2xl border-2 border-brand bg-brand-soft p-5">
            <p className="font-bold text-ink">You're an approved instructor! 🎉</p>
            <a href="/instructor" className="text-sm font-bold text-brand hover:underline">Go to instructor dashboard →</a>
          </div>
        )}

        {instructorProfile && instructorProfile.status !== "approved" && (
          <div className="mb-6 rounded-2xl bg-background border border-border p-5 flex items-start justify-between gap-4">
            <div>
              <p className="font-bold text-ink flex items-center gap-2">
                Application status <StatusBadge status={instructorProfile.status} />
              </p>
              {instructorProfile.status === "pending" && (
                <p className="text-sm text-ink-muted mt-1">Your application is awaiting admin approval.</p>
              )}
              {instructorProfile.status === "rejected" && (
                <p className="text-sm text-destructive mt-1">
                  Rejected{instructorProfile.review_feedback ? `: ${instructorProfile.review_feedback}` : "."} You can edit and resubmit below.
                </p>
              )}
            </div>
          </div>
        )}

        <form onSubmit={submit} className="rounded-2xl bg-background border border-border p-6 space-y-4">
          <input
            required
            placeholder="Display name"
            value={form.display_name}
            onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm outline-none focus:border-brand"
          />
          <textarea
            placeholder="Short bio"
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={4}
            className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm outline-none focus:border-brand"
          />
          <input
            placeholder="Photo URL"
            value={form.photo_url}
            onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
            className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm outline-none focus:border-brand"
          />
          <input
            placeholder="Areas of expertise (e.g. IELTS, Physics)"
            value={form.expertise}
            onChange={(e) => setForm({ ...form, expertise: e.target.value })}
            className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm outline-none focus:border-brand"
          />
          {msg && <p className="text-sm text-brand font-bold">{msg}</p>}
          <button disabled={busy} className="px-6 py-3 rounded-xl bg-brand text-brand-foreground font-bold disabled:opacity-60">
            {busy ? "Submitting…" : instructorProfile ? "Resubmit application" : "Submit application"}
          </button>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
