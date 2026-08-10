import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Video, FileText, Globe, Plus, Trash2, Edit2, Link as LinkIcon, Calendar, CheckSquare, Upload, Loader2, Play, X } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { uploadToImageKit } from "@/lib/imagekit";

export const Route = createFileRoute("/admin/content")({
  component: ContentAdmin,
});

function ContentAdmin() {
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");

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
    thumbnail_url: "",
    is_free: false
  });

  const addMutation = useMutation({
    mutationFn: async (payload: any) => {
      console.log("Adding lesson to course:", selectedCourseId, "with payload:", payload);
      
      if (!selectedCourseId) {
        throw new Error("No course selected");
      }

      const { data: countData, error: countError } = await supabase
        .from("course_contents")
        .select("id")
        .eq("course_id", selectedCourseId);
        
      if (countError) {
        console.error("Error fetching content count:", countError);
      }

      const position = (countData?.length || 0) + 1;

      const { error } = await supabase.from("course_contents").insert({
        title: payload.title.trim(),
        youtube_url: payload.youtube_url || null,
        pdf_url: payload.pdf_url || null,
        live_url: payload.live_url || null,
        exam_link: payload.exam_link || null,
        exam_enabled: !!payload.exam_enabled,
        thumbnail_url: payload.thumbnail_url || null,
        is_free: !!payload.is_free,
        course_id: selectedCourseId,
        position,
        live_expires_at: payload.live_url ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
      });
      if (error) {
        console.error("Supabase Error Details:", error.message, error.details, error.hint);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-content", selectedCourseId] });
      toast.success("Lesson added successfully");
      setForm({ title: "", youtube_url: "", pdf_url: "", live_url: "", exam_link: "", exam_enabled: false, thumbnail_url: "", is_free: false });
    },
    onError: (err: any) => {
      console.error("Content Creation Failed:", err);
      toast.error(`Error: ${err.message || "Failed to add lesson"}`);
    },
  });

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-2">Curriculum Builder</h2>
          <p className="text-sm text-slate-500">ভিডিও যোগ করার জন্য একটি কোর্স নির্বাচন করুন।</p>
        </div>
        <select 
          className="w-full md:w-64 p-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 transition font-bold text-sm"
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
        >
          {courses?.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm sticky top-8">
             <h3 className="font-bold text-slate-900 mb-4">Add New Video</h3>
             <div className="space-y-4">
                <input 
                  type="text" placeholder="Lesson Title" 
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 transition font-medium"
                  value={form.title} onChange={(e) => setForm({...form, title: e.target.value})}
                />
                <div className="relative">
                  <Video size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" placeholder="YouTube URL" 
                     className="w-full pl-10 pr-3 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 transition font-medium"
                    value={form.youtube_url} onChange={(e) => {
                      setForm({...form, youtube_url: e.target.value});
                      setPreviewUrl(e.target.value);
                    }}
                  />
                </div>
                {previewUrl && getYoutubeId(previewUrl) && (
                  <div className="aspect-video rounded-xl overflow-hidden bg-black border border-slate-200">
                    <iframe 
                      className="w-full h-full"
                      src={`https://www.youtube.com/embed/${getYoutubeId(previewUrl)}`}
                      title="Video preview"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                )}
                <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 cursor-pointer border border-dashed border-slate-300 hover:border-indigo-500 transition">
                  {isUploading ? <Loader2 size={16} className="animate-spin text-indigo-600" /> : <Upload size={16} className="text-slate-400" />}
                  <span className="text-sm font-bold text-slate-600">{isUploading ? 'Uploading thumbnail...' : 'Upload Thumbnail Image'}</span>
                  <input 
                    type="file" className="hidden" accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        setIsUploading(true);
                        const url = await uploadToImageKit(file, "/lessons");
                        setForm({...form, thumbnail_url: url});
                        toast.success("Thumbnail uploaded");
                      } catch (err: any) {
                        toast.error(err.message);
                      } finally {
                        setIsUploading(false);
                      }
                    }}
                  />
                </label>
                {form.thumbnail_url && (
                  <div className="relative group rounded-xl overflow-hidden border border-slate-100 aspect-video">
                    <img src={form.thumbnail_url} alt="Thumbnail preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                       <button onClick={() => setForm({...form, thumbnail_url: ""})} className="bg-white p-2 rounded-lg text-rose-500 shadow-sm"><Trash2 size={16} /></button>
                    </div>
                  </div>
                )}
                <div className="relative">
                  <FileText size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" placeholder="PDF Note URL (Cloudinary)" 
                     className="w-full pl-10 pr-3 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 transition font-medium"
                    value={form.pdf_url} onChange={(e) => setForm({...form, pdf_url: e.target.value})}
                  />
                </div>
                <div className="relative">
                  <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" placeholder="Live Class Link (Meet/Zoom)" 
                     className="w-full pl-10 pr-3 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 transition font-medium"
                    value={form.live_url} onChange={(e) => setForm({...form, live_url: e.target.value})}
                  />
                </div>
                <div className="relative">
                  <CheckSquare size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" placeholder="Exam Link" 
                    className="w-full pl-10 pr-3 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 transition font-medium"
                    value={form.exam_link} onChange={(e) => setForm({...form, exam_link: e.target.value})}
                  />
                </div>
                <div className="flex gap-4">
                  <label className="flex-1 flex items-center gap-2 p-3 rounded-xl bg-slate-50 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded-lg text-indigo-600 focus:ring-indigo-500/20 border-slate-200"
                      checked={form.exam_enabled} 
                      onChange={(e) => setForm({...form, exam_enabled: e.target.checked})}
                    />
                    <span className="text-xs font-bold text-slate-600">Exam ON</span>
                  </label>
                  <label className="flex-1 flex items-center gap-2 p-3 rounded-xl bg-slate-50 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded-lg text-emerald-600 focus:ring-emerald-500/20 border-slate-200"
                      checked={form.is_free} 
                      onChange={(e) => setForm({...form, is_free: e.target.checked})}
                    />
                    <span className="text-xs font-bold text-slate-600">Is Free</span>
                  </label>
                </div>
                <button 
                  onClick={() => addMutation.mutate(form)}
                  disabled={!form.title || addMutation.isPending}
                  className="w-full py-3.5 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 hover:bg-red-700 active:scale-95 transition disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                >
                  {addMutation.isPending ? "Adding..." : "Add Content"}
                </button>
             </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
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
                    <div key={content.id} className="flex flex-col p-4 rounded-2xl bg-slate-50 border border-transparent hover:border-brand/20 transition group">
                      <div className="flex items-center justify-between">
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
                           {content.youtube_url && (
                             <button 
                               onClick={() => setPreviewUrl(content.youtube_url || "")}
                               className="p-2 rounded-lg text-brand hover:bg-brand/10 transition"
                               title="Preview video"
                             >
                               <Play size={18} />
                             </button>
                           )}
                           <button 
                             onClick={() => {
                               const newTitle = window.prompt("Edit Lesson Title:", content.title);
                               const newYoutube = window.prompt("Edit YouTube URL:", content.youtube_url || "");
                               if (newTitle !== null) {
                                 const updateLesson = async () => {
                                   const { error } = await supabase
                                     .from("course_contents")
                                     .update({ title: newTitle, youtube_url: newYoutube })
                                     .eq("id", content.id);
                                   
                                    if (error) {
                                      console.error("Supabase Error Details:", error.message, error.details, error.hint);
                                      toast.error(`Error: ${error.message}`);
                                    } else {
                                     queryClient.invalidateQueries({ queryKey: ["course-content", selectedCourseId] });
                                     toast.success("Lesson updated");
                                   }
                                 };
                                 updateLesson();
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
                      
                      {previewUrl === content.youtube_url && content.youtube_url && getYoutubeId(content.youtube_url) && (
                        <div className="mt-4 aspect-video rounded-xl overflow-hidden bg-black border border-slate-200 animate-in zoom-in-95 duration-200">
                          <iframe 
                            className="w-full h-full"
                            src={`https://www.youtube.com/embed/${getYoutubeId(content.youtube_url)}?autoplay=1`}
                            title="Video preview"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          ></iframe>
                          <button 
                            onClick={() => setPreviewUrl("")}
                            className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black transition"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}
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
