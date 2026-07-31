import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

interface Note {
  id: string;
  content_id: string;
  timestamp_seconds: number;
  body: string;
  created_at: string;
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function LessonNotes({
  courseId,
  contentId,
  currentTime = 0,
  onSeek,
}: {
  courseId: string;
  contentId: string;
  currentTime?: number;
  onSeek?: (sec: number) => void;
}) {
  const { user } = useAuth();
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [body, setBody] = useState("");
  const [query, setQuery] = useState("");

  const load = async () => {
    if (!user) return setAllNotes([]);
    const { data } = await supabase
      .from("lesson_notes")
      .select("id, content_id, timestamp_seconds, body, created_at")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .order("timestamp_seconds", { ascending: true });
    setAllNotes((data as Note[]) ?? []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, courseId]);

  const lessonNotes = useMemo(
    () => allNotes.filter((n) => n.content_id === contentId),
    [allNotes, contentId]
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return lessonNotes;
    const q = query.toLowerCase();
    return allNotes.filter((n) => n.body.toLowerCase().includes(q));
  }, [query, allNotes, lessonNotes]);

  const addNote = async () => {
    if (!user || !body.trim()) return;
    await supabase.from("lesson_notes").insert({
      user_id: user.id,
      course_id: courseId,
      content_id: contentId,
      timestamp_seconds: Math.floor(currentTime),
      body: body.trim(),
    });
    setBody("");
    load();
  };

  const removeNote = async (id: string) => {
    await supabase.from("lesson_notes").delete().eq("id", id);
    load();
  };

  const downloadPdf = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <html><head><title>Notes</title>
      <style>body{font-family:sans-serif;padding:24px;} h2{margin-bottom:4px;} .n{margin-bottom:12px;border-bottom:1px solid #ddd;padding-bottom:8px;} .t{color:#888;font-size:12px;}</style>
      </head><body>
      <h2>My notes</h2>
      ${allNotes.map((n) => `<div class="n"><div class="t">${fmt(n.timestamp_seconds)}</div><div>${n.body.replace(/</g, "&lt;")}</div></div>`).join("")}
      </body></html>
    `);
    w.document.close();
    w.focus();
    w.print();
  };

  if (!user) return <p className="text-sm text-ink-muted">Log in to take notes.</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={`Add a note at ${fmt(currentTime)}...`}
          className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm text-ink"
        />
        <button
          onClick={addNote}
          className="px-4 py-2 rounded-xl bg-brand text-brand-foreground text-sm font-bold shrink-0"
        >
          Add note
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search all notes in this course..."
          className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm text-ink"
        />
        <button
          onClick={downloadPdf}
          className="px-3 py-2 rounded-xl border-2 border-border text-xs font-bold shrink-0"
        >
          Download PDF
        </button>
      </div>

      <ul className="space-y-2">
        {filtered.map((n) => (
          <li key={n.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-surface-alt border border-border">
            <div className="min-w-0">
              <button
                onClick={() => onSeek?.(n.timestamp_seconds)}
                className="text-xs font-bold text-brand mb-1"
              >
                {fmt(n.timestamp_seconds)}
              </button>
              <p className="text-sm text-ink break-words">{n.body}</p>
            </div>
            <button onClick={() => removeNote(n.id)} className="text-ink-muted text-xs shrink-0">
              ✕
            </button>
          </li>
        ))}
        {filtered.length === 0 && <p className="text-sm text-ink-muted">No notes yet.</p>}
      </ul>
    </div>
  );
}
