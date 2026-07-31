import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

interface Answer {
  id: string;
  question_id: string;
  user_id: string;
  body: string;
  author_name: string | null;
  author_photo: string | null;
  is_instructor: boolean;
  upvotes: number;
  created_at: string;
}

interface Question {
  id: string;
  content_id: string | null;
  title: string | null;
  body: string;
  author_name: string | null;
  author_photo: string | null;
  user_id: string;
  created_at: string;
}

export function LessonQA({
  courseId,
  contentId,
  instructorId,
}: {
  courseId: string;
  contentId: string;
  instructorId?: string | null;
}) {
  const { user, profile } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, Answer[]>>({});
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [newQ, setNewQ] = useState("");
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");

  const load = async () => {
    const { data: qs } = await supabase
      .from("lesson_questions")
      .select("id, content_id, title, body, author_name, author_photo, user_id, created_at")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false });
    const list = (qs as Question[]) ?? [];
    setQuestions(list);
    if (list.length) {
      const { data: ans } = await supabase
        .from("lesson_answers")
        .select("id, question_id, user_id, body, author_name, author_photo, is_instructor, upvotes, created_at")
        .in("question_id", list.map((q) => q.id))
        .order("created_at", { ascending: true });
      const grouped: Record<string, Answer[]> = {};
      for (const a of (ans as Answer[]) ?? []) {
        (grouped[a.question_id] ||= []).push(a);
      }
      setAnswers(grouped);
      if (user) {
        const { data: votes } = await supabase
          .from("answer_votes")
          .select("answer_id")
          .eq("user_id", user.id);
        setMyVotes(new Set((votes ?? []).map((v: any) => v.answer_id)));
      }
    } else {
      setAnswers({});
    }
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`qa-${courseId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "lesson_questions" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "lesson_answers" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "answer_votes" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, user?.id]);

  const filtered = useMemo(() => {
    const lesson = questions.filter((q) => q.content_id === contentId);
    if (!query.trim()) return lesson;
    const q = query.toLowerCase();
    return questions.filter(
      (item) =>
        item.body.toLowerCase().includes(q) ||
        (answers[item.id] ?? []).some((a) => a.body.toLowerCase().includes(q))
    );
  }, [questions, contentId, query, answers]);

  const askQuestion = async () => {
    if (!user || !newQ.trim()) return;
    await supabase.from("lesson_questions").insert({
      user_id: user.id,
      course_id: courseId,
      content_id: contentId,
      body: newQ.trim(),
      author_name: profile?.full_name ?? user.email,
      author_photo: profile?.photo_url ?? null,
    });
    setNewQ("");
    load();
  };

  const reply = async (questionId: string) => {
    const text = replyText[questionId];
    if (!user || !text?.trim()) return;
    await supabase.from("lesson_answers").insert({
      question_id: questionId,
      user_id: user.id,
      body: text.trim(),
      author_name: profile?.full_name ?? user.email,
      author_photo: profile?.photo_url ?? null,
      is_instructor: !!instructorId && instructorId === user.id,
    });
    setReplyText((prev) => ({ ...prev, [questionId]: "" }));
    load();
  };

  const toggleVote = async (answerId: string) => {
    if (!user) return;
    if (myVotes.has(answerId)) {
      await supabase.from("answer_votes").delete().eq("answer_id", answerId).eq("user_id", user.id);
    } else {
      await supabase.from("answer_votes").insert({ answer_id: answerId, user_id: user.id });
    }
    load();
  };

  return (
    <div className="space-y-4">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search Q&A..."
        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-ink"
      />

      {user ? (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={newQ}
            onChange={(e) => setNewQ(e.target.value)}
            placeholder="Ask a question about this lesson..."
            className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm text-ink"
          />
          <button onClick={askQuestion} className="px-4 py-2 rounded-xl bg-brand text-brand-foreground text-sm font-bold shrink-0">
            Ask
          </button>
        </div>
      ) : (
        <p className="text-sm text-ink-muted">Log in to ask a question.</p>
      )}

      <ul className="space-y-4">
        {filtered.map((q) => (
          <li key={q.id} className="p-4 rounded-xl bg-surface-alt border border-border">
            <div className="flex items-center gap-2 mb-1">
              {q.author_photo && <img src={q.author_photo} className="h-6 w-6 rounded-full object-cover" alt="" />}
              <span className="text-xs font-bold text-ink">{q.author_name ?? "Student"}</span>
            </div>
            <p className="text-sm text-ink mb-3">{q.body}</p>
            <ul className="space-y-2 pl-3 border-l-2 border-border">
              {(answers[q.id] ?? []).map((a) => (
                <li key={a.id} className="text-sm">
                  <div className="flex items-center gap-2">
                    {a.author_photo && <img src={a.author_photo} className="h-5 w-5 rounded-full object-cover" alt="" />}
                    <span className="text-xs font-bold text-ink">{a.author_name ?? "Student"}</span>
                    {a.is_instructor && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand-soft text-brand">
                        Instructor
                      </span>
                    )}
                  </div>
                  <p className="text-ink-muted">{a.body}</p>
                  <button
                    onClick={() => toggleVote(a.id)}
                    className={`text-xs font-semibold mt-1 ${myVotes.has(a.id) ? "text-brand" : "text-ink-muted"}`}
                  >
                    👍 {a.upvotes}
                  </button>
                </li>
              ))}
            </ul>
            {user && (
              <div className="flex gap-2 mt-3">
                <input
                  value={replyText[q.id] ?? ""}
                  onChange={(e) => setReplyText((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="Write a reply..."
                  className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-xs text-ink"
                />
                <button
                  onClick={() => reply(q.id)}
                  className="px-3 py-1.5 rounded-lg border-2 border-border text-xs font-bold shrink-0"
                >
                  Reply
                </button>
              </div>
            )}
          </li>
        ))}
        {filtered.length === 0 && <p className="text-sm text-ink-muted">No questions yet.</p>}
      </ul>
    </div>
  );
}
