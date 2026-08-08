import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Search } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/admin/transactions")({
  component: TransactionsAdmin,
});

function TransactionsAdmin() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ["admin-enrollment-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollment_requests")
        .select("*, courses(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (req: any) => {
      // 1. Mark request as verified
      const { error: reqError } = await supabase
        .from("enrollment_requests")
        .update({ status: 'verified' })
        .eq("id", req.id);
      if (reqError) throw reqError;

      // 2. Create enrollment record
      const { error: enrError } = await supabase
        .from("enrollments")
        .insert({
          profile_id: req.user_id, // assuming req.user_id exists
          course_id: req.course_id,
          status: 'active'
        });
      if (enrError) throw enrError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-enrollment-requests"] });
      toast.success("Payment verified and enrollment unlocked!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = requests?.filter(r => 
    r.full_name.toLowerCase().includes(search.toLowerCase()) || 
    r.transaction_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 animate-in fade-in duration-500 space-y-8">
      <h2 className="text-2xl font-bold text-slate-900">Transaction Verification</h2>
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
        <Search className="text-slate-400" />
        <input 
          placeholder="Search by name or TrxID..." 
          className="flex-1 bg-transparent border-none focus:ring-0"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 text-xs font-black text-slate-400 uppercase">
             <tr>
               <th className="px-6 py-4">Student</th>
               <th className="px-6 py-4">Course</th>
               <th className="px-6 py-4">TrxID</th>
               <th className="px-6 py-4">Status</th>
               <th className="px-6 py-4">Action</th>
             </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered?.map(r => (
              <tr key={r.id}>
                <td className="px-6 py-4 font-bold">{r.full_name}</td>
                <td className="px-6 py-4">{r.courses?.title}</td>
                <td className="px-6 py-4 font-mono">{r.transaction_id}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-lg text-xs font-black ${r.status === 'verified' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    {r.status || 'pending'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {r.status !== 'verified' && (
                    <button onClick={() => verifyMutation.mutate(r)} className="px-3 py-1.5 bg-brand text-white rounded-lg text-xs font-bold hover:scale-105 transition">
                      Verify
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
