// Shared styling tokens + types reused by the new admin tabs.
// Mirrors the tokens already defined inline in src/routes/admin.tsx.
export const card = "rounded-2xl bg-background border border-border p-6 shadow-sm";
export const input = "w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm outline-none focus:border-brand";
export const btn = "px-5 py-3 rounded-xl bg-brand text-brand-foreground text-sm font-bold";
export const btnGhost = "px-5 py-3 rounded-xl border-2 border-border text-sm font-bold text-destructive";
export const btnSm = "px-3 py-2 rounded-lg bg-brand text-brand-foreground text-xs font-bold";
export const btnSmGhost = "px-3 py-2 rounded-lg border-2 border-border text-xs font-bold text-destructive";

export type Notify = (msg: string) => void;

export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const csv = rows
    .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
