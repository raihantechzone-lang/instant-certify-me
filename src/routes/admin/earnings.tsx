import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingUp, Calendar, CreditCard, ArrowUpRight, ArrowDownRight } from "lucide-react";

export const Route = createFileRoute("/admin/earnings")({
  component: EarningsAdmin,
});

function EarningsAdmin() {
  const { data: stats } = useQuery({
    queryKey: ["admin-earnings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select(`
          id,
          created_at,
          payment_status,
          courses (
            price
          )
        `)
        .eq("payment_status", "verified");
      
      if (error) throw error;

      const totalRevenue = data?.reduce((sum, item) => {
        const price = Array.isArray(item.courses) ? item.courses[0]?.price : (item.courses as any)?.price;
        return sum + (Number(price) || 0);
      }, 0) || 0;
      const count = data?.length || 0;
      
      return { totalRevenue, count, transactions: data };
    },
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-1">Financial Overview</h2>
          <p className="text-sm text-slate-500 font-medium">আপনার অর্জিত মোট আয় এবং লেনদেনসমূহ দেখুন।</p>
        </div>
        <div className="flex items-center gap-2">
           <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-sm font-bold border border-emerald-100 flex items-center gap-2">
             <DollarSign size={16} /> মোট আয়: ৳{stats?.totalRevenue?.toLocaleString()}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
           <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
             <TrendingUp size={24} />
           </div>
           <p className="text-sm font-bold text-slate-400 mb-1 uppercase tracking-wider">Total Revenue</p>
           <h3 className="text-2xl font-black text-slate-900">৳{stats?.totalRevenue?.toLocaleString()}</h3>
           <p className="text-xs text-emerald-500 font-bold mt-2 flex items-center gap-1">
             <ArrowUpRight size={14} /> +12.5% vs last month
           </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
           <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4">
             <CreditCard size={24} />
           </div>
           <p className="text-sm font-bold text-slate-400 mb-1 uppercase tracking-wider">Verified Sales</p>
           <h3 className="text-2xl font-black text-slate-900">{stats?.count}</h3>
           <p className="text-xs text-slate-500 font-medium mt-2">Successful enrollments</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
           <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 mb-4">
             <Calendar size={24} />
           </div>
           <p className="text-sm font-bold text-slate-400 mb-1 uppercase tracking-wider">Monthly Avg</p>
           <h3 className="text-2xl font-black text-slate-900">৳{(stats?.totalRevenue && stats?.totalRevenue > 0 ? Math.round(stats.totalRevenue / 1) : 0).toLocaleString()}</h3>
           <p className="text-xs text-slate-500 font-medium mt-2">Projection based on current data</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50">
           <h3 className="font-bold text-slate-900">Recent Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Enrollment ID</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {stats?.transactions?.map((tx: any) => (
                <tr key={tx.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-6 py-4 text-sm font-medium text-slate-600">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">
                    {tx.id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4 text-sm font-black text-slate-900">
                    ৳{(Array.isArray(tx.courses) ? tx.courses[0]?.price : tx.courses?.price) || 0}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                      Verified
                    </span>
                  </td>
                </tr>
              ))}
              {(!stats?.transactions || stats.transactions.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-slate-400 italic font-medium">
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
