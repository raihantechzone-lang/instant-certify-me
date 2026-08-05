import { Outlet, Link, useRouter, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, BookOpen, Users, Settings, LogOut, BarChart3, Star, FileText } from "lucide-react";

export default function AdminLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("gators-admin-session");
    navigate({ to: "/admin" });
  };

  const navItems = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Courses", href: "/admin/courses", icon: BookOpen },
    { name: "Students & Payments", href: "/admin/students", icon: Users },
    { name: "Content & Exams", href: "/admin/content", icon: FileText },
    { name: "Reviews & Ads", href: "/admin/reviews", icon: Star },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      <aside className="w-64 bg-white border-r border-slate-100 p-6 flex flex-col">
        <h1 className="text-xl font-black text-brand mb-10 px-2">MaxSkills Admin</h1>
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
        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-rose-500">
           <LogOut size={20} /> Log Out
        </button>
      </aside>
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
