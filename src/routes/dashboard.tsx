import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import type { Course, Enrollment, EnrollmentRequest } from "@/lib/data";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<(Enrollment & { courses: Course | null })[]>([]);
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) router.navigate({ to: "/auth", replace: true });
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: enc } = await supabase.from("enrollments").select("*, courses(*)").eq("profile_id", user.id);
      setEnrollments((enc as any) ?? []);
      const { data: res } = await supabase.from("exam_results").select("*").eq("user_id", user.id);
      setResults(res ?? []);
    };
    load();
  }, [user]);

  if (loading) return <div className="p-20 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <SiteHeader />
      <div className="pt-32 pb-20 max-w-7xl mx-auto px-4 grid lg:grid-cols-[280px_1fr] gap-8">
        <aside className="space-y-2">
          <div className="p-6 bg-white rounded-3xl border border-slate-100 mb-6">
             <div className="flex items-center gap-3 mb-4">
                <img src={String(profile?.photo_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix")} className="h-12 w-12 rounded-full border-2 border-brand" alt="" />
                <div>
                   <h3 className="font-bold text-slate-900">{profile?.full_name || "Student"}</h3>
                   <p className="text-xs text-brand font-bold">Roll: {profile?.roll_number || "Pending"}</p>
                </div>
             </div>
             <nav className="space-y-1">
                <button className="w-full flex items-center gap-3 px-4 py-2 text-sm font-bold bg-brand/10 text-brand rounded-xl">
                   <div className="w-2 h-2 rounded-full bg-brand" /> Dashboard
                </button>
                <Link to="/courses" className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 rounded-xl">
                   Courses
                </Link>
             </nav>
          </div>
        </aside>

        <main className="space-y-8">
          <div className="grid sm:grid-cols-3 gap-6">
             <div className="bg-emerald-500 p-6 rounded-[2rem] text-white">
                <p className="text-xs font-bold opacity-80 uppercase tracking-wider">Total Courses</p>
                <h2 className="text-3xl font-black mt-1">{enrollments.length}</h2>
             </div>
             <div className="bg-amber-400 p-6 rounded-[2rem] text-white">
                <p className="text-xs font-bold opacity-80 uppercase tracking-wider">Exam Taken</p>
                <h2 className="text-3xl font-black mt-1">{results.length}</h2>
             </div>
             <div className="bg-rose-500 p-6 rounded-[2rem] text-white">
                <p className="text-xs font-bold opacity-80 uppercase tracking-wider">Certificates</p>
                <h2 className="text-3xl font-black mt-1">
                   {enrollments.filter(e => e.status === 'certified').length}
                </h2>
             </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100">
             <h2 className="text-xl font-black text-slate-900 mb-6">My Courses</h2>
             <div className="grid gap-4">
                {enrollments.map(e => (
                   <div key={e.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-4">
                         <img src={e.courses?.thumbnail_url || ""} className="h-12 w-20 object-cover rounded-xl" alt="" />
                         <div>
                            <h4 className="font-bold text-slate-900">{e.courses?.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                               {e.status === 'certified' ? (
                                  <span className="text-[10px] bg-brand text-white px-2 py-0.5 rounded-full font-black">CERTIFIED ✔</span>
                               ) : (
                                  <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase">{e.status}</span>
                               )}
                            </div>
                         </div>
                      </div>
                      <Link to="/courses/$courseId" params={{ courseId: e.course_id }} className="px-6 py-2 bg-brand text-white rounded-xl text-sm font-black shadow-lg shadow-brand/20">
                         Open
                      </Link>
                   </div>
                ))}
                {enrollments.length === 0 && <p className="text-slate-400 text-center py-10">No courses found.</p>}
             </div>
          </div>
        </main>
      </div>
      <SiteFooter />
    </div>
  );
}
