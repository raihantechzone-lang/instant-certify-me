import { createFileRoute, Outlet, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { LayoutDashboard, BookOpen, Users, Settings, LogOut, Star, FileText, Award, CalendarCheck, UserPlus, Medal, DollarSign, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  component: AdminGuard,
});

const SESSION_KEY = "gators-admin-session";

function AdminGuard() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function checkAdmin() {
      const isAuthed = localStorage.getItem(SESSION_KEY) === "1";
      if (!isAuthed) {
        setAuthed(false);
        setCheckingRole(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        localStorage.removeItem(SESSION_KEY);
        setAuthed(false);
        setCheckingRole(false);
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin");

      if (!roles || roles.length === 0) {
        localStorage.removeItem(SESSION_KEY);
        setAuthed(false);
      } else {
        setAuthed(true);
      }
      setCheckingRole(false);
    }

    checkAdmin();
  }, []);

  if (authed === null || checkingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-alt">
        <div className="w-10 h-10 border-4 border-brand/30 border-t-brand rounded-full animate-spin" />
      </div>
    );
  }

  if (!authed) {
    return <AdminLogin onSuccess={() => setAuthed(true)} />;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(SESSION_KEY);
    setAuthed(false);
    navigate({ to: "/admin" });
  };

  const navItems = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Categories", href: "/admin/categories", icon: LayoutDashboard },
    { name: "Courses", href: "/admin/courses", icon: BookOpen },
    { name: "Course Content", href: "/admin/content", icon: FileText },
    { name: "Exams & Links", href: "/admin/exams", icon: FileText },
    { name: "Results Board", href: "/admin/results", icon: Medal },
    { name: "Active Students", href: "/admin/students", icon: Users },
    { name: "Attendance", href: "/admin/attendance", icon: CalendarCheck },
    { name: "Enrollments", href: "/admin/enrollments", icon: UserPlus },
    { name: "Certified Students", href: "/admin/certified", icon: Medal },
    { name: "Send Certificates", href: "/admin/certificates", icon: Award },
    { name: "Course Earnings", href: "/admin/earnings", icon: DollarSign },
    { name: "Verification", href: "/admin/transactions", icon: ShieldCheck },
    { name: "Reviews & Ads", href: "/admin/reviews", icon: Star },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      <aside className="w-64 bg-white border-r border-slate-200 p-6 flex flex-col sticky top-0 h-screen shrink-0">
        <div className="h-16 flex items-center px-2 mb-8 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5 font-bold text-xl text-slate-800 tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Award className="text-white text-lg" />
            </div>
            EduAdmin<span className="text-indigo-600">.</span>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto pr-2 custom-scrollbar">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              activeOptions={{ exact: item.href === "/admin" }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition border-l-4 border-transparent"
              activeProps={{ className: "bg-indigo-50 text-indigo-600 border-indigo-600 hover:text-indigo-600 font-semibold shadow-none" }}
            >
              <item.icon size={20} />
              {item.name}
            </Link>
          ))}
        </nav>
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-rose-500 hover:bg-rose-50 rounded-lg transition mt-4 shrink-0">
           <LogOut size={20} /> Log Out
        </button>
      </aside>
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 z-20 shrink-0 sticky top-0">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Control Panel</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full flex items-center gap-2 border border-emerald-100">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live Sync
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
