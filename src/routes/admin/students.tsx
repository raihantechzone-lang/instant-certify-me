import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, Phone, Mail, User, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/students")({
  component: StudentsAdmin,
});

function StudentsAdmin() {
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  const { data: students, isLoading } = useQuery({
    queryKey: ["admin-students-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          *,
          enrollments (
            course_id,
            courses (title)
          )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = students?.filter(s => 
    s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.roll_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.mobile?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
              <h2 className="text-xl font-bold text-slate-900">Active Registered Students</h2>
              <p className="text-sm text-slate-500">Students with accounts on the platform.</p>
          </div>
          <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg text-sm font-bold border border-emerald-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {students?.length || 0} Total
          </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search students..." 
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500/20 transition font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {isLoading ? (
          [1,2,3,4].map(i => <div key={i} className="h-48 rounded-2xl bg-slate-100 animate-pulse" />)
        ) : filtered?.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-400 font-medium italic">No students found.</div>
        ) : (
          filtered?.map((s) => (
            <div key={s.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition group text-center flex flex-col items-center">
              <div className="w-20 h-20 rounded-full border-4 border-slate-50 shadow-sm mb-4 bg-slate-100 flex items-center justify-center overflow-hidden">
                {s.avatar_url ? (
                  <img src={s.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={40} className="text-slate-300" />
                )}
              </div>
              <h3 className="font-bold text-slate-900 line-clamp-1">{s.full_name || "New Student"}</h3>
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full mt-2">Roll: {s.roll_number || "N/A"}</span>
              
              <div className="w-full grid grid-cols-2 gap-2 mt-6">
                 <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex flex-col items-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Courses</span>
                    <span className="text-lg font-black text-slate-800">{s.enrollments?.length || 0}</span>
                 </div>
                 <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex flex-col items-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Status</span>
                    <span className="text-lg font-black text-emerald-500 truncate w-full px-1">Active</span>
                 </div>
              </div>

              <div className="mt-4 w-full text-xs text-slate-400 font-medium flex flex-col items-start gap-1">
                 <div className="flex items-center gap-2"><Phone size={12} /> {s.mobile || "N/A"}</div>
                 <div className="flex items-center gap-2 truncate w-full"><Mail size={12} /> {s.email || "N/A"}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
