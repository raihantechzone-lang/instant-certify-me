import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/results")({
  component: () => (
    <div className="p-8 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
      <h2 className="text-2xl font-bold text-slate-900">Results Board</h2>
      <p className="text-slate-500 mt-2">Track student performance across all courses.</p>
      <div className="mt-10 py-20 border-2 border-dashed border-slate-100 rounded-2xl">
         <p className="text-slate-400 font-medium italic">Scoreboard will be populated from exam results.</p>
      </div>
    </div>
  ),
});
