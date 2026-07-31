import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { btn, btnSmGhost, card, input, type Notify } from "./shared";

interface CategoryRow {
  id: string;
  name: string;
  parent_id: string | null;
  display_order: number;
  icon: string | null;
}

export default function CategoriesAdmin({ notify }: { notify: Notify }) {
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [form, setForm] = useState({ name: "", parent_id: "", icon: "" });

  const load = () =>
    supabase
      .from("categories")
      .select("*")
      .order("display_order", { ascending: true })
      .then(({ data }) => setRows((data as CategoryRow[]) ?? []));

  useEffect(() => {
    load();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("categories").insert({
      name: form.name,
      parent_id: form.parent_id || null,
      icon: form.icon || null,
      display_order: rows.length,
    });
    if (error) return notify(error.message);
    notify("Category saved");
    setForm({ name: "", parent_id: "", icon: "" });
    load();
  };

  const move = async (row: CategoryRow, dir: -1 | 1) => {
    const idx = rows.findIndex((r) => r.id === row.id);
    const swapWith = rows[idx + dir];
    if (!swapWith) return;
    await supabase.from("categories").update({ display_order: swapWith.display_order }).eq("id", row.id);
    await supabase.from("categories").update({ display_order: row.display_order }).eq("id", swapWith.id);
    load();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={save} className={`${card} space-y-3`}>
        <h2 className="font-bold text-ink">Add category / subcategory</h2>
        <input required className={input} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <select className={input} value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })}>
          <option value="">— Top-level category —</option>
          {rows.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <input className={input} placeholder="Icon (emoji or class name)" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
        <button className={btn}>Save category</button>
      </form>

      <div className={card}>
        <h2 className="font-bold text-ink mb-4">Categories ({rows.length})</h2>
        <ul className="divide-y divide-border">
          {rows.map((r, idx) => (
            <li key={r.id} className="py-3 flex items-center justify-between gap-4">
              <div className="text-sm">
                <p className="font-bold text-ink">
                  {r.icon ? `${r.icon} ` : ""}
                  {r.parent_id ? "— " : ""}
                  {r.name}
                </p>
                <p className="text-xs text-ink-muted">
                  {r.parent_id ? `Sub of ${rows.find((p) => p.id === r.parent_id)?.name ?? "—"}` : "Top-level"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button disabled={idx === 0} onClick={() => move(r, -1)} className="text-xs font-bold text-brand disabled:opacity-30">
                  ↑
                </button>
                <button disabled={idx === rows.length - 1} onClick={() => move(r, 1)} className="text-xs font-bold text-brand disabled:opacity-30">
                  ↓
                </button>
                <button
                  onClick={async () => {
                    const { error } = await supabase.from("categories").delete().eq("id", r.id);
                    notify(error ? error.message : "Category deleted");
                    load();
                  }}
                  className={btnSmGhost}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
          {rows.length === 0 && <p className="text-sm text-ink-muted">No categories yet.</p>}
        </ul>
      </div>
    </div>
  );
}
