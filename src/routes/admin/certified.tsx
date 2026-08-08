import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Award, Search, ExternalLink, User } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/admin/certified")({
  component: CertifiedAdmin,
});

function CertifiedAdmin() {
  const [search, setSearch] = useState("");

  const { data: certified, isLoading } = useQuery({
    queryKey: ["admin-certified-students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select(`
          *,
          courses (title),
          profiles (full_name, roll_number)
        `)
        .not("certificate_url", "is", null)
        .order("enrolled_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = certified?.filter(e => 
    e.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.profiles?.roll_number?.toLowerCase().includes(search.toLowerCase()) ||
    e.courses?.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 animate-in fade-in duration-500 space-y-8">
      <h2 className="text-2xl font-bold text-slate-900">Certified Students</h2>
      <p className="text-slate-500 mt-2">View all students who have completed courses and earned certificates.</p>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
        <Search className="text-slate-400" />
        <input 
          placeholder="Search certified students..." 
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
               <th className="px-6 py-4">Certificate</th>
               <th className="px-6 py-4">Action</th>
             </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-400 italic">Loading...</td></tr>
            ) : filtered?.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-400 italic">No certified students found yet.</td></tr>
            ) : (
              filtered?.map(e => (
                <tr key={e.id}>
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <User size={16} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{e.profiles?.full_name}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Roll: {e.profiles?.roll_number}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-600">{e.courses?.title}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold">
                       <Award size={14} /> Issued
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <a 
                      href={e.certificate_url || "#"} 
                      target="_blank" 
                      rel="noreferrer"
                      className="p-2 text-brand hover:bg-brand/10 rounded-xl transition flex items-center gap-1 text-xs font-bold"
                    >
                      <ExternalLink size={16} /> View
                    </a>
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
