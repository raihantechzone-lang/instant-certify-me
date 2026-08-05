import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { 
  BookOpen, Trophy, FileText, Settings, 
  ChevronRight, Lock, CheckCircle2, Download, Award, User, LogOut, Camera, Video, PenSquare, Play
} from "lucide-react";
import type { Course, Enrollment } from "@/lib/data";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

type DashboardTab = "courses" | "notes";

function DashboardPage() {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DashboardTab>("courses");
  const [enrollments, setEnrollments] = useState<(Enrollment & { courses: Course | null, certificate_url?: string | null })[]>([]);
  const [toast, setToast] = useState<{ title: string, desc: string, show: boolean }>({ title: "", desc: "", show: false });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) router.navigate({ to: "/auth", search: { mode: "login" }, replace: true });
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: enc } = await supabase.from("enrollments").select("*, courses(*)").eq("profile_id", user.id);
      setEnrollments((enc as any) ?? []);
    };
    load();
  }, [user]);

  const showToast = (desc: string, title = "Notification") => {
    setToast({ title, desc, show: true });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    showToast("Uploading profile picture...", "Please wait");
    
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}-${Math.random()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ photo_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      showToast("Profile photo updated successfully!", "Success");
      router.invalidate();
    } catch (error: any) {
      showToast(error.message, "Upload Failed");
    }
  };

  const editName = async () => {
    const newName = prompt("Enter your new name:", profile?.full_name || "");
    if (newName && newName.trim() !== "" && user) {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: newName.trim() })
        .eq('id', user.id);
      
      if (!error) {
        showToast("Name updated successfully!", "Profile Updated");
        router.invalidate();
      }
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center">
       <div className="w-12 h-12 border-4 border-[#0f9d58]/20 border-t-[#0f9d58] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f9fafb] font-['Inter',sans-serif] text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      {/* Navbar - Fixed & Blurred */}
      <header className="fixed top-2 sm:top-6 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 w-full max-w-7xl mx-auto">
        <nav className="bg-white/90 backdrop-blur-xl border border-gray-100 shadow-[0_4px_30px_rgb(0,0,0,0.05)] rounded-2xl px-4 py-2 sm:px-6 sm:py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src="https://ik.imagekit.io/n7rgjyaxh/Untitled%20design_20260630_142739_0000.png" alt="Logo" className="h-12 sm:h-16 w-auto object-contain" />
          </Link>
          
          <div className="hidden sm:flex items-center gap-6">
            <Link to="/" className="text-sm font-semibold text-slate-900 hover:text-[#0f9d58] transition-colors">Home</Link>
            <Link to="/" hash="courses" className="text-sm font-semibold text-slate-900 hover:text-[#0f9d58] transition-colors">Our Courses</Link>
          </div>

          <div className="flex items-center gap-4">
             <span className="hidden md:block text-sm font-bold text-[#0f9d58]">Dashboard</span>
             <div className="h-10 w-10 rounded-full bg-emerald-50 border-2 border-[#0f9d58] overflow-hidden shadow-sm ring-offset-2 hover:ring-2 hover:ring-emerald-200 transition-all cursor-pointer">
                <img src={String(profile?.photo_url || `https://ui-avatars.com/api/?name=${profile?.full_name || 'Student'}&background=0f9d58&color=fff`)} className="w-full h-full object-cover" alt="" />
             </div>
          </div>
        </nav>
      </header>

      <main className="pt-32 sm:pt-40 pb-20 max-w-[1000px] mx-auto px-4 sm:px-6">
        {/* Profile Card */}
        <div className="bg-gradient-to-r from-[#ffe4d6] to-[#fff3ed] rounded-[2rem] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between shadow-sm border border-[#ffdbce] relative overflow-hidden mb-8 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
           <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
              <div 
                className="relative group cursor-pointer" 
                onClick={() => fileInputRef.current?.click()}
              >
                 <div className="w-24 h-24 bg-white rounded-full border-4 border-white shadow-sm overflow-hidden group-hover:border-[#0f9d58] transition-colors">
                    <img src={String(profile?.photo_url || `https://ui-avatars.com/api/?name=${profile?.full_name || 'Student'}&background=0f9d58&color=fff`)} className="w-full h-full object-cover" alt="" />
                 </div>
                 <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="text-white" size={24} />
                 </div>
                 <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
              </div>

              <div className="text-center sm:text-left">
                 <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <h2 className="text-2xl font-['Hind_Siliguri',sans-serif] font-bold text-gray-900">{profile?.full_name || "Student Name"}</h2>
                    <button onClick={editName} className="text-slate-400 hover:text-[#0f9d58] transition-colors">
                       <PenSquare size={18} />
                    </button>
                 </div>
                 <p className="text-sm font-bold text-[#0f9d58] mt-1">Roll No: {profile?.roll_number || "PENDING"}</p>
                 
                 <div className="flex gap-4 mt-4 justify-center sm:justify-start">
                    <div className="bg-white/80 backdrop-blur px-4 py-2 rounded-xl border border-orange-200 text-xs font-bold text-gray-700 shadow-sm flex items-center gap-2">
                       <BookOpen size={14} className="text-orange-500" /> Enrolled: {enrollments.length}
                    </div>
                    <div className="bg-white/80 backdrop-blur px-4 py-2 rounded-xl border border-purple-200 text-xs font-bold text-gray-700 shadow-sm flex items-center gap-2">
                       <CheckCircle2 size={14} className="text-purple-500" /> Completed: 0%
                    </div>
                 </div>
              </div>
           </div>

           <img src="https://ik.imagekit.io/n7rgjyaxh/20260630_133004_0000.png" alt="" className="hidden md:block w-40 h-32 object-contain mix-blend-multiply opacity-80 animate-bounce [animation-duration:3s]" />
        </div>

        {/* Dashboard Nav Tabs */}
        <div className="flex gap-8 sm:gap-14 overflow-x-auto pb-4 mb-10 border-b border-gray-100 no-scrollbar">
           <TabButton active={activeTab === 'courses'} onClick={() => setActiveTab('courses')} icon={BookOpen} label="আমার কোর্সসমূহ" color="orange" />
           <TabButton active={false} onClick={() => showToast("Live classes session is coming soon!", "Stay Tuned")} icon={Video} label="লাইভ ক্লাস" color="red" />
           <TabButton active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} icon={FileText} label="ক্লাস নোটস" color="purple" />
           <TabButton active={false} onClick={() => showToast("Results will be available after exams.", "Not Ready")} icon={Trophy} label="পরীক্ষার ফলাফল" color="emerald" />
        </div>

        {/* Sections */}
        <div className="space-y-10 animate-in fade-in duration-700">
           {activeTab === 'courses' && (
             <>
               {/* Resume Watching */}
               {enrollments.length > 0 && (
                 <div className="bg-slate-900 rounded-[2rem] p-6 sm:p-8 flex items-center justify-between group cursor-pointer border border-slate-800 hover:border-slate-700 transition-all shadow-xl shadow-slate-200/50">
                    <div className="flex-1 min-w-0 pr-4">
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Continue Watching</span>
                       <h4 className="font-['Hind_Siliguri',sans-serif] font-bold text-white text-lg sm:text-xl truncate">{enrollments[0].courses?.title}</h4>
                       <div className="mt-4 flex items-center gap-4">
                          <div className="flex-1 max-w-[200px] h-1.5 bg-slate-800 rounded-full overflow-hidden">
                             <div className="w-1/4 h-full bg-[#0f9d58] rounded-full"></div>
                          </div>
                          <span className="text-xs font-bold text-slate-500">25% Done</span>
                       </div>
                    </div>
                    <button className="w-14 h-14 rounded-full bg-[#0f9d58] text-white flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-emerald-500 transition-all shrink-0">
                       <Play size={24} fill="currentColor" className="ml-1" />
                    </button>
                 </div>
               )}

               {/* Course Grid */}
               <div>
                  <h3 className="text-xl sm:text-2xl font-['Hind_Siliguri',sans-serif] font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <span className="w-1.5 h-8 bg-[#0f9d58] rounded-full"></span> এনরোলকৃত কোর্সসমূহ
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                     {enrollments.map(e => (
                        <div key={e.id} className="bg-white rounded-[1.5rem] border border-gray-100 shadow-sm overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                           <div className="h-40 relative">
                              <img src={e.courses?.thumbnail_url || ""} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                              <div className="absolute top-3 right-3 bg-[#0f9d58] text-white text-[10px] font-black px-3 py-1 rounded-full uppercase">Enrolled</div>
                           </div>
                           <div className="p-5">
                              <h4 className="font-['Hind_Siliguri',sans-serif] font-bold text-slate-800 line-clamp-2 min-h-[3rem]">{e.courses?.title}</h4>
                              <div className="mt-4 flex items-center justify-between">
                                 <Link 
                                   to="/courses/$courseId" 
                                   params={{ courseId: e.course_id }}
                                   className="text-[#0f9d58] font-bold text-xs flex items-center gap-1 hover:underline"
                                 >
                                    কন্টিনিউ করুন <ChevronRight size={14} />
                                 </Link>
                                 {e.certificate_url && <Award className="text-[#0f9d58]" size={20} />}
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
             </>
           )}

           {activeTab === 'notes' && (
             <div className="space-y-6">
                <div className="flex items-center justify-between">
                   <h3 className="text-xl sm:text-2xl font-['Hind_Siliguri',sans-serif] font-bold text-gray-900 flex items-center gap-3">
                     <span className="w-1.5 h-8 bg-purple-500 rounded-full"></span> আমার ক্লাস নোটস
                   </h3>
                </div>
                <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                   <div className="grid gap-4 md:grid-cols-2">
                      <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between group hover:bg-emerald-100 transition-colors cursor-pointer">
                         <div className="flex items-center gap-4 min-w-0">
                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-rose-500 shrink-0 shadow-sm">
                               <FileText size={24} />
                            </div>
                            <div className="truncate">
                               <p className="font-['Hind_Siliguri',sans-serif] font-bold text-sm text-slate-800 truncate">Lecture Sheet 01 - Bangla Grammar</p>
                               <span className="text-[10px] font-black text-[#0f9d58] uppercase">University Prep</span>
                            </div>
                         </div>
                         <button className="w-10 h-10 rounded-full bg-white text-[#0f9d58] flex items-center justify-center shadow-sm group-hover:bg-[#0f9d58] group-hover:text-white transition-all">
                            <Download size={18} />
                         </button>
                      </div>
                   </div>
                </div>
             </div>
           )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-16 border-t-[6px] border-[#0f9d58]">
         <div className="max-w-[1000px] mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
               <div>
                  <div className="bg-white p-2 rounded-xl w-fit mb-6">
                     <img src="https://ik.imagekit.io/n7rgjyaxh/Untitled%20design_20260630_142739_0000.png" alt="" className="h-8" />
                  </div>
                  <p className="font-['Hind_Siliguri',sans-serif] text-sm leading-relaxed">আপনার শেখার যাত্রাকে সহজ ও আনন্দদায়ক করতে আমরা সবসময় আপনার পাশে আছি।</p>
               </div>
               <div>
                  <h4 className="text-white font-bold mb-6">Support</h4>
                  <ul className="space-y-3 text-sm">
                     <li className="flex items-center gap-3"><span className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-[#0f9d58]"><Video size={14} /></span> Support Center</li>
                     <li className="flex items-center gap-3"><span className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-[#0f9d58]"><Settings size={14} /></span> Privacy Policy</li>
                  </ul>
               </div>
               <div className="space-y-6">
                  <button onClick={signOut} className="flex items-center gap-2 text-rose-500 font-bold hover:text-rose-400 transition-colors">
                     <LogOut size={18} /> Log Out from Device
                  </button>
               </div>
            </div>
            <div className="pt-8 border-t border-slate-900 text-center text-xs font-bold uppercase tracking-widest">
               © 2026 Gators Learning. All rights reserved.
            </div>
         </div>
      </footer>

      {/* Toast Notification */}
      <div className={`fixed bottom-6 right-6 z-[100] transition-all duration-500 ${toast.show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
         <div className="bg-white border border-gray-100 shadow-2xl rounded-2xl p-4 flex items-center gap-4 min-w-[300px]">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#0f9d58] flex items-center justify-center">
               <CheckCircle2 size={24} />
            </div>
            <div>
               <h4 className="font-bold text-sm">{toast.title}</h4>
               <p className="text-xs text-slate-500">{toast.desc}</p>
            </div>
         </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label, color }: { active: boolean, onClick: () => void, icon: any, label: string, color: string }) {
  const colors: Record<string, string> = {
    orange: 'bg-orange-100 text-orange-500 active:bg-orange-500',
    red: 'bg-red-100 text-red-500 active:bg-red-500',
    purple: 'bg-purple-100 text-purple-500 active:bg-purple-500',
    emerald: 'bg-emerald-100 text-[#0f9d58] active:bg-[#0f9d58]',
  };

  return (
    <div className="flex flex-col items-center gap-3 cursor-pointer group min-w-[80px]" onClick={onClick}>
       <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition-all duration-300 shadow-sm group-hover:scale-110 ${active ? colors[color].split(' ')[0].replace('100', '500') + ' text-white' : colors[color] + ' group-hover:' + colors[color].split(' ')[0].replace('100', '500') + ' group-hover:text-white'}`}>
          <Icon size={24} />
       </div>
       <span className={`text-[10px] sm:text-xs font-bold font-['Hind_Siliguri',sans-serif] text-center transition-colors ${active ? 'text-slate-900' : 'text-slate-500'}`}>{label}</span>
    </div>
  );
}