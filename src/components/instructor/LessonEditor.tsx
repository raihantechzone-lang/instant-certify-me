import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LessonRow {
  id: string;
  course_id: string;
  section_id: string | null;
  title: string;
  position: number;
  lesson_type: string;
  youtube_url: string | null;
  video_file_url: string | null;
  article_html: string | null;
  pdf_url: string | null;
  live_url: string | null;
  live_expires_at: string | null;
  exam_link: string | null;
  duration_seconds: number | null;
  is_free: boolean | null;
}

interface Resource {
  id: string;
  content_id: string;
  title: string;
  file_url: string;
  kind: string | null;
}

export function LessonEditor({ lesson, onChanged }: { lesson: LessonRow; onChanged: () => void }) {
  const [form, setForm] = useState(lesson);
  const [busy, setBusy] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [newRes, setNewRes] = useState({ title: "", file_url: "", kind: "file" });
  const [showQuiz, setShowQuiz] = useState(false);
  const [showAssignment, setShowAssignment] = useState(false);

  useEffect(() => setForm(lesson), [lesson]);

  const loadResources = async () => {
    const { data } = await supabase.from("lesson_resources").select("*").eq("content_id", lesson.id).order("created_at");
    setResources((data as Resource[]) ?? []);
  };
  useEffect(() => {
    loadResources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id]);

  const save = async () => {
    setBusy(true);
    await supabase
      .from("course_contents")
      .update({
        title: form.title,
        lesson_type: form.lesson_type,
        youtube_url: form.youtube_url || null,
        video_file_url: form.video_file_url || null,
        article_html: form.article_html || null,
        pdf_url: form.pdf_url || null,
        live_url: form.live_url || null,
        live_expires_at: form.live_expires_at || null,
        exam_link: form.exam_link || null,
        duration_seconds: form.duration_seconds || null,
        is_free: form.is_free,
      })
      .eq("id", lesson.id);
    setBusy(false);
    onChanged();
  };

  const uploadVideo = async (file: File) => {
    setUploadError(null);
    setUploadPct(0);
    const path = `${lesson.course_id}/${lesson.id}-${Date.now()}-${file.name}`;
    try {
      const { error } = await supabase.storage.from("course-videos").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });
      if (error) {
        if (/bucket/i.test(error.message)) {
          setUploadError("Storage bucket 'course-videos' is missing. Ask an admin to create a public bucket named course-videos.");
        } else {
          setUploadError(error.message);
        }
        setUploadPct(null);
        return;
      }
      setUploadPct(100);
      const { data } = supabase.storage.from("course-videos").getPublicUrl(path);
      setForm((f) => ({ ...f, video_file_url: data.publicUrl }));
      setTimeout(() => setUploadPct(null), 800);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
      setUploadPct(null);
    }
  };

  const addResource = async () => {
    if (!newRes.title || !newRes.file_url) return;
    await supabase.from("lesson_resources").insert({ content_id: lesson.id, ...newRes });
    setNewRes({ title: "", file_url: "", kind: "file" });
    loadResources();
  };
  const removeResource = async (id: string) => {
    await supabase.from("lesson_resources").delete().eq("id", id);
    loadResources();
  };

  return (
    <div className="rounded-xl border border-border bg-surface-alt p-4 space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Lesson title"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand" />
        <select value={form.lesson_type} onChange={(e) => setForm({ ...form, lesson_type: e.target.value })}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand">
          <option value="video">Video</option>
          <option value="text">Text / Article</option>
          <option value="quiz">Quiz</option>
          <option value="assignment">Assignment</option>
        </select>
      </div>

      {form.lesson_type === "video" && (
        <div className="space-y-2">
          <input value={form.youtube_url ?? ""} onChange={(e) => setForm({ ...form, youtube_url: e.target.value })} placeholder="YouTube URL (optional)"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand" />
          <input value={form.video_file_url ?? ""} onChange={(e) => setForm({ ...form, video_file_url: e.target.value })} placeholder="Uploaded video URL"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand" />
          <div className="flex items-center gap-3">
            <label className="px-3 py-2 rounded-lg bg-ink text-background text-xs font-bold cursor-pointer">
              Upload MP4/MOV
              <input
                type="file"
                accept="video/mp4,video/quicktime"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadVideo(e.target.files[0])}
              />
            </label>
            {uploadPct !== null && <span className="text-xs text-ink-muted">Uploading… {uploadPct}%</span>}
          </div>
          {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
          <p className="text-xs text-ink-muted">
            Real server-side transcoding isn't possible client-side. Add optional 360p/720p/1080p links below as extra resources instead.
          </p>
        </div>
      )}

      {form.lesson_type === "text" && (
        <textarea value={form.article_html ?? ""} onChange={(e) => setForm({ ...form, article_html: e.target.value })} rows={5}
          placeholder="Article HTML / content" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand" />
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <input value={form.pdf_url ?? ""} onChange={(e) => setForm({ ...form, pdf_url: e.target.value })} placeholder="PDF URL"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand" />
        <input value={form.exam_link ?? ""} onChange={(e) => setForm({ ...form, exam_link: e.target.value })} placeholder="Exam link"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand" />
        <input value={form.live_url ?? ""} onChange={(e) => setForm({ ...form, live_url: e.target.value })} placeholder="Live class URL"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand" />
        <input type="datetime-local" value={form.live_expires_at ? form.live_expires_at.slice(0, 16) : ""} onChange={(e) => setForm({ ...form, live_expires_at: e.target.value })}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand" />
        <input type="number" value={form.duration_seconds ?? ""} onChange={(e) => setForm({ ...form, duration_seconds: Number(e.target.value) })} placeholder="Duration (seconds)"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand" />
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={!!form.is_free} onChange={(e) => setForm({ ...form, is_free: e.target.checked })} /> Free preview
        </label>
      </div>

      <div>
        <p className="text-xs font-bold text-ink-muted uppercase mb-2">Resources / quality links</p>
        <ul className="space-y-1 mb-2">
          {resources.map((r) => (
            <li key={r.id} className="flex items-center justify-between text-xs bg-background border border-border rounded-lg px-3 py-2">
              <span>{r.title} {r.kind && r.kind !== "file" && <em className="text-ink-muted">({r.kind})</em>}</span>
              <button onClick={() => removeResource(r.id)} className="text-destructive font-bold">Remove</button>
            </li>
          ))}
        </ul>
        <div className="grid sm:grid-cols-4 gap-2">
          <input value={newRes.title} onChange={(e) => setNewRes({ ...newRes, title: e.target.value })} placeholder="Title"
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-brand" />
          <input value={newRes.file_url} onChange={(e) => setNewRes({ ...newRes, file_url: e.target.value })} placeholder="URL"
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-brand" />
          <select value={newRes.kind} onChange={(e) => setNewRes({ ...newRes, kind: e.target.value })}
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-brand">
            <option value="file">File</option>
            <option value="video-360p">Video 360p</option>
            <option value="video-720p">Video 720p</option>
            <option value="video-1080p">Video 1080p</option>
          </select>
          <button onClick={addResource} className="px-3 py-1.5 rounded-lg bg-brand-soft text-brand text-xs font-bold">Add</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={save} disabled={busy} className="px-4 py-2 rounded-lg bg-brand text-brand-foreground text-xs font-bold disabled:opacity-60">
          {busy ? "Saving…" : "Save lesson"}
        </button>
        {form.lesson_type === "quiz" && (
          <button onClick={() => setShowQuiz((v) => !v)} className="px-4 py-2 rounded-lg bg-ink text-background text-xs font-bold">
            {showQuiz ? "Hide quiz builder" : "Quiz builder"}
          </button>
        )}
        {form.lesson_type === "assignment" && (
          <button onClick={() => setShowAssignment((v) => !v)} className="px-4 py-2 rounded-lg bg-ink text-background text-xs font-bold">
            {showAssignment ? "Hide assignment builder" : "Assignment builder"}
          </button>
        )}
      </div>

      {showQuiz && <QuizBuilder courseId={lesson.course_id} contentId={lesson.id} />}
      {showAssignment && <AssignmentBuilder courseId={lesson.course_id} contentId={lesson.id} />}
    </div>
  );
}

// ------------------------------- Quiz builder -------------------------------

interface Quiz {
  id: string;
  title: string;
  pass_mark: number;
  time_limit_minutes: number | null;
  max_attempts: number;
}
interface Question {
  id: string;
  quiz_id: string;
  type: string;
  prompt: string;
  options: string[];
  correct_answer: string;
  points: number;
  position: number;
}

function QuizBuilder({ courseId, contentId }: { courseId: string; contentId: string }) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qForm, setQForm] = useState({ title: "", pass_mark: "50", time_limit_minutes: "", max_attempts: "3" });
  const [newQ, setNewQ] = useState({ type: "mcq", prompt: "", options: "", correct_answer: "", points: "1" });

  const load = async () => {
    const { data } = await supabase.from("quizzes").select("*").eq("content_id", contentId).maybeSingle();
    setQuiz((data as Quiz) ?? null);
    if (data) {
      setQForm({
        title: data.title,
        pass_mark: String(data.pass_mark),
        time_limit_minutes: data.time_limit_minutes ? String(data.time_limit_minutes) : "",
        max_attempts: String(data.max_attempts),
      });
      const { data: qs } = await supabase.from("quiz_questions").select("*").eq("quiz_id", data.id).order("position");
      setQuestions((qs as Question[]) ?? []);
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId]);

  const saveQuiz = async () => {
    const payload = {
      content_id: contentId,
      course_id: courseId,
      title: qForm.title || "Quiz",
      pass_mark: Number(qForm.pass_mark) || 50,
      time_limit_minutes: qForm.time_limit_minutes ? Number(qForm.time_limit_minutes) : null,
      max_attempts: Number(qForm.max_attempts) || 3,
    };
    if (quiz) {
      await supabase.from("quizzes").update(payload).eq("id", quiz.id);
    } else {
      await supabase.from("quizzes").insert(payload);
    }
    load();
  };

  const addQuestion = async () => {
    if (!quiz || !newQ.prompt || !newQ.correct_answer) return;
    const options = newQ.options.split("|").map((o) => o.trim()).filter(Boolean);
    await supabase.from("quiz_questions").insert({
      quiz_id: quiz.id,
      type: newQ.type,
      prompt: newQ.prompt,
      options,
      correct_answer: newQ.correct_answer,
      points: Number(newQ.points) || 1,
      position: questions.length,
    });
    setNewQ({ type: "mcq", prompt: "", options: "", correct_answer: "", points: "1" });
    load();
  };
  const removeQuestion = async (id: string) => {
    await supabase.from("quiz_questions").delete().eq("id", id);
    load();
  };

  return (
    <div className="rounded-xl border border-dashed border-border p-4 space-y-3 bg-background">
      <p className="text-xs font-bold text-ink-muted uppercase">Quiz settings</p>
      <div className="grid sm:grid-cols-4 gap-2">
        <input value={qForm.title} onChange={(e) => setQForm({ ...qForm, title: e.target.value })} placeholder="Quiz title"
          className="rounded-lg border border-border px-2 py-1.5 text-xs outline-none focus:border-brand sm:col-span-2" />
        <input value={qForm.pass_mark} onChange={(e) => setQForm({ ...qForm, pass_mark: e.target.value })} placeholder="Pass mark %"
          className="rounded-lg border border-border px-2 py-1.5 text-xs outline-none focus:border-brand" />
        <input value={qForm.time_limit_minutes} onChange={(e) => setQForm({ ...qForm, time_limit_minutes: e.target.value })} placeholder="Time limit (min)"
          className="rounded-lg border border-border px-2 py-1.5 text-xs outline-none focus:border-brand" />
        <input value={qForm.max_attempts} onChange={(e) => setQForm({ ...qForm, max_attempts: e.target.value })} placeholder="Max attempts"
          className="rounded-lg border border-border px-2 py-1.5 text-xs outline-none focus:border-brand" />
        <button onClick={saveQuiz} className="px-3 py-1.5 rounded-lg bg-brand text-brand-foreground text-xs font-bold">Save quiz</button>
      </div>

      {quiz && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-ink-muted uppercase mt-3">Questions</p>
          <ul className="space-y-1">
            {questions.map((q) => (
              <li key={q.id} className="flex items-center justify-between text-xs bg-surface-alt border border-border rounded-lg px-3 py-2">
                <span>{q.prompt} <em className="text-ink-muted">({q.type}, {q.points}pt)</em></span>
                <button onClick={() => removeQuestion(q.id)} className="text-destructive font-bold">Remove</button>
              </li>
            ))}
          </ul>
          <div className="grid sm:grid-cols-6 gap-2">
            <select value={newQ.type} onChange={(e) => setNewQ({ ...newQ, type: e.target.value })}
              className="rounded-lg border border-border px-2 py-1.5 text-xs outline-none focus:border-brand">
              <option value="mcq">MCQ</option>
              <option value="truefalse">True/False</option>
              <option value="short">Short answer</option>
              <option value="fill">Fill in blank</option>
            </select>
            <input value={newQ.prompt} onChange={(e) => setNewQ({ ...newQ, prompt: e.target.value })} placeholder="Question"
              className="rounded-lg border border-border px-2 py-1.5 text-xs outline-none focus:border-brand sm:col-span-2" />
            <input value={newQ.options} onChange={(e) => setNewQ({ ...newQ, options: e.target.value })} placeholder="Options (pipe | separated)"
              className="rounded-lg border border-border px-2 py-1.5 text-xs outline-none focus:border-brand" />
            <input value={newQ.correct_answer} onChange={(e) => setNewQ({ ...newQ, correct_answer: e.target.value })} placeholder="Correct answer"
              className="rounded-lg border border-border px-2 py-1.5 text-xs outline-none focus:border-brand" />
            <input value={newQ.points} onChange={(e) => setNewQ({ ...newQ, points: e.target.value })} placeholder="Points"
              className="rounded-lg border border-border px-2 py-1.5 text-xs outline-none focus:border-brand" />
          </div>
          <button onClick={addQuestion} className="px-3 py-1.5 rounded-lg bg-brand-soft text-brand text-xs font-bold">Add question</button>
        </div>
      )}
    </div>
  );
}

// ------------------------------- Assignment builder -------------------------------

interface Assignment {
  id: string;
  title: string;
  instructions: string | null;
  due_at: string | null;
}
interface Submission {
  id: string;
  user_id: string;
  body: string | null;
  file_url: string | null;
  grade: number | null;
  feedback: string | null;
  status: string;
  student_name?: string;
}

function AssignmentBuilder({ courseId, contentId }: { courseId: string; contentId: string }) {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [form, setForm] = useState({ title: "", instructions: "", due_at: "" });
  const [subs, setSubs] = useState<Submission[]>([]);
  const [grades, setGrades] = useState<Record<string, { grade: string; feedback: string }>>({});

  const load = async () => {
    const { data } = await supabase.from("assignments").select("*").eq("content_id", contentId).maybeSingle();
    setAssignment((data as Assignment) ?? null);
    if (data) {
      setForm({ title: data.title, instructions: data.instructions ?? "", due_at: data.due_at ?? "" });
      const { data: submissions } = await supabase.from("assignment_submissions").select("*").eq("assignment_id", data.id);
      const userIds = (submissions ?? []).map((s) => s.user_id);
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
        : { data: [] as { id: string; full_name: string | null }[] };
      const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? "Student"]));
      const rows = (submissions as Submission[] ?? []).map((s) => ({ ...s, student_name: nameMap.get(s.user_id) }));
      setSubs(rows);
      setGrades(Object.fromEntries(rows.map((s) => [s.id, { grade: s.grade != null ? String(s.grade) : "", feedback: s.feedback ?? "" }])));
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId]);

  const saveAssignment = async () => {
    const payload = {
      course_id: courseId,
      content_id: contentId,
      title: form.title || "Assignment",
      instructions: form.instructions || null,
      due_at: form.due_at || null,
    };
    if (assignment) {
      await supabase.from("assignments").update(payload).eq("id", assignment.id);
    } else {
      await supabase.from("assignments").insert(payload);
    }
    load();
  };

  const gradeSubmission = async (id: string) => {
    const g = grades[id];
    if (!g) return;
    await supabase
      .from("assignment_submissions")
      .update({ grade: g.grade ? Number(g.grade) : null, feedback: g.feedback || null, status: "graded" })
      .eq("id", id);
    load();
  };

  return (
    <div className="rounded-xl border border-dashed border-border p-4 space-y-3 bg-background">
      <p className="text-xs font-bold text-ink-muted uppercase">Assignment settings</p>
      <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Assignment title"
        className="w-full rounded-lg border border-border px-2 py-1.5 text-xs outline-none focus:border-brand" />
      <textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} rows={3} placeholder="Instructions"
        className="w-full rounded-lg border border-border px-2 py-1.5 text-xs outline-none focus:border-brand" />
      <input type="datetime-local" value={form.due_at ? form.due_at.slice(0, 16) : ""} onChange={(e) => setForm({ ...form, due_at: e.target.value })}
        className="rounded-lg border border-border px-2 py-1.5 text-xs outline-none focus:border-brand" />
      <button onClick={saveAssignment} className="px-3 py-1.5 rounded-lg bg-brand text-brand-foreground text-xs font-bold">Save assignment</button>

      {assignment && (
        <div className="space-y-2 pt-2">
          <p className="text-xs font-bold text-ink-muted uppercase">Submissions</p>
          {subs.length === 0 && <p className="text-xs text-ink-muted">No submissions yet.</p>}
          {subs.map((s) => (
            <div key={s.id} className="rounded-lg border border-border bg-surface-alt p-3 text-xs space-y-1">
              <p className="font-bold text-ink">{s.student_name} <span className="text-ink-muted font-normal capitalize">({s.status})</span></p>
              {s.body && <p className="text-ink-muted">{s.body}</p>}
              {s.file_url && <a href={s.file_url} target="_blank" rel="noreferrer" className="text-brand font-bold">View file</a>}
              <div className="flex gap-2 pt-1">
                <input placeholder="Grade" value={grades[s.id]?.grade ?? ""} onChange={(e) => setGrades({ ...grades, [s.id]: { ...grades[s.id], grade: e.target.value } })}
                  className="w-20 rounded-lg border border-border px-2 py-1 text-xs outline-none focus:border-brand" />
                <input placeholder="Feedback" value={grades[s.id]?.feedback ?? ""} onChange={(e) => setGrades({ ...grades, [s.id]: { ...grades[s.id], feedback: e.target.value } })}
                  className="flex-1 rounded-lg border border-border px-2 py-1 text-xs outline-none focus:border-brand" />
                <button onClick={() => gradeSubmission(s.id)} className="px-3 py-1 rounded-lg bg-brand-soft text-brand text-xs font-bold">Save grade</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
