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
    ],
  }),
  component: EnrollPage,
});

const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all";

function makeRollNumber() {
  return "GL" + Math.floor(100000 + Math.random() * 900000);
}

function EnrollPage() {
  const { courseId } = Route.useParams();
  const { user, profile } = useAuth();
  const settings = useSiteSettings();
  const [course, setCourse] = useState<Course | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
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
    supabase.from("courses").select("*").eq("id", courseId).maybeSingle().then(({ data }) => setCourse((data as Course) ?? null));
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

    if (!userId) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: rollNumber,
        options: { data: { full_name: form.full_name, roll_number: rollNumber } },
      });
      if (signUpError) {
        setBusy(false);
        setError(signUpError.message);
        return;
      }
      userId = data.user?.id ?? null;
      if (!data.session) await supabase.auth.signInWithPassword({ email: form.email, password: rollNumber });
    }

    if (userId) {
      await supabase.from("profiles").upsert({
        id: userId,
        full_name: form.full_name,
        photo_url: form.photo_url || null,
        phone: form.mobile,
        whatsapp: form.whatsapp || null,
        roll_number: rollNumber,
      });
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
    setSuccess(true);
  };

  const bkash = settings.settings?.bkash_number ?? "01XXXXXXXXX";

  if (success) {
    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <SiteHeader />
            <main className="pt-40 pb-24 px-4 max-w-xl mx-auto text-center">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">✓</div>
                <h1 className="text-3xl font-bold text-surface-900">Payment Received!</h1>
                <p className="text-slate-500 mt-3 font-bengali">আপনার পেমেন্ট ১ ঘণ্টার মধ্যে যাচাই করা হবে।</p>
                <div className="mt-8 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-sm text-slate-500 font-bold">Your Roll Number:</p>
                    <p className="text-2xl font-black text-brand-600 mt-2">{roll}</p>
                    <p className="text-xs text-slate-400 mt-2">Login using this roll number.</p>
                </div>
                <Link to="/dashboard" className="block w-full py-4 mt-8 bg-surface-900 text-white font-bold rounded-2xl">Go to Dashboard</Link>
            </main>
        </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <SiteHeader />
      <main className="pt-32 pb-24 px-4 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 bg-white border border-slate-200 shadow-sm rounded-3xl p-8">
            <h1 className="text-2xl font-bold text-surface-900 mb-8">{step === 1 ? "Personal Info" : "bKash Payment"}</h1>
            <form onSubmit={submit} className="space-y-4">
              {step === 1 ? (
                <>
                  <input required className={input} placeholder="Full Name" value={form.full_name} onChange={(e) => setForm({...form, full_name: e.target.value})} />
                  <input className={input} placeholder="Profile Picture URL" value={form.photo_url} onChange={(e) => setForm({...form, photo_url: e.target.value})} />
                  <input required type="email" className={input} placeholder="Email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
                  <input required className={input} placeholder="Mobile Number" value={form.mobile} onChange={(e) => setForm({...form, mobile: e.target.value})} />
                  <input className={input} placeholder="WhatsApp Number" value={form.whatsapp} onChange={(e) => setForm({...form, whatsapp: e.target.value})} />
                  <button type="button" onClick={() => setStep(2)} className="w-full py-4 bg-brand-600 text-white font-bold rounded-xl mt-4">Continue to Payment</button>
                </>
              ) : (
                <>
                  <div className="bg-pink-50 border border-pink-100 rounded-2xl p-6 text-center">
                    <p className="text-sm font-bold text-pink-800">bKash Send Money</p>
                    <p className="text-3xl font-black text-pink-600 mt-2">{bkash}</p>
                    <p className="text-xs text-slate-600 mt-2">Send ৳{course?.discount_price ?? course?.price} and enter ID below.</p>
                  </div>
                  <input required className={input} placeholder="Transaction ID" value={form.transaction_id} onChange={(e) => setForm({...form, transaction_id: e.target.value})} />
                  <div className="flex gap-4">
                    <button type="button" onClick={() => setStep(1)} className="flex-1 py-4 border border-slate-200 rounded-xl font-bold">Back</button>
                    <button type="submit" className="flex-1 py-4 bg-surface-900 text-white font-bold rounded-xl">Submit Enrollment</button>
                  </div>
                </>
              )}
              {error && <p className="text-red-500 text-sm font-bold">{error}</p>}
            </form>
          </div>
          <aside className="lg:col-span-4 bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden p-6">
            <img src={course?.thumbnail_url ?? ""} alt="" className="w-full h-48 object-cover rounded-2xl" />
            <h2 className="text-lg font-bold mt-4">{course?.title}</h2>
            <p className="text-sm text-slate-500 mt-2">{course?.details}</p>
            <p className="text-3xl font-black mt-6">৳{course?.discount_price ?? course?.price}</p>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
