import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { 
  BookOpen, Trophy, FileText, Bell, Settings, 
  ChevronRight, Lock, CheckCircle2, Download, Award
} from "lucide-react";
import type { Course, Enrollment } from "@/lib/data";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

type DashboardTab = "overview" | "courses" | "certificates" | "settings";

function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
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
       <div className="w-12 h-12 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
    </div>
  );

  const stats = [
    { label: "My Courses", value: enrollments.length, icon: BookOpen, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Exams Passed", value: results.length, icon: Trophy, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Certificates", value: enrollments.filter(e => e.certificate_url).length, icon: Award, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <SiteHeader />
      
      <main className="pt-32 pb-20 max-w-7xl mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Sidebar Nav */}
          <aside className="w-full lg:w-72 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="flex flex-col items-center text-center mb-8">
                 <div className="relative mb-4 group">
                    <img 
                      src={String(profile?.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`)} 
                      className="h-24 w-24 rounded-[2rem] border-4 border-white shadow-xl object-cover transition duration-500 group-hover:scale-105" 
                      alt="" 
                    />
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-brand text-white rounded-xl flex items-center justify-center shadow-lg border-2 border-white">
                       <Settings size={14} />
                    </div>
                 </div>
                 <h3 className="text-xl font-black text-slate-900">{profile?.full_name || "Student"}</h3>
                 <p className="text-xs font-black text-brand uppercase tracking-widest mt-1">Roll: {profile?.roll_number || "PENDING"}</p>
              </div>

              <nav className="space-y-2">
                <NavButton active={activeTab === "overview"} onClick={() => setActiveTab("overview")} icon={BookOpen} label="Overview" />
                <NavButton active={activeTab === "certificates"} onClick={() => setActiveTab("certificates")} icon={Award} label="Certificates" />
                <NavButton active={activeTab === "settings"} onClick={() => setActiveTab("settings")} icon={Settings} label="Profile Settings" />
              </nav>

              <button 
                onClick={() => supabase.auth.signOut()}
                className="w-full mt-8 py-3 rounded-2xl bg-slate-50 text-slate-400 text-xs font-black uppercase tracking-widest hover:bg-rose-50 hover:text-rose-500 transition"
              >
                Log Out
              </button>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
            
            {activeTab === "overview" && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {stats.map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition">
                       <div className={`w-14 h-14 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                          <stat.icon size={24} />
                       </div>
                       <div>
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                          <h4 className="text-2xl font-black text-slate-900 leading-none mt-1">{stat.value}</h4>
                       </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                   <h2 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
                     My Learning Courses
                   </h2>
                   <div className="grid gap-4">
                      {enrollments.length === 0 ? (
                        <div className="text-center py-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-100">
                           <BookOpen className="mx-auto text-slate-200 mb-4" size={48} />
                           <p className="text-slate-400 font-bold">You haven't enrolled in any courses yet.</p>
                           <Link to="/courses" className="inline-block mt-4 text-brand font-black text-sm uppercase tracking-widest hover:underline">Browse Courses</Link>
                        </div>
                      ) : (
                        enrollments.map(e => (
                           <div key={e.id} className="group relative flex flex-col md:flex-row md:items-center justify-between p-6 bg-white border border-slate-100 rounded-[2rem] hover:border-brand/30 hover:shadow-xl hover:shadow-brand/5 transition-all duration-500 overflow-hidden">
                              <div className="flex items-center gap-6">
                                 <div className="w-24 h-16 rounded-2xl bg-slate-100 overflow-hidden relative">
                                    <img src={e.courses?.thumbnail_url || ""} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" alt="" />
                                    {e.certificate_url && (
                                      <div className="absolute inset-0 bg-brand/10 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                         <Award className="text-brand" size={24} />
                                      </div>
                                    )}
                                 </div>
                                 <div>
                                    <h4 className="font-black text-slate-900 text-lg line-clamp-1">{e.courses?.title}</h4>
                                    <div className="flex items-center gap-3 mt-1">
                                       <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${
                                         e.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                                       }`}>
                                         {e.status}
                                       </span>
                                       {e.certificate_url && (
                                         <span className="flex items-center gap-1 text-[10px] font-black text-brand bg-brand/5 px-2 py-0.5 rounded-lg uppercase">
                                            <CheckCircle2 size={10} /> Certified
                                         </span>
                                       )}
                                    </div>
                                 </div>
                              </div>
                              <Link 
                                to="/courses/$courseId" 
                                params={{ courseId: e.course_id }} 
                                className="mt-4 md:mt-0 flex items-center justify-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-brand transition shadow-lg hover:shadow-brand/20 active:scale-95"
                              >
                                Resume Course <ChevronRight size={16} />
                              </Link>
                           </div>
                        ))
                      )}
                   </div>
                </div>
              </div>
            )}

            {activeTab === "certificates" && (
              <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm min-h-[500px]">
                 <div className="mb-10">
                    <h2 className="text-3xl font-black text-slate-900">Academic Certificates</h2>
                    <p className="text-slate-500 font-medium mt-1">Completion certificates will appear here once verified by instructors.</p>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {enrollments.map(e => (
                       <div key={e.id} className="relative group">
                          <div className={`p-8 rounded-[2.5rem] border-2 transition-all duration-500 ${
                            e.certificate_url 
                              ? 'bg-gradient-to-br from-brand/10 to-transparent border-brand/20 shadow-xl shadow-brand/5' 
                              : 'bg-slate-50 border-slate-100 border-dashed opacity-75'
                          }`}>
                             <div className="flex items-center justify-between mb-6">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                                  e.certificate_url ? 'bg-brand text-white' : 'bg-slate-200 text-slate-400'
                                }`}>
                                   {e.certificate_url ? <Award size={30} /> : <Lock size={24} />}
                                </div>
                                {!e.certificate_url && (
                                  <span className="text-[10px] font-black uppercase tracking-widest bg-slate-200 text-slate-500 px-3 py-1 rounded-full">Locked</span>
                                )}
                             </div>
                             
                             <h4 className="font-black text-slate-900 text-lg mb-2 line-clamp-2">{e.courses?.title}</h4>
                             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">Course Completion Badge</p>
                             
                             {e.certificate_url ? (
                               <a 
                                 href={e.certificate_url} 
                                 target="_blank" 
                                 rel="noreferrer"
                                 className="flex items-center justify-center gap-2 w-full py-4 bg-brand text-white rounded-2xl font-black text-sm shadow-lg shadow-brand/20 hover:scale-[1.02] transition"
                               >
                                 <Download size={18} /> Download PDF
                               </a>
                             ) : (
                               <div className="w-full py-4 bg-slate-200 text-slate-400 rounded-2xl font-black text-sm text-center cursor-not-allowed">
                                 Complete course to unlock
                               </div>
                             )}
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                 <h2 className="text-3xl font-black text-slate-900 mb-8">Profile Settings</h2>
                 <form className="space-y-6 max-w-xl">
                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                          <input type="text" defaultValue={profile?.full_name || ""} className="w-full p-4 rounded-2xl bg-slate-50 border-none font-bold" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp</label>
                          <input type="text" defaultValue={profile?.whatsapp_number || ""} className="w-full p-4 rounded-2xl bg-slate-50 border-none font-bold" />
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                       <input type="email" value={user?.email || ""} disabled className="w-full p-4 rounded-2xl bg-slate-50 border-none font-bold text-slate-400" />
                    </div>
                    <button className="px-10 py-4 bg-brand text-white rounded-2xl font-black text-sm shadow-lg shadow-brand/20 hover:scale-105 transition active:scale-95">
                       Save Profile Info
                    </button>
                 </form>
              </div>
            )}

          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function NavButton({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all duration-300 ${
        active ? 'bg-brand text-white shadow-xl shadow-brand/10' : 'text-slate-500 hover:bg-slate-50'
      }`}
    >
      <Icon size={20} /> {label}
    </button>
  );
}
