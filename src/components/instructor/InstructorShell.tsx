import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

const NAV = [
  { to: "/instructor", label: "Dashboard" },
  { to: "/instructor/courses", label: "Courses" },
  { to: "/instructor/students", label: "Students" },
  { to: "/instructor/earnings", label: "Earnings" },
  { to: "/instructor/analytics", label: "Analytics" },
  { to: "/instructor/announcements", label: "Announcements" },
] as const;

export function InstructorShell({ title, children }: { title: string; children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-surface-alt">
      <SiteHeader />
      <main className="pt-32 sm:pt-40 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-ink mb-6">{title}</h1>
        <div className="flex flex-wrap gap-2 mb-8">
          {NAV.map((item) => {
            const active = item.to === "/instructor" ? pathname === "/instructor" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                  active ? "bg-brand text-brand-foreground shadow" : "bg-background border border-border text-ink-muted hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl bg-background border border-border p-5 shadow-sm">
      <p className="text-xs font-bold text-ink-muted uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-ink mt-2">{value}</p>
      {hint && <p className="text-xs text-ink-muted mt-1">{hint}</p>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-muted text-ink-muted",
    pending: "bg-brand-soft text-brand",
    published: "bg-brand text-brand-foreground",
    approved: "bg-brand text-brand-foreground",
    rejected: "bg-destructive/10 text-destructive",
    unpublished: "bg-muted text-ink-muted",
    graded: "bg-brand text-brand-foreground",
    paid: "bg-brand text-brand-foreground",
    submitted: "bg-brand-soft text-brand",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${styles[status] ?? "bg-muted text-ink-muted"}`}>
      {status}
    </span>
  );
}
