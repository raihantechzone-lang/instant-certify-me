import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, Link as LinkIcon, Trash2, Globe, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/exams")({
  component: ExamsAdmin,
});

function ExamsAdmin() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: contents, isLoading } = useQuery({
    queryKey: ["admin-exams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_contents")
        .select(`*, courses(title)`)
        .not("exam_link", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteLinkMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("course_contents")
        .update({ exam_link: null, exam_enabled: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-exams"] });
      toast.success("Exam link removed from lesson");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = contents?.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.courses?.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 animate-in fade-in duration-500 space-y-8">
      <h2 className="text-2xl font-bold text-slate-900">Exams & Links</h2>
      <p className="text-slate-500 mt-2">Manage external exam portals and specific resource links associated with course content.</p>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
        <Search className="text-slate-400" />
        <input 
          placeholder="Search by lesson or course..." 
          className="flex-1 bg-transparent border-none focus:ring-0"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-xs font-black text-slate-400 uppercase">
             <tr>
               <th className="px-6 py-4">Lesson / Course</th>
               <th className="px-6 py-4">Exam Link</th>
               <th className="px-6 py-4">Status</th>
               <th className="px-6 py-4">Action</th>
             </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-400 italic">Loading...</td></tr>
            ) : filtered?.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-400 italic">No exams found. Add them in Course Content.</td></tr>
            ) : (
              filtered?.map(c => (
                <tr key={c.id}>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{c.title}</div>
                    <div className="text-[10px] text-brand uppercase font-black tracking-widest">{c.courses?.title}</div>
                  </td>
                  <td className="px-6 py-4">
                    <a href={c.exam_link || "#"} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1">
                      <ExternalLink size={12} /> View Link
                    </a>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${c.exam_enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                      {c.exam_enabled ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => window.confirm("Remove exam link from this lesson?") && deleteLinkMutation.mutate(c.id)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
