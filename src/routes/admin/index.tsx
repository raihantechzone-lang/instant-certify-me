import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from "recharts";
import { Users, BookOpen, CreditCard, Star, TrendingUp, DollarSign } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [courses, students, enrollments, reviews, recentRequests] = await Promise.all([
        supabase.from("courses").select("id", { count: "exact" }),
        supabase.from("profiles").select("id", { count: "exact" }),
        supabase.from("enrollments").select("id, status"),
        supabase.from("reviews").select("id", { count: "exact" }),
        supabase.from("enrollment_requests").select("*, courses(title)").order("created_at", { ascending: false }).limit(5)
      ]);

      const totalRevenue = 0; // Amount not explicitly stored in enrollments in current schema

      return {
        totalCourses: courses.count || 0,
        totalStudents: students.count || 0,
        totalEnrollments: enrollments.data?.length || 0,
        totalReviews: reviews.count || 0,
        totalRevenue,
        recentRequests: recentRequests.data || []
      };
    },
  });

  const chartData = [
    { name: "Sat", sales: 4000 },
    { name: "Sun", sales: 3000 },
    { name: "Mon", sales: 2000 },
    { name: "Tue", sales: 2780 },
    { name: "Wed", sales: 1890 },
    { name: "Thu", sales: 2390 },
    { name: "Fri", sales: 3490 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Overview</h1>
          <p className="text-sm text-slate-500 mt-1">Here's what's happening with your platform today.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition relative overflow-hidden group">
          <div className="flex justify-between items-start mb-2 relative z-10">
            <div className="flex items-center gap-2 text-slate-500 font-medium text-sm">
              <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign size={14} />
              </div>
              Total Revenue
            </div>
          </div>
          <div className="relative z-10">
            <h3 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">৳{stats?.totalRevenue || 0}</h3>
            <div className="flex items-center gap-2 text-xs font-medium">
              <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded flex items-center gap-1">Active</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition relative overflow-hidden group">
          <div className="flex justify-between items-start mb-2 relative z-10">
            <div className="flex items-center gap-2 text-slate-500 font-medium text-sm">
              <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users size={14} />
              </div>
              Total Enrollments
            </div>
          </div>
          <div className="relative z-10">
            <h3 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">{stats?.totalEnrollments || 0}</h3>
            <div className="flex items-center gap-2 text-xs font-medium">
              <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded flex items-center gap-1">Growing</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition relative overflow-hidden group">
          <div className="flex justify-between items-start mb-2 relative z-10">
            <div className="flex items-center gap-2 text-slate-500 font-medium text-sm">
              <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Users size={14} />
              </div>
              Registered Students
            </div>
          </div>
          <div className="relative z-10">
            <h3 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">{stats?.totalStudents || 0}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Revenue Trend</h3>
              <p className="text-xs text-slate-500 mt-1">Metrics across all courses</p>
            </div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Recent Enrollment Requests</h3>
          <div className="space-y-4">
             {stats?.recentRequests?.map((req: any) => (
               <div key={req.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">
                      {req.full_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{req.full_name}</p>
                      <p className="text-xs text-slate-500 font-medium">Enrolled in {req.courses?.title}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-indigo-600">৳{req.amount || 0}</p>
                    <p className="text-[10px] text-slate-400">{new Date(req.created_at).toLocaleDateString()}</p>
                  </div>
               </div>
             ))}
             {(!stats?.recentRequests || stats.recentRequests.length === 0) && (
               <p className="text-center py-10 text-slate-400 text-sm">No recent requests.</p>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: { title: string, value: string | number, icon: any, color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    brand: "bg-brand/10 text-brand",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition group">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${colors[color]}`}>
        <Icon size={24} />
      </div>
      <p className="text-slate-500 text-sm font-bold mb-1">{title}</p>
      <h4 className="text-2xl font-black text-slate-900">{value}</h4>
    </div>
  );
}
