import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, Phone, Mail, User, Clock, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/students")({
  component: StudentsAdmin,
});

function StudentsAdmin() {
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ["enrollment-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollment_requests")
        .select(`
          *,
          courses (title)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, profile_id, course_id }: { id: string; profile_id: string; course_id: string }) => {
      // 1. Create enrollment
      const { error: enrollError } = await supabase.from("enrollments").insert({
        profile_id,
        course_id,
        status: "active"
      });
      if (enrollError) throw enrollError;

      // 2. Update request status
      const { error: requestError } = await supabase
        .from("enrollment_requests")
        .update({ status: "verified" })
        .eq("id", id);
      if (requestError) throw requestError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollment-requests"] });
      toast.success("Payment verified and course unlocked!");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("enrollment_requests")
        .update({ status: "rejected" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollment-requests"] });
      toast.error("Enrollment request rejected");
    },
  });

  const filteredRequests = requests?.filter(req => 
    req.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.transaction_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-black text-slate-900">Students & Payments</h2>
        <p className="text-slate-500 font-medium">Verify bKash transactions and manage course access.</p>
      </div>

      <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by name or Transaction ID..." 
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
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Payment Details</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400">Loading requests...</td></tr>
              ) : filteredRequests?.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400">No enrollment requests found.</td></tr>
              ) : (
                filteredRequests?.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold">
                          {req.full_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{req.full_name}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                             <Phone size={12} /> {req.mobile_number}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <p className="text-sm font-bold text-slate-600">{req.courses?.title}</p>
                    </td>
                    <td className="px-6 py-4">
                       <div className="space-y-1">
                          <p className="text-sm font-black text-slate-900">৳{req.amount || '0'}</p>
                          <p className="text-xs font-mono text-brand bg-brand/5 px-2 py-0.5 rounded-lg inline-block">
                             {req.transaction_id}
                          </p>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                         req.status === 'verified' ? 'bg-emerald-50 text-emerald-600' :
                         req.status === 'rejected' ? 'bg-rose-50 text-rose-600' :
                         'bg-amber-50 text-amber-600'
                       }`}>
                         {req.status}
                       </span>
                    </td>
                    <td className="px-6 py-4">
                      {req.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => verifyMutation.mutate({ id: req.id, profile_id: req.profile_id, course_id: req.course_id })}
                            className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition"
                          >
                            <Check size={18} />
                          </button>
                          <button 
                            onClick={() => rejectMutation.mutate(req.id)}
                            className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      )}
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
