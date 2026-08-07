import { createFileRoute, Outlet, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { LayoutDashboard, BookOpen, Users, Settings, LogOut, Star, FileText, Award } from "lucide-react";
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
    { name: "Courses", href: "/admin/courses", icon: BookOpen },
    { name: "Students & Payments", href: "/admin/students", icon: Users },
    { name: "Certificates", href: "/admin/certificates", icon: Award },
    { name: "Content & Exams", href: "/admin/content", icon: FileText },

    { name: "Reviews & Ads", href: "/admin/reviews", icon: Star },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      <aside className="w-64 bg-white border-r border-slate-100 p-6 flex flex-col sticky top-0 h-screen">
        <h1 className="text-xl font-black text-brand mb-10 px-2 tracking-tight">MaxSkills Admin</h1>
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              activeOptions={{ exact: item.href === "/admin" }}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-slate-500 hover:bg-brand/5 hover:text-brand transition"
              activeProps={{ className: "bg-brand text-white shadow-lg shadow-brand/20 hover:text-white" }}
            >
              <item.icon size={20} />
              {item.name}
            </Link>
          ))}
        </nav>
        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-50 rounded-2xl transition">
           <LogOut size={20} /> Log Out
        </button>
      </aside>
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
