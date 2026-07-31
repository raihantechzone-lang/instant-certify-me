import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Course } from "@/lib/data";
import { btn, btnSmGhost, card, input, type Notify } from "./shared";

interface CouponRow {
  id: string;
  code: string;
  course_id: string | null;
  discount_type: "percent" | "flat";
  discount_value: number;
  expires_at: string | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
}

export default function CouponsAdmin({ notify }: { notify: Notify }) {
  const [rows, setRows] = useState<CouponRow[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [form, setForm] = useState({
    code: "",
    course_id: "",
    discount_type: "percent",
    discount_value: "",
    expires_at: "",
    usage_limit: "",
  });

  const load = () =>
    supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows((data as CouponRow[]) ?? []));

  useEffect(() => {
    load();
    supabase.from("courses").select("*").then(({ data }) => setCourses((data as Course[]) ?? []));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("coupons").insert({
      code: form.code.toUpperCase(),
      course_id: form.course_id || null,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value || 0),
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
    });
    if (error) return notify(error.message);
    notify("Coupon created");
    setForm({ code: "", course_id: "", discount_type: "percent", discount_value: "", expires_at: "", usage_limit: "" });
    load();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={save} className={`${card} space-y-3`}>
        <h2 className="font-bold text-ink">Create coupon</h2>
        <input required className={input} placeholder="Code (e.g. GATOR20)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <select className={input} value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })}>
          <option value="">Platform-wide (all courses)</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <div className="grid sm:grid-cols-2 gap-3">
          <select className={input} value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })}>
            <option value="percent">Percent off</option>
            <option value="flat">Flat amount off</option>
          </select>
          <input className={input} placeholder="Discount value" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <input type="date" className={input} value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
          <input className={input} placeholder="Usage limit (optional)" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} />
        </div>
        <button className={btn}>Save coupon</button>
      </form>

      <div className={card}>
        <h2 className="font-bold text-ink mb-4">Coupons ({rows.length})</h2>
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.id} className="py-3 flex flex-wrap items-center justify-between gap-4">
              <div className="text-sm">
                <p className="font-bold text-ink">{r.code}</p>
                <p className="text-ink-muted">
                  {r.discount_type === "percent" ? `${r.discount_value}% off` : `৳${r.discount_value} off`} ·{" "}
                  {r.course_id ? courses.find((c) => c.id === r.course_id)?.title ?? "Course" : "Platform-wide"} · used {r.used_count}
                  {r.usage_limit ? `/${r.usage_limit}` : ""} · {r.expires_at ? `expires ${new Date(r.expires_at).toLocaleDateString()}` : "no expiry"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    await supabase.from("coupons").update({ is_active: !r.is_active }).eq("id", r.id);
                    notify(r.is_active ? "Coupon disabled" : "Coupon enabled");
                    load();
                  }}
                  className="text-sm font-bold text-brand"
                >
                  {r.is_active ? "Disable" : "Enable"}
                </button>
                <button
                  onClick={async () => {
                    await supabase.from("coupons").delete().eq("id", r.id);
                    notify("Coupon deleted");
                    load();
                  }}
                  className={btnSmGhost}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
          {rows.length === 0 && <p className="text-sm text-ink-muted">No coupons yet.</p>}
        </ul>
      </div>
    </div>
  );
}
