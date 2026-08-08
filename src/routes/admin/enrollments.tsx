import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, UserPlus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/enrollments")({
  component: EnrollmentsAdmin,
});

function EnrollmentsAdmin() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ["admin-enrollments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select(`
          *,
          courses (title),
          profiles (full_name, roll_number)
        `)
        .order("enrolled_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("enrollments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-enrollments"] });
      toast.success("Enrollment removed");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = enrollments?.filter(e => 
    e.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.profiles?.roll_number?.toLowerCase().includes(search.toLowerCase()) ||
    e.courses?.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 animate-in fade-in duration-500 space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Enrollment Management</h2>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
        <Search className="text-slate-400" />
        <input 
          placeholder="Search enrollments..." 
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
               <th className="px-6 py-4">Course</th>
               <th className="px-6 py-4">Status</th>
               <th className="px-6 py-4">Action</th>
             </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-400 italic">Loading...</td></tr>
            ) : filtered?.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-400 italic">No records found.</td></tr>
            ) : (
              filtered?.map(e => (
                <tr key={e.id}>
                  <td className="px-6 py-4">
                    <div className="font-bold">{e.profiles?.full_name}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Roll: {e.profiles?.roll_number}</div>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-600">{e.courses?.title}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-black uppercase tracking-widest">
                      {e.status || 'active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => window.confirm("Remove enrollment?") && deleteMutation.mutate(e.id)}
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
