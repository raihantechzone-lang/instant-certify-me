import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

interface Quiz {
  id: string;
  title: string;
  pass_mark: number;
  time_limit_minutes: number | null;
  max_attempts: number;
}

interface QuizQuestion {
  id: string;
  type: string;
  prompt: string;
  options: string[];
  correct_answer: string;
  points: number;
  position: number;
}

function normalize(v: string) {
  return v.trim().toLowerCase();
}

export function QuizRunner({ contentId }: { contentId: string }) {
  const { user } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [attemptCount, setAttemptCount] = useState(0);
  const [result, setResult] = useState<null | {
    score: number;
    total: number;
    passed: boolean;
    breakdown: { question: QuizQuestion; given: string; correct: boolean }[];
  }>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data: q } = await supabase
        .from("quizzes")
        .select("id, title, pass_mark, time_limit_minutes, max_attempts")
        .eq("content_id", contentId)
        .maybeSingle();
      if (cancelled) return;
      setQuiz((q as Quiz) ?? null);
      if (q) {
        const { data: qq } = await supabase
          .from("quiz_questions")
          .select("id, type, prompt, options, correct_answer, points, position")
          .eq("quiz_id", (q as Quiz).id)
          .order("position", { ascending: true });
        setQuestions((qq as QuizQuestion[]) ?? []);
        if (user) {
          const { count } = await supabase
            .from("quiz_attempts")
            .select("id", { count: "exact", head: true })
            .eq("quiz_id", (q as Quiz).id)
            .eq("user_id", user.id);
          setAttemptCount(count ?? 0);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId, user?.id]);

  useEffect(() => {
    if (!started || !quiz?.time_limit_minutes || result) return;
    setTimeLeft(quiz.time_limit_minutes * 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  useEffect(() => {
    if (timeLeft === null || result) return;
    if (timeLeft <= 0) {
      submit();
      return;
    }
    const t = setTimeout(() => setTimeLeft((v) => (v !== null ? v - 1 : v)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, result]);

  const submit = async () => {
    if (!quiz) return;
    let score = 0;
    let total = 0;
    const breakdown = questions.map((q) => {
      total += q.points;
      const given = answers[q.id] ?? "";
      let correct = false;
      if (q.type === "short" || q.type === "fill") {
        correct = normalize(given) === normalize(q.correct_answer);
      } else {
        correct = normalize(given) === normalize(q.correct_answer);
      }
      if (correct) score += q.points;
      return { question: q, given, correct };
    });
    const passed = total > 0 ? (score / total) * 100 >= quiz.pass_mark : false;
    setResult({ score, total, passed, breakdown });
    if (user) {
      await supabase.from("quiz_attempts").insert({
        quiz_id: quiz.id,
        user_id: user.id,
        score,
        total,
        passed,
        answers,
      });
      setAttemptCount((c) => c + 1);
    }
  };

  const retry = () => {
    setAnswers({});
    setResult(null);
    setStarted(true);
    setTimeLeft(quiz?.time_limit_minutes ? quiz.time_limit_minutes * 60 : null);
  };

  const canAttempt = !quiz || attemptCount < quiz.max_attempts;

  if (!quiz) return <p className="text-sm text-ink-muted">No quiz for this lesson.</p>;

  if (!started && !result) {
    return (
      <div className="p-6 rounded-2xl bg-surface-alt border border-border text-center">
        <h3 className="font-bold text-ink mb-2">{quiz.title}</h3>
        <p className="text-sm text-ink-muted mb-4">
          {questions.length} questions · Pass mark {quiz.pass_mark}%
          {quiz.time_limit_minutes ? ` · ${quiz.time_limit_minutes} min` : ""}
        </p>
        <p className="text-xs text-ink-muted mb-4">
          Attempts used: {attemptCount} / {quiz.max_attempts}
        </p>
        {canAttempt ? (
          <button
            onClick={() => setStarted(true)}
            className="px-6 py-2.5 rounded-xl bg-brand text-brand-foreground text-sm font-bold"
          >
            Start quiz
          </button>
        ) : (
          <p className="text-sm text-destructive font-bold">Maximum attempts reached.</p>
        )}
      </div>
    );
  }

  if (result) {
    return (
      <div className="space-y-4">
        <div className="p-5 rounded-2xl bg-surface-alt border border-border text-center">
          <p className="text-2xl font-bold text-ink">
            {result.score} / {result.total}
          </p>
          <p className={`text-sm font-bold ${result.passed ? "text-emerald-600" : "text-destructive"}`}>
            {result.passed ? "Passed 🎉" : "Not passed"}
          </p>
          {attemptCount < quiz.max_attempts && (
            <button
              onClick={retry}
              className="mt-3 px-5 py-2 rounded-xl bg-brand text-brand-foreground text-sm font-bold"
            >
              Retry
            </button>
          )}
        </div>
        <ul className="space-y-2">
          {result.breakdown.map((b, i) => (
            <li
              key={b.question.id}
              className={`p-3 rounded-xl border text-sm ${
                b.correct ? "border-emerald-300 bg-emerald-50" : "border-destructive/30 bg-destructive/5"
              }`}
            >
              <p className="font-semibold text-ink">
                {i + 1}. {b.question.prompt}
              </p>
              <p className="text-ink-muted">Your answer: {b.given || "—"}</p>
              {!b.correct && <p className="text-ink-muted">Correct answer: {b.question.correct_answer}</p>}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {timeLeft !== null && (
        <p className="text-sm font-bold text-destructive">
          Time left: {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
        </p>
      )}
      {questions.map((q, i) => (
        <div key={q.id} className="p-4 rounded-xl bg-surface-alt border border-border">
          <p className="font-semibold text-ink mb-2">
            {i + 1}. {q.prompt}
          </p>
          {q.type === "mcq" && (
            <div className="space-y-1">
              {q.options.map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="radio"
                    name={q.id}
                    checked={answers[q.id] === opt}
                    onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                  />
                  {opt}
                </label>
              ))}
            </div>
          )}
          {q.type === "truefalse" && (
            <div className="flex gap-4">
              {["True", "False"].map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="radio"
                    name={q.id}
                    checked={answers[q.id] === opt}
                    onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                  />
                  {opt}
                </label>
              ))}
            </div>
          )}
          {(q.type === "short" || q.type === "fill") && (
            <input
              value={answers[q.id] ?? ""}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-ink"
              placeholder="Your answer"
            />
          )}
        </div>
      ))}
      <button onClick={submit} className="px-6 py-2.5 rounded-xl bg-brand text-brand-foreground text-sm font-bold">
        Submit
      </button>
    </div>
  );
}
