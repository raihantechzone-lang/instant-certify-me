import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Resource {
  id: string;
  title: string;
  file_url: string;
  kind: string | null;
}

export function LessonResources({ contentId, pdfUrl }: { contentId: string; pdfUrl?: string | null }) {
  const [resources, setResources] = useState<Resource[]>([]);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("lesson_resources")
      .select("id, title, file_url, kind")
      .eq("content_id", contentId)
      .then(({ data }) => {
        if (!cancelled) setResources((data as Resource[]) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [contentId]);

  if (resources.length === 0 && !pdfUrl) {
    return <p className="text-sm text-ink-muted">No resources for this lesson.</p>;
  }

  return (
    <ul className="space-y-2">
      {pdfUrl && (
        <li>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-surface-alt border border-border text-sm font-semibold text-ink"
          >
            📄 PDF notes
          </a>
        </li>
      )}
      {resources.map((r) => (
        <li key={r.id}>
          <a
            href={r.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-surface-alt border border-border text-sm font-semibold text-ink"
          >
            📎 {r.title}
          </a>
        </li>
      ))}
    </ul>
  );
}
