import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface Review {
  id: string;
  rating: number;
  comment: string;
  student_name: string | null;
  student_photo: string | null;
  created_at: string;
}

export function useApprovedReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      supabase
        .from("reviews")
        .select("id, rating, comment, created_at, profiles(full_name, photo_url)")
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          if (!cancelled) {
            const formatted = (data || []).map((r: any) => ({
              id: r.id,
              rating: r.rating,
              comment: r.comment,
              student_name: r.profiles?.full_name,
              student_photo: r.profiles?.photo_url,
              created_at: r.created_at
            }));
            setReviews(formatted as Review[]);
          }
        });
    load();
    const channel = supabase
      .channel("reviews-public")
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () => load())
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return reviews;
}

function Stars({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5 text-brand" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= value ? "opacity-100" : "opacity-25"}>
          ★
        </span>
      ))}
    </div>
  );
}

export function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="rounded-2xl border border-border bg-background p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        {review.student_photo ? (
          <img src={review.student_photo} alt="" className="h-11 w-11 rounded-full object-cover" />
        ) : (
          <div className="h-11 w-11 rounded-full bg-brand-soft text-brand font-bold flex items-center justify-center">
            {(review.student_name ?? "S").charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-bold text-sm">{review.student_name ?? "Student"}</p>
          <Stars value={review.rating} />
        </div>
      </div>
      <p className="text-sm leading-relaxed text-ink-muted font-bengali">{review.comment}</p>
    </article>
  );
}

export function ReviewForm() {
  const { user, profile } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");

  if (!user) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center">
        <p className="text-sm text-ink-muted mb-4 font-bengali">রিভিউ দিতে হলে আগে লগ ইন করতে হবে।</p>
        <Link
          to="/auth"
          search={{ mode: "login" }}
          className="inline-flex px-6 py-3 rounded-xl bg-brand text-brand-foreground font-bold text-sm"
        >
          Log in to write a review
        </Link>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("saving");
    const { error } = await supabase.from("reviews").insert({
      profile_id: user.id,
      rating,
      comment,
      rating,
      comment,
      is_approved: false,
    });
    setState(error ? "error" : "done");
    if (!error) setComment("");
  };

  if (state === "done") {
    return (
      <div className="rounded-2xl border border-brand/30 bg-brand-soft p-8 text-center">
        <p className="font-bold text-brand">Thanks! Your review is waiting for admin approval.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-background p-6 space-y-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">Your rating</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={`${n} star`}
            className={`text-2xl ${n <= rating ? "text-brand" : "text-border"}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        required
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={4}
        placeholder="আপনার অভিজ্ঞতা লিখুন..."
        className="w-full rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm outline-none focus:border-brand"
      />
      {state === "error" && <p className="text-sm text-destructive">Could not save your review. Please try again.</p>}
      <button
        type="submit"
        disabled={state === "saving"}
        className="px-6 py-3 rounded-xl bg-brand text-brand-foreground font-bold text-sm disabled:opacity-60"
      >
        {state === "saving" ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}

export function ReviewsSection() {
  const reviews = useApprovedReviews();

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold text-ink">Student Reviews</h2>
        <p className="text-ink-muted mt-3 font-bengali">আমাদের শিক্ষার্থীরা যা বলছে</p>
      </div>
      {reviews.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
      ) : (
        <p className="text-center text-ink-muted mb-12">No approved reviews yet.</p>
      )}
      <div className="max-w-2xl mx-auto">
        <ReviewForm />
      </div>
    </section>
  );
}
