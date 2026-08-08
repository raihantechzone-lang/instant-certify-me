import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, Trophy, Trash2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/results")({
  component: ResultsAdmin,
});

function ResultsAdmin() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: results, isLoading } = useQuery({
    queryKey: ["admin-results"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_results")
        .select(`
          *,
          courses (title),
          profiles (full_name, roll_number)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exam_results").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-results"] });
      toast.success("Result removed");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = results?.filter(r => 
    r.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.profiles?.roll_number?.toLowerCase().includes(search.toLowerCase()) ||
    r.exam_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 animate-in fade-in duration-500 space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Results Board</h2>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
        <Search className="text-slate-400" />
        <input 
          placeholder="Search results..." 
          className="flex-1 bg-transparent border-none focus:ring-0"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-xs font-black text-slate-400 uppercase">
             <tr>
               <th className="px-6 py-4">Student</th>
               <th className="px-6 py-4">Exam</th>
               <th className="px-6 py-4">Score</th>
               <th className="px-6 py-4">Action</th>
             </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-400 italic">Loading...</td></tr>
            ) : filtered?.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-400 italic">No records found.</td></tr>
            ) : (
              filtered?.map(r => (
                <tr key={r.id}>
                  <td className="px-6 py-4">
                    <div className="font-bold">{r.profiles?.full_name}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Roll: {r.profiles?.roll_number}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-600">{r.exam_name}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">{r.courses?.title}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-black text-indigo-600">{r.score}</span>
                    <span className="text-slate-400 text-xs"> / {r.max_score}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => window.confirm("Delete result?") && deleteMutation.mutate(r.id)}
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
