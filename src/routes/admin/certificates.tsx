import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Award, Search, Upload, ExternalLink, Trash2, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/certificates")({
  component: CertificatesAdmin,
});

function CertificatesAdmin() {
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ["admin-enrollments-certificates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
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

  const uploadMutation = useMutation({
    mutationFn: async ({ id, url }: { id: string; url: string }) => {
      const { error } = await supabase
        .from("enrollments")
        .update({ certificate_url: url })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-enrollments-certificates"] });
      toast.success("Certificate uploaded and student notified!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = enrollments?.filter(e => 
    e.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.profiles?.roll_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.courses?.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-black text-slate-900">Certificate Issuance</h2>
        <p className="text-slate-500 font-medium">Upload PDF certificates to unlock them for students.</p>
      </div>

      <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by student name, roll, or course..." 
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-brand/20 transition font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Student</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Course</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Certificate Status</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-400 font-medium">Fetching records...</td></tr>
              ) : filtered?.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-400 font-medium">No records found.</td></tr>
              ) : (
                filtered?.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4">
                       <div>
                          <p className="font-bold text-slate-900">{e.profiles?.full_name}</p>
                          <p className="text-[10px] font-black text-brand uppercase tracking-widest">Roll: {e.profiles?.roll_number}</p>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <p className="text-sm font-bold text-slate-600 line-clamp-1">{e.courses?.title}</p>
                    </td>
                    <td className="px-6 py-4">
                       {e.certificate_url ? (
                         <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                            <CheckCircle2 size={16} /> Issued
                         </div>
                       ) : (
                         <div className="flex items-center gap-2 text-slate-400 font-bold text-sm">
                            <div className="w-2 h-2 rounded-full bg-slate-200" /> Pending
                         </div>
                       )}
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              const url = window.prompt("Enter Certificate PDF URL (Cloudinary):");
                              if (url) uploadMutation.mutate({ id: e.id, url });
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-xl text-xs font-black hover:scale-105 transition active:scale-95 shadow-lg shadow-brand/10"
                          >
                            <Upload size={14} /> {e.certificate_url ? "Update" : "Upload"}
                          </button>
                          {e.certificate_url && (
                            <a 
                              href={e.certificate_url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition"
                            >
                               <ExternalLink size={16} />
                            </a>
                          )}
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
