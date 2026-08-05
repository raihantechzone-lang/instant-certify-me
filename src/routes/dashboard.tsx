import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { 
  BookOpen, Trophy, FileText, Settings, 
  ChevronRight, Lock, CheckCircle2, Download, Award, User, LogOut, Camera
} from "lucide-react";
import type { Course, Enrollment } from "@/lib/data";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

type DashboardTab = "courses" | "notes" | "exams" | "settings";

function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DashboardTab>("courses");
  const [enrollments, setEnrollments] = useState<(Enrollment & { courses: Course | null, certificate_url?: string | null })[]>([]);
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) router.navigate({ to: "/auth", search: { mode: "login" }, replace: true });
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

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
       <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="https://ik.imagekit.io/n7rgjyaxh/Untitled%20design_20260630_142739_0000.png" alt="Logo" className="h-10" />
          </Link>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 font-bold text-sm rounded-full">
              {profile?.full_name || "Student"}
            </button>
            <img 
              src={String(profile?.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`)} 
              className="h-10 w-10 rounded-full border-2 border-emerald-500 object-cover" 
              alt="Profile" 
            />
          </div>
        </div>
      </header>

      <main className="pt-28 pb-20 max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Profile Card */}
          <aside className="w-full lg:w-80">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm sticky top-28">
              <div className="flex flex-col items-center text-center">
                 <div className="relative mb-6">
                    <img 
                      src={String(profile?.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`)} 
                      className="h-32 w-32 rounded-full border-4 border-slate-100 shadow-xl object-cover" 
                      alt="Profile" 
                    />
                    <div className="absolute bottom-2 right-2 p-2 bg-emerald-500 text-white rounded-full shadow-lg">
                       <Camera size={16} />
                    </div>
                 </div>
                 <h2 className="text-2xl font-bold">{profile?.full_name || "Student"}</h2>
                 <p className="text-sm font-bold text-emerald-600 mt-1 uppercase">Roll: {profile?.roll_number || "PENDING"}</p>
              </div>

              <nav className="mt-8 space-y-2">
                <NavButton active={activeTab === "courses"} onClick={() => setActiveTab("courses")} icon={BookOpen} label="My Courses" />
                <NavButton active={activeTab === "exams"} onClick={() => setActiveTab("exams")} icon={Trophy} label="Exam Results" />
                <NavButton active={activeTab === "settings"} onClick={() => setActiveTab("settings")} icon={Settings} label="Settings" />
              </nav>

              <button 
                onClick={() => supabase.auth.signOut()}
                className="w-full mt-8 py-4 flex items-center justify-center gap-2 rounded-2xl bg-rose-50 text-rose-600 text-sm font-bold hover:bg-rose-100 transition"
              >
                <LogOut size={16} /> Log Out
              </button>
            </div>
          </aside>

          {/* Content */}
          <section className="flex-1 space-y-8">
            {activeTab === "courses" && (
              <div className="space-y-6">
                <h1 className="text-3xl font-bold text-slate-900">My Courses</h1>
                <div className="grid gap-6">
                  {enrollments.map(e => (
                    <div key={e.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-lg transition">
                      <div className="flex items-center gap-6">
                        <img src={e.courses?.thumbnail_url || ""} className="w-24 h-24 rounded-2xl object-cover" alt="" />
                        <div>
                          <h3 className="text-xl font-bold">{e.courses?.title}</h3>
                          <p className="text-slate-500 text-sm font-bold mt-1">Status: {e.status}</p>
                          {e.certificate_url && (
                             <div className="mt-2 flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-xs font-bold w-fit">
                                <Award size={14} /> Certified
                             </div>
                          )}
                        </div>
                      </div>
                      <Link 
                        to="/courses/$courseId" 
                        params={{ courseId: e.course_id }} 
                        className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-emerald-600 transition"
                      >
                        Resume
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {activeTab === "exams" && (
              <div className="space-y-6">
                <h1 className="text-3xl font-bold">Exam Results</h1>
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                  {results.length > 0 ? (
                    results.map(r => (
                      <div key={r.id} className="p-4 border-b border-slate-100 flex justify-between">
                         <span>Exam: {r.exam_title}</span>
                         <span className="font-bold text-emerald-600">{r.score}%</span>
                      </div>
                    ))
                  ) : <p className="text-slate-500">No results found.</p>}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function NavButton({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-bold transition-all ${
        active ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-600 hover:bg-slate-50'
      }`}
    >
      <Icon size={20} /> {label}
    </button>
  );
}