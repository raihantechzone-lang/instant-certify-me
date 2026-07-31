import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Course } from "@/lib/data";
import { btn, btnGhost, card, input, type Notify } from "./shared";

type CourseRow = Course & { status?: string | null; review_feedback?: string | null; instructor_id?: string | null };

export default function CourseApprovalAdmin({ notify }: { notify: Notify }) {
  const [pending, setPending] = useState<CourseRow[]>([]);
  const [published, setPublished] = useState<CourseRow[]>([]);
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  const load = () => {
    supabase
      .from("courses")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .then(({ data }) => setPending((data as CourseRow[]) ?? []));
    supabase
      .from("courses")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .then(({ data }) => setPublished((data as CourseRow[]) ?? []));
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("course-approval-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "courses" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const approve = async (c: CourseRow) => {
    const { error } = await supabase.from("courses").update({ status: "published", review_feedback: null }).eq("id", c.id);
    notify(error ? error.message : "Course approved and published");
    load();
  };

  const reject = async (c: CourseRow) => {
    const { error } = await supabase
      .from("courses")
      .update({ status: "rejected", review_feedback: feedback[c.id] ?? "" })
      .eq("id", c.id);
    notify(error ? error.message : "Course rejected");
    load();
  };

  const unpublish = async (c: CourseRow) => {
    const { error } = await supabase.from("courses").update({ status: "unpublished" }).eq("id", c.id);
    notify(error ? error.message : "Course unpublished");
    load();
  };

  return (
    <div className="space-y-6">
      <div className={card}>
        <h2 className="font-bold text-ink mb-4">Pending course approvals ({pending.length})</h2>
        <ul className="divide-y divide-border">
          {pending.map((c) => (
            <li key={c.id} className="py-4 space-y-2">
              <div className="flex items-center gap-3">
                {c.thumbnail_url && <img src={c.thumbnail_url} alt="" className="h-14 w-20 object-cover rounded-lg" />}
                <div>
                  <p className="font-bold text-sm text-ink">{c.title}</p>
                  <p className="text-xs text-ink-muted">{c.category}</p>
                  <p className="text-xs text-ink-muted line-clamp-2">{c.details}</p>
                </div>
              </div>
              <input
                className={input}
                placeholder="Feedback if rejecting"
                value={feedback[c.id] ?? ""}
                onChange={(e) => setFeedback({ ...feedback, [c.id]: e.target.value })}
              />
              <div className="flex gap-2">
                <button onClick={() => approve(c)} className={btn}>
                  Approve & publish
                </button>
                <button onClick={() => reject(c)} className={btnGhost}>
                  Reject
                </button>
              </div>
            </li>
          ))}
          {pending.length === 0 && <p className="text-sm text-ink-muted">No courses waiting for approval.</p>}
        </ul>
      </div>

      <div className={card}>
        <h2 className="font-bold text-ink mb-4">Published courses ({published.length})</h2>
        <ul className="divide-y divide-border">
          {published.map((c) => (
            <li key={c.id} className="py-3 flex items-center justify-between gap-4">
              <p className="font-bold text-sm text-ink">{c.title}</p>
              <button onClick={() => unpublish(c)} className="text-sm font-bold text-destructive">
                Unpublish
              </button>
            </li>
          ))}
          {published.length === 0 && <p className="text-sm text-ink-muted">No published courses.</p>}
        </ul>
      </div>
    </div>
  );
}
