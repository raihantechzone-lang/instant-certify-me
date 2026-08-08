import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/attendance")({
  component: () => (
    <div className="p-8 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
      <h2 className="text-2xl font-bold text-slate-900">Student Attendance Tracker</h2>
      <p className="text-slate-500 mt-2">Monitor daily logins and course-wise attendance.</p>
      <div className="mt-10 py-20 border-2 border-dashed border-slate-100 rounded-2xl">
         <p className="text-slate-400 font-medium italic">Attendance data integration pending schema finalization.</p>
      </div>
    </div>
  ),
});
