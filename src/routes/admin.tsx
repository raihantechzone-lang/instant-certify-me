import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Course, CourseContent, Enrollment, EnrollmentRequest } from "@/lib/data";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel — Gators Learning" },
      { name: "description", content: "Manage courses, lessons, certificates, ads and reviews for Gators Learning." },
      { property: "og:title", content: "Admin Panel — Gators Learning" },
      { property: "og:description", content: "Internal control panel for Gators Learning." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const ADMIN_USER = "adel111";
const ADMIN_EMAIL = "adel111@gmail.com";
const ADMIN_PASS = "adel111";
const SESSION_KEY = "gators-admin-session";

type View = "payments" | "courses" | "content" | "certificates" | "reviews" | "ads" | "settings";

function AdminPage() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(localStorage.getItem(SESSION_KEY) === "1");
  }, []);

  if (!authed) return <AdminLogin onSuccess={() => setAuthed(true)} />;
  return <AdminShell onLogout={() => { localStorage.removeItem(SESSION_KEY); setAuthed(false); }} />;
}

function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = username.trim().toLowerCase();
    if ((id === ADMIN_USER || id === ADMIN_EMAIL) && password === ADMIN_PASS) {
      localStorage.setItem(SESSION_KEY, "1");
      onSuccess();
    } else setError(true);
  };

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-background rounded-2xl p-8 shadow-2xl space-y-4">
        <h1 className="text-2xl font-bold text-ink">Admin Panel</h1>
        <p className="text-sm text-ink-muted">Sign in to manage the platform.</p>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username or email"
          className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm outline-none focus:border-brand"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm outline-none focus:border-brand"
        />
        {error && <p className="text-sm text-destructive">Wrong username or password.</p>}
        <button type="submit" className="w-full py-3.5 rounded-xl bg-brand text-brand-foreground font-bold">
          Enter admin panel
        </button>
      </form>
    </div>
  );
}

function AdminShell({ onLogout }: { onLogout: () => void }) {
  const [view, setView] = useState<View>("courses");
  const [toast, setToast] = useState<string | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const items: { key: View; label: string }[] = [
    { key: "payments", label: "Payments" },
    { key: "courses", label: "Courses" },
    { key: "content", label: "Lessons & Live" },
    { key: "certificates", label: "Certificates" },
    { key: "reviews", label: "Reviews" },
    { key: "ads", label: "Interstitial Ads" },
    { key: "settings", label: "Site Title" },
  ];

  return (
    <div className="min-h-screen bg-surface-alt">
      <header className="bg-ink text-background px-6 py-4 flex items-center justify-between">
        <h1 className="font-bold">Gators Learning · Admin</h1>
        <button onClick={onLogout} className="text-sm font-bold text-background/80 hover:text-background">
          Log out
        </button>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid lg:grid-cols-[220px_1fr] gap-8">
        <nav className="flex lg:flex-col gap-2 overflow-x-auto">
          {items.map((i) => (
            <button
              key={i.key}
              onClick={() => setView(i.key)}
              className={`px-4 py-3 rounded-xl text-sm font-bold text-left whitespace-nowrap transition ${
                view === i.key ? "bg-brand text-brand-foreground shadow" : "bg-background border border-border text-ink-muted"
              }`}
            >
              {i.label}
            </button>
          ))}
        </nav>

        <section>
          {view === "payments" && <PaymentsAdmin notify={notify} />}
          {view === "courses" && <CoursesAdmin notify={notify} />}
          {view === "content" && <ContentAdmin notify={notify} />}
          {view === "certificates" && <CertificatesAdmin notify={notify} />}
          {view === "reviews" && <ReviewsAdmin notify={notify} />}
          {view === "ads" && <AdsAdmin notify={notify} />}
          {view === "settings" && <SettingsAdmin notify={notify} />}
        </section>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 px-5 py-3 rounded-xl bg-ink text-background text-sm font-bold shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

const card = "rounded-2xl bg-background border border-border p-6 shadow-sm";
const input = "w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm outline-none focus:border-brand";
const btn = "px-5 py-3 rounded-xl bg-brand text-brand-foreground text-sm font-bold";

type Notify = (msg: string) => void;

function PaymentsAdmin({ notify }: { notify: Notify }) {
  const [rows, setRows] = useState<EnrollmentRequest[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  const load = () =>
    supabase
      .from("enrollment_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows((data as EnrollmentRequest[]) ?? []));

  useEffect(() => {
    load();
    supabase
      .from("courses")
      .select("*")
      .then(({ data }) => setCourses((data as Course[]) ?? []));
    const channel = supabase
      .channel("requests-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "enrollment_requests" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const courseTitle = (id: string) => courses.find((c) => c.id === id)?.title ?? id;

  const decide = async (r: EnrollmentRequest, approve: boolean) => {
    if (approve) {
      if (!r.user_id) return notify("This request has no student account yet.");
      const { error } = await supabase
        .from("enrollments")
        .insert({ profile_id: r.user_id, course_id: r.course_id, status: "active" });
      if (error && !error.message.includes("duplicate")) return notify(error.message);
    }
    const { error } = await supabase
      .from("enrollment_requests")
      .update({ status: approve ? "approved" : "rejected" })
      .eq("id", r.id);
    notify(error ? error.message : approve ? "Payment verified — course unlocked" : "Request rejected");
    load();
  };

  return (
    <div className="space-y-6">
      <div className={card}>
        <h2 className="font-bold text-ink mb-1">Payment verification</h2>
        <p className="text-sm text-ink-muted mb-4">
          Verify the bKash transaction ID, then approve to unlock the course instantly.
        </p>
        <ul className="divide-y divide-border">
          {rows.length === 0 && <li className="py-3 text-sm text-ink-muted">No enrollment requests yet.</li>}
          {rows.map((r) => (
            <li key={r.id} className="py-4 flex flex-wrap items-start justify-between gap-4">
              <div className="flex gap-3">
                {r.photo_url ? (
                  <img src={r.photo_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-brand-soft text-brand font-bold flex items-center justify-center">
                    {r.full_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="text-sm">
                  <p className="font-bold text-ink">
                    {r.full_name} <span className="text-xs text-brand">Roll: {r.roll_number ?? "—"}</span>
                  </p>
                  <p className="text-ink-muted">📧 {r.email}</p>
                  <p className="text-ink-muted">📞 {r.mobile} · 📱 {r.whatsapp ?? "—"}</p>
                  <p className="text-ink-muted">📚 {courseTitle(r.course_id)}</p>
                  <p className="font-bold text-ink mt-1">TrxID: {r.transaction_id}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold capitalize text-ink-muted">{r.status}</span>
                {r.status === "pending" && (
                  <>
                    <button onClick={() => decide(r, true)} className={btn}>
                      Approve
                    </button>
                    <button onClick={() => decide(r, false)} className="px-5 py-3 rounded-xl border-2 border-border text-sm font-bold text-destructive">
                      Reject
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CoursesAdmin({ notify }: { notify: Notify }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [form, setForm] = useState({ title: "", category: "", details: "", price: "", discount_price: "", thumbnail_url: "" });

  const load = () =>
    supabase
      .from("courses")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setCourses((data as Course[]) ?? []));

  useEffect(() => {
    load();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("courses").insert({
      title: form.title,
      category: form.category,
      details: form.details,
      price: form.price ? Number(form.price) : null,
      discount_price: form.discount_price ? Number(form.discount_price) : null,
      thumbnail_url: form.thumbnail_url || null,
    });
    if (error) return notify(error.message);
    notify("Course saved");
    setForm({ title: "", category: "", details: "", price: "", discount_price: "", thumbnail_url: "" });
    load();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={save} className={`${card} space-y-3`}>
        <h2 className="font-bold text-ink">Add a course</h2>
        <input required className={input} placeholder="Course title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className={input} placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <textarea className={input} rows={3} placeholder="Details" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} />
        <div className="grid sm:grid-cols-2 gap-3">
          <input className={input} placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <input className={input} placeholder="Discount price" value={form.discount_price} onChange={(e) => setForm({ ...form, discount_price: e.target.value })} />
        </div>
        <input className={input} placeholder="Thumbnail image URL" value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} />
        <button className={btn}>Save course</button>
      </form>

      <div className={card}>
        <h2 className="font-bold text-ink mb-4">All courses ({courses.length})</h2>
        <ul className="divide-y divide-border">
          {courses.map((c) => (
            <li key={c.id} className="py-3 flex items-center justify-between gap-4">
              <div>
                <p className="font-bold text-sm text-ink">{c.title}</p>
                <p className="text-xs text-ink-muted">{c.category}</p>
              </div>
              <button
                onClick={async () => {
                  const { error } = await supabase.from("courses").delete().eq("id", c.id);
                  notify(error ? error.message : "Course deleted");
                  load();
                }}
                className="text-sm font-bold text-destructive"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ContentAdmin({ notify }: { notify: Notify }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState("");
  const [items, setItems] = useState<CourseContent[]>([]);
  const [form, setForm] = useState({ title: "", youtube_url: "", pdf_url: "", live_url: "", exam_link: "", is_free: false });

  useEffect(() => {
    supabase
      .from("courses")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const list = (data as Course[]) ?? [];
        setCourses(list);
        setCourseId((prev) => prev || list[0]?.id || "");
      });
  }, []);

  const load = (id: string) =>
    supabase
      .from("course_contents")
      .select("*")
      .eq("course_id", id)
      .order("created_at", { ascending: true })
      .then(({ data }) => setItems((data as CourseContent[]) ?? []));

  useEffect(() => {
    if (courseId) load(courseId);
  }, [courseId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      course_id: courseId,
      title: form.title,
      youtube_url: form.youtube_url || null,
      exam_link: form.exam_link || null,
      is_free: form.is_free,
      pdf_url: form.pdf_url || null,
      live_url: form.live_url || null,
      // Live class links are automatically gone 24 hours after being added.
      live_expires_at: form.live_url ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
    };
    const { error } = await supabase.from("course_contents").insert(payload);
    if (error) return notify(error.message);
    notify("Lesson added");
    setForm({ title: "", youtube_url: "", pdf_url: "", live_url: "", exam_link: "", is_free: false });
    load(courseId);
  };

  return (
    <div className="space-y-6">
      <div className={card}>
        <label className="text-sm font-bold text-ink">Select course</label>
        <select className={`${input} mt-2`} value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      <form onSubmit={save} className={`${card} space-y-3`}>
        <h2 className="font-bold text-ink">Add lesson</h2>
        <input required className={input} placeholder="Lesson title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className={input} placeholder="YouTube video URL" value={form.youtube_url} onChange={(e) => setForm({ ...form, youtube_url: e.target.value })} />
        <input className={input} placeholder="PDF link" value={form.pdf_url} onChange={(e) => setForm({ ...form, pdf_url: e.target.value })} />
        <input className={input} placeholder="Live class link (auto-deletes after 1 day)" value={form.live_url} onChange={(e) => setForm({ ...form, live_url: e.target.value })} />
        <input className={input} placeholder="Exam link" value={form.exam_link} onChange={(e) => setForm({ ...form, exam_link: e.target.value })} />
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={form.is_free} onChange={(e) => setForm({ ...form, is_free: e.target.checked })} />
          Free preview lesson
        </label>
        <button className={btn}>Add lesson</button>
      </form>

      <div className={card}>
        <h2 className="font-bold text-ink mb-4">Lessons ({items.length})</h2>
        <ul className="divide-y divide-border">
          {items.map((c) => (
            <li key={c.id} className="py-3 flex items-center justify-between gap-4">
              <div>
                <p className="font-bold text-sm text-ink">{c.title}</p>
                <p className="text-xs text-ink-muted">
                  {[c.youtube_url && "video", c.pdf_url && "pdf", c.live_url && "live", c.exam_link && "exam"].filter(Boolean).join(" · ") || "no content"}
                </p>
              </div>
              <button
                onClick={async () => {
                  const { error } = await supabase.from("course_contents").delete().eq("id", c.id);
                  notify(error ? error.message : "Lesson deleted");
                  load(courseId);
                }}
                className="text-sm font-bold text-destructive"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CertificatesAdmin({ notify }: { notify: Notify }) {
  const [rows, setRows] = useState<(Enrollment & { courses: Course | null; profiles: { full_name: string | null } | null })[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});

  const load = () =>
    supabase
      .from("enrollments")
      .select("*, courses(*), profiles(full_name)")
      .then(({ data }) => setRows((data as never) ?? []));

  useEffect(() => {
    load();
  }, []);

  return (
    <div className={card}>
      <h2 className="font-bold text-ink mb-4">Upload certificates</h2>
      <ul className="divide-y divide-border">
        {rows.map((r) => (
          <li key={r.id} className="py-4 space-y-2">
            <p className="font-bold text-sm text-ink">
              {r.profiles?.full_name ?? r.profile_id} — {r.courses?.title}
            </p>
            <p className="text-xs text-ink-muted capitalize">Status: {r.status.replace("_", " ")}</p>
            <div className="flex flex-wrap gap-2">
              <input
                className={`${input} flex-1 min-w-[220px]`}
                placeholder="Certificate PDF/image URL"
                value={urls[r.id] ?? r.certificate_url ?? ""}
                onChange={(e) => setUrls({ ...urls, [r.id]: e.target.value })}
              />
              <button
                onClick={async () => {
                  const url = urls[r.id] ?? r.certificate_url;
                  if (!url) return notify("Add a certificate link first");
                  const { error } = await supabase
                    .from("enrollments")
                    .update({ status: "certified", certificate_url: url })
                    .eq("id", r.id);
                  notify(error ? error.message : "Certificate unlocked for the student");
                  load();
                }}
                className={btn}
              >
                Unlock
              </button>
            </div>
          </li>
        ))}
        {rows.length === 0 && <p className="text-sm text-ink-muted">No enrollments yet.</p>}
      </ul>
    </div>
  );
}

interface AdminReview {
  id: string;
  rating: number;
  message: string;
  student_name: string | null;
  status: string;
}

function ReviewsAdmin({ notify }: { notify: Notify }) {
  const [rows, setRows] = useState<AdminReview[]>([]);

  const load = () =>
    supabase
      .from("reviews")
      .select("id, rating, message, student_name, status")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows((data as AdminReview[]) ?? []));

  useEffect(() => {
    load();
  }, []);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("reviews").update({ status }).eq("id", id);
    notify(error ? error.message : `Review ${status}`);
    load();
  };

  return (
    <div className={card}>
      <h2 className="font-bold text-ink mb-4">Student reviews</h2>
      <ul className="divide-y divide-border">
        {rows.map((r) => (
          <li key={r.id} className="py-4">
            <p className="font-bold text-sm text-ink">
              {r.student_name ?? "Student"} · {"★".repeat(r.rating)}
            </p>
            <p className="text-sm text-ink-muted mt-1">{r.message}</p>
            <div className="flex gap-2 mt-3">
              <button onClick={() => setStatus(r.id, "approved")} className={btn}>
                Approve
              </button>
              <button
                onClick={() => setStatus(r.id, "rejected")}
                className="px-5 py-3 rounded-xl border-2 border-destructive/30 text-destructive text-sm font-bold"
              >
                Reject
              </button>
              <span className="self-center text-xs text-ink-muted capitalize">({r.status})</span>
            </div>
          </li>
        ))}
        {rows.length === 0 && <p className="text-sm text-ink-muted">No reviews yet.</p>}
      </ul>
    </div>
  );
}

interface AdRow {
  id: string;
  title: string | null;
  image_url: string | null;
  link_url: string | null;
  is_active: boolean;
}

function AdsAdmin({ notify }: { notify: Notify }) {
  const [rows, setRows] = useState<AdRow[]>([]);
  const [form, setForm] = useState({ title: "", image_url: "", link_url: "" });
  const [uploading, setUploading] = useState(false);

  const load = () =>
    supabase
      .from("ads")
      .select("id, title, image_url, link_url, is_active")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows((data as AdRow[]) ?? []));

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const { error } = await supabase.from("ads").insert({ ...form, is_active: true });
          notify(error ? error.message : "Ad published");
          setForm({ title: "", image_url: "", link_url: "" });
          load();
        }}
        className={`${card} space-y-3`}
      >
        <h2 className="font-bold text-ink">Upload interstitial ad</h2>
        <label className="block text-sm font-bold text-ink">
          Ad photo
          <input
            type="file"
            accept="image/*"
            className={`${input} mt-2`}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setUploading(true);
              try {
                const url = await uploadToImageKit(file, "/ads");
                setForm((f) => ({ ...f, image_url: url }));
                notify("Photo uploaded");
              } catch (err) {
                notify(err instanceof Error ? err.message : "Upload failed");
              } finally {
                setUploading(false);
              }
            }}
          />
        </label>
        {uploading && <p className="text-sm text-ink-muted">Uploading photo…</p>}
        {form.image_url && (
          <img src={form.image_url} alt="Ad preview" className="h-32 w-auto rounded-xl object-cover" />
        )}
        <input required className={input} placeholder="Ad image URL" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
        <input className={input} placeholder="Ad title (optional)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className={input} placeholder="Click-through link (optional)" value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} />
        <button className={btn} disabled={uploading}>Publish ad</button>
      </form>


      <div className={card}>
        <h2 className="font-bold text-ink mb-4">Ads</h2>
        <ul className="divide-y divide-border">
          {rows.map((a) => (
            <li key={a.id} className="py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img src={a.image_url ?? ""} alt="" className="h-12 w-20 object-cover rounded-lg" />
                <span className="text-sm font-bold text-ink">{a.title ?? "Untitled ad"}</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    await supabase.from("ads").update({ is_active: !a.is_active }).eq("id", a.id);
                    notify(a.is_active ? "Ad paused" : "Ad activated");
                    load();
                  }}
                  className="text-sm font-bold text-brand"
                >
                  {a.is_active ? "Pause" : "Activate"}
                </button>
                <button
                  onClick={async () => {
                    await supabase.from("ads").delete().eq("id", a.id);
                    notify("Ad deleted");
                    load();
                  }}
                  className="text-sm font-bold text-destructive"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
          {rows.length === 0 && <p className="text-sm text-ink-muted">No ads uploaded.</p>}
        </ul>
      </div>
    </div>
  );
}

function SettingsAdmin({ notify }: { notify: Notify }) {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("key, value")
      .then(({ data }) => {
        for (const row of ((data as { key: string; value: string | null }[]) ?? [])) {
          if (row.key === "hero_title") setTitle(row.value ?? "");
          if (row.key === "hero_subtitle") setSubtitle(row.value ?? "");
        }
      });
  }, []);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const { error } = await supabase
          .from("site_settings")
          .upsert([
            { key: "hero_title", value: title },
            { key: "hero_subtitle", value: subtitle },
          ]);
        notify(error ? error.message : "Website title updated");
      }}
      className={`${card} space-y-3`}
    >
      <h2 className="font-bold text-ink">Website title & subtitle</h2>
      <input className={input} placeholder="Main title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className={input} rows={3} placeholder="Subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
      <button className={btn}>Save changes</button>
    </form>
  );
}
