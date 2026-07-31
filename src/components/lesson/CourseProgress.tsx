import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

interface ContentLite {
  id: string;
  section_id?: string | null;
}
interface SectionLite {
  id: string;
  title: string;
}

export function CourseProgress({
  courseId,
  contents,
  sections,
}: {
  courseId: string;
  contents: ContentLite[];
  sections: SectionLite[];
}) {
  const { user } = useAuth();
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("lesson_progress")
        .select("content_id, completed")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .eq("completed", true);
      if (cancelled) return;
      setCompletedIds(new Set((data ?? []).map((r: any) => r.content_id)));
    };
    load();
    const channel = supabase
      .channel(`progress-${courseId}-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "lesson_progress" }, () => load())
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, courseId]);

  const overallPct = useMemo(() => {
    if (contents.length === 0) return 0;
    return Math.round((completedIds.size / contents.length) * 100);
  }, [contents.length, completedIds]);

  const bySection = useMemo(() => {
    return sections.map((s) => {
      const items = contents.filter((c) => c.section_id === s.id);
      const done = items.filter((c) => completedIds.has(c.id)).length;
      return { section: s, total: items.length, done };
    });
  }, [sections, contents, completedIds]);

  if (!user) return null;

  return (
    <div className="mb-4 p-4 rounded-2xl bg-background border border-border shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-bold text-ink">Course progress</span>
        <span className="text-sm font-bold text-brand">{overallPct}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-muted mb-2">
        <div className="h-full rounded-full bg-brand" style={{ width: `${overallPct}%` }} />
      </div>
      {bySection.length > 0 && (
        <ul className="space-y-1.5 mt-2">
          {bySection.map(({ section, total, done }) => (
            <li key={section.id} className="flex items-center justify-between text-xs text-ink-muted">
              <span className="truncate">{section.title}</span>
              <span>
                {done}/{total}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
