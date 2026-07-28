import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { useSiteSettings, type Course } from "@/lib/data";

export const Route = createFileRoute("/enroll/$courseId")({
  head: () => ({
    meta: [
      { title: "Course Enrollment — Gators Learning" },
      { name: "description", content: "Fill in your details, send the bKash payment and get instant access after admin verification." },
      { property: "og:title", content: "Course Enrollment — Gators Learning" },
      { property: "og:description", content: "Enroll in a Gators Learning course with bKash payment." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EnrollPage,
});

const input =
  "w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm outline-none focus:border-brand";

function makeRollNumber() {
  return "GL" + Math.floor(100000 + Math.random() * 900000);
}

function EnrollPage() {
  const { courseId } = Route.useParams();
  const { user, profile } = useAuth();
  const router = useRouter();
  const settings = useSiteSettings();
  const [course, setCourse] = useState<Course | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roll, setRoll] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    photo_url: "",
    email: "",
    mobile: "",
    whatsapp: "",
    transaction_id: "",
  });

  useEffect(() => {
    supabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .maybeSingle()
      .then(({ data }) => setCourse((data as Course) ?? null));
  }, [courseId]);

  useEffect(() => {
    setForm((f) => ({
      ...f,
      full_name: f.full_name || (profile?.full_name ?? ""),
      email: f.email || (user?.email ?? ""),
      photo_url: f.photo_url || (profile?.photo_url ?? ""),
      mobile: f.mobile || (profile?.phone ?? ""),
    }));
  }, [user, profile]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    let userId = user?.id ?? null;
    const rollNumber = profile?.roll_number ?? makeRollNumber();

    // Not logged in? The roll number doubles as the password for the new account,
    // so the student is signed in immediately after buying the course.
    if (!userId) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: rollNumber,
        options: {
          data: { full_name: form.full_name, roll_number: rollNumber },
          emailRedirectTo: window.location.origin + "/dashboard",
        },
      });
      if (signUpError) {
        setBusy(false);
        setError(
          signUpError.message.toLowerCase().includes("already")
            ? "এই ইমেইলে একাউন্ট আছে — আগে লগ ইন করে আবার চেষ্টা করুন।"
            : signUpError.message,
        );
        return;
      }
      userId = data.user?.id ?? null;
      if (!data.session) {
        await supabase.auth.signInWithPassword({ email: form.email, password: rollNumber });
      }
    }

    if (userId) {
      await supabase.from("profiles").upsert(
        {
          id: userId,
          full_name: form.full_name,
          photo_url: form.photo_url || null,
          phone: form.mobile,
          whatsapp: form.whatsapp || null,
          roll_number: rollNumber,
        },
        { onConflict: "id" },
      );
    }

    const { error: reqError } = await supabase.from("enrollment_requests").insert({
      user_id: userId,
      course_id: courseId,
      full_name: form.full_name,
      photo_url: form.photo_url || null,
      email: form.email,
      mobile: form.mobile,
      whatsapp: form.whatsapp || null,
      transaction_id: form.transaction_id,
      roll_number: rollNumber,
      status: "pending",
    });

    setBusy(false);
    if (reqError) return setError(reqError.message);
    setRoll(rollNumber);
    setStep(3);
  };

  const bkash = settings.bkash_number ?? "01XXXXXXXXX";

  return (
    <div className="min-h-screen bg-surface-alt">
      <SiteHeader />
      <main className="pt-32 sm:pt-40 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <nav className="flex items-center gap-3 text-sm text-ink-muted mb-8 font-medium">
          <Link to="/" className="hover:text-ink">Home</Link>
          <span>›</span>
          <Link to="/courses" className="hover:text-ink">Courses</Link>
          <span>›</span>
          <span className="text-ink truncate">{course?.title ?? "Course"}</span>
        </nav>

        <div className="grid lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 rounded-3xl bg-background border border-border shadow-sm p-6 sm:p-8">
            {step === 3 ? (
              <div className="text-center py-10">
                <div className="text-5xl mb-4">⏳</div>
                <h1 className="text-2xl font-bold text-ink">Payment received — verification pending</h1>
                <p className="text-ink-muted mt-3 font-bengali leading-relaxed">
                  আপনার পেমেন্ট ১ ঘণ্টার মধ্যে যাচাই করা হবে। অ্যাডমিন কনফার্ম করলে কোর্সটি আপনার
                  ড্যাশবোর্ডে সাথে সাথেই আনলক হয়ে যাবে।
                </p>
                {roll && (
                  <p className="mt-5 inline-block rounded-xl bg-brand-soft text-brand font-bold px-5 py-3">
                    আপনার Roll Number: {roll}
                    <span className="block text-xs font-semibold mt-1">
                      এই রোল নম্বর দিয়েই পরবর্তীতে লগ ইন করতে পারবেন।
                    </span>
                  </p>
                )}
                <div className="mt-8">
                  <Link to="/dashboard" className="px-6 py-3 rounded-xl bg-brand text-brand-foreground font-bold text-sm">
                    Go to dashboard
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <div>
                  <h1 className="text-2xl font-bold text-ink">
                    {step === 1 ? "Your information" : "bKash payment"}
                  </h1>
                  <p className="text-sm text-ink-muted font-bengali mt-1">
                    {step === 1
                      ? "কোর্সে ভর্তি হতে নিচের তথ্যগুলো পূরণ করুন।"
                      : "টাকা পাঠিয়ে Transaction ID দিন।"}
                  </p>
                </div>

                {step === 1 && (
                  <>
                    <input required className={input} placeholder="Full name" value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                    <input className={input} placeholder="Profile picture URL" value={form.photo_url}
                      onChange={(e) => setForm({ ...form, photo_url: e.target.value })} />
                    <input required type="email" className={input} placeholder="📧 Email address" value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    <input required className={input} placeholder="Mobile number" value={form.mobile}
                      onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
                    <input className={input} placeholder="📱 WhatsApp number" value={form.whatsapp}
                      onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
                    <div className="rounded-xl bg-surface-alt border border-border px-4 py-3 text-sm">
                      📚 Course: <span className="font-bold text-ink">{course?.title ?? "…"}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!form.full_name || !form.email || !form.mobile) {
                          setError("নাম, ইমেইল ও মোবাইল নম্বর দিন।");
                          return;
                        }
                        setError(null);
                        setStep(2);
                      }}
                      className="w-full py-3.5 rounded-xl bg-ink text-background font-bold"
                    >
                      Continue to payment
                    </button>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div className="rounded-2xl border-2 border-brand bg-brand-soft p-5">
                      <p className="text-sm font-bold text-ink">bKash Send Money</p>
                      <p className="text-2xl font-bold text-brand mt-1 tracking-wide">{bkash}</p>
                      <p className="text-sm text-ink-muted mt-2 font-bengali">
                        উপরের নম্বরে <strong>৳{course?.discount_price ?? course?.price ?? 0}</strong> সেন্ড মানি করে
                        নিচে Transaction ID লিখুন।
                      </p>
                    </div>
                    <input required className={input} placeholder="bKash Transaction ID" value={form.transaction_id}
                      onChange={(e) => setForm({ ...form, transaction_id: e.target.value })} />
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setStep(1)} className="px-5 py-3.5 rounded-xl border-2 border-border font-bold text-sm">
                        Back
                      </button>
                      <button type="submit" disabled={busy} className="flex-1 py-3.5 rounded-xl bg-brand text-brand-foreground font-bold disabled:opacity-60">
                        {busy ? "Submitting…" : "Submit enrollment"}
                      </button>
                    </div>
                  </>
                )}

                {error && <p className="text-sm text-destructive">{error}</p>}
              </form>
            )}
          </div>

          <aside className="rounded-3xl bg-background border border-border shadow-sm overflow-hidden">
            <img src={course?.thumbnail_url ?? ""} alt={course?.title ?? ""} className="h-40 w-full object-cover" />
            <div className="p-6">
              <span className="text-xs font-bold text-brand">{course?.category}</span>
              <h2 className="font-bold text-ink mt-1">{course?.title}</h2>
              <p className="text-sm text-ink-muted mt-2 line-clamp-3">{course?.details}</p>
              <p className="text-2xl font-bold text-ink mt-4">৳{course?.discount_price ?? course?.price ?? 0}</p>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
