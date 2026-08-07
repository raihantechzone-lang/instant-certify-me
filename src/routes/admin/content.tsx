import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Video, FileText, Globe, Plus, Trash2, Edit2, Link as LinkIcon, Calendar, CheckSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/content")({
  component: ContentAdmin,
});

function ContentAdmin() {
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const queryClient = useQueryClient();

  const { data: courses } = useQuery({
    queryKey: ["admin-courses-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id, title").order("title");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (courses?.length && !selectedCourseId) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses]);

  const { data: contents, isLoading } = useQuery({
    queryKey: ["course-content", selectedCourseId],
    queryFn: async () => {
      if (!selectedCourseId) return [];
      const { data, error } = await supabase
        .from("course_contents")
        .select("*")
        .eq("course_id", selectedCourseId)
        .order("position", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCourseId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("course_contents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-content", selectedCourseId] });
      toast.success("Content deleted");
    },
  });

  const [form, setForm] = useState({
    title: "",
    youtube_url: "",
    pdf_url: "",
    live_url: "",
    exam_link: "",
    exam_enabled: false,
    thumbnail_url: ""
  });

  const addMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data: countData } = await supabase
        .from("course_contents")
        .select("id", { count: "exact" })
        .eq("course_id", selectedCourseId);
        
      const position = (countData?.length || 0) + 1;

      const { error } = await supabase.from("course_contents").insert({
        ...payload,
        course_id: selectedCourseId,
        position,
        live_expires_at: payload.live_url ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-content", selectedCourseId] });
      toast.success("Lesson added successfully");
      setForm({ title: "", youtube_url: "", pdf_url: "", live_url: "", exam_link: "", exam_enabled: false, thumbnail_url: "" });
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-black text-slate-900">Content & Exams</h2>
        <p className="text-slate-500 font-medium">Manage lessons, videos, PDFs, and live classes.</p>
      </div>

      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <label className="block text-sm font-bold text-slate-500 mb-2">Select Course to Manage</label>
        <select 
          className="w-full p-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand/20 transition font-bold"
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
        >
          {courses?.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm sticky top-8">
             <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
               <Plus size={20} className="text-brand" /> Add New Lesson
             </h3>
             <div className="space-y-4">
                <input 
                  type="text" placeholder="Lesson Title" 
                  className="w-full p-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-brand/20 transition font-medium"
                  value={form.title} onChange={(e) => setForm({...form, title: e.target.value})}
                />
                <div className="relative">
                  <Video size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" placeholder="YouTube URL" 
                    className="w-full pl-10 pr-3 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-brand/20 transition font-medium"
                    value={form.youtube_url} onChange={(e) => setForm({...form, youtube_url: e.target.value})}
                  />
                </div>
                <div className="relative">
                  <FileText size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" placeholder="PDF Note URL (Cloudinary)" 
                    className="w-full pl-10 pr-3 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-brand/20 transition font-medium"
                    value={form.pdf_url} onChange={(e) => setForm({...form, pdf_url: e.target.value})}
                  />
                </div>
                <div className="relative">
                  <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" placeholder="Live Class Link" 
                    className="w-full pl-10 pr-3 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-brand/20 transition font-medium"
                    value={form.live_url} onChange={(e) => setForm({...form, live_url: e.target.value})}
                  />
                </div>
                <div className="relative">
                  <CheckSquare size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" placeholder="Exam Link" 
                    className="w-full pl-10 pr-3 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-brand/20 transition font-medium"
                    value={form.exam_link} onChange={(e) => setForm({...form, exam_link: e.target.value})}
                  />
                </div>
                <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded-lg text-brand focus:ring-brand/20 border-none"
                    checked={form.exam_enabled} 
                    onChange={(e) => setForm({...form, exam_enabled: e.target.checked})}
                  />
                  <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition">Enable Exam Link</span>
                </label>
                <button 
                  onClick={() => addMutation.mutate(form)}
                  disabled={!form.title || addMutation.isPending}
                  className="w-full py-4 bg-brand text-white rounded-2xl font-black shadow-lg shadow-brand/20 hover:scale-[1.02] active:scale-95 transition disabled:opacity-50 disabled:scale-100"
                >
                  {addMutation.isPending ? "Adding..." : "Add Content"}
                </button>
             </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
             <h3 className="text-lg font-bold text-slate-900 mb-6">Curriculum Structure</h3>
             {isLoading ? (
               <div className="space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl bg-slate-50 animate-pulse" />)}
               </div>
             ) : contents?.length === 0 ? (
               <p className="text-center py-10 text-slate-400 font-medium">No lessons added yet for this course.</p>
             ) : (
               <div className="space-y-3">
                 {contents?.map((content, idx) => (
                   <div key={content.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-transparent hover:border-brand/20 transition group">
                      <div className="flex items-center gap-4">
                         <span className="text-sm font-black text-slate-300">#{idx + 1}</span>
                         <div>
                            <p className="font-bold text-slate-900">{content.title}</p>
                            <div className="flex items-center gap-3 mt-1">
                               {content.youtube_url && <Video size={14} className="text-blue-500" />}
                               {content.pdf_url && <FileText size={14} className="text-orange-500" />}
                               {content.live_url && <Globe size={14} className="text-emerald-500" />}
                               {content.exam_link && <CheckSquare size={14} className="text-indigo-500" />}
                            </div>
                         </div>
                   </div>
                   <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          const newTitle = window.prompt("Edit Lesson Title:", content.title);
                          const newYoutube = window.prompt("Edit YouTube URL:", content.youtube_url || "");
                          if (newTitle !== null) {
                            supabase
                              .from("course_contents")
                              .update({ title: newTitle, youtube_url: newYoutube })
                              .eq("id", content.id)
                              .then(() => {
                                queryClient.invalidateQueries({ queryKey: ["course-content", selectedCourseId] });
                                toast.success("Lesson updated");
                              });
                          }
                        }}
                        className="p-2 rounded-lg text-slate-300 hover:text-brand hover:bg-brand/10 transition opacity-0 group-hover:opacity-100"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => window.confirm("Delete this lesson?") && deleteMutation.mutate(content.id)}
                        className="p-2 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={18} />
                      </button>
                   </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
