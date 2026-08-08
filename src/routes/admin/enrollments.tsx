import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/enrollments")({
  component: () => (
    <div className="p-8 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
      <h2 className="text-2xl font-bold text-slate-900">Enrollment Management</h2>
      <p className="text-slate-500 mt-2">Manage all student course enrollments and status.</p>
      <div className="mt-10 py-20 border-2 border-dashed border-slate-100 rounded-2xl">
         <p className="text-slate-400 font-medium italic">Enrollment list view coming soon.</p>
      </div>
    </div>
  ),
});
