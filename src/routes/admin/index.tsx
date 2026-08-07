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
      <div>
        <h2 className="text-3xl font-black text-slate-900">Dashboard Overview</h2>
        <p className="text-slate-500 font-medium">Welcome back, Adel. Here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Students" value={stats?.totalStudents || 0} icon={Users} color="blue" />
        <StatCard title="Active Courses" value={stats?.totalCourses || 0} icon={BookOpen} color="brand" />
        <StatCard title="Total Revenue" value={`৳${stats?.totalRevenue || 0}`} icon={DollarSign} color="green" />
        <StatCard title="Total Reviews" value={stats?.totalReviews || 0} icon={Star} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">Revenue Analytics</h3>
            <div className="flex items-center gap-2 text-green-500 text-sm font-bold">
              <TrendingUp size={16} /> +12.5%
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
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
                    <p className="font-bold text-brand">{req.transaction_id}</p>
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
