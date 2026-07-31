import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function WishlistButton({
  courseId,
  price,
  className,
}: {
  courseId: string;
  price?: number | null;
  className?: string;
}) {
  const { user } = useAuth();
  const [wishlisted, setWishlisted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) {
      setWishlisted(false);
      return;
    }
    let cancelled = false;
    supabase
      .from("wishlists")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setWishlisted(!!data);
      });
    return () => {
      cancelled = true;
    };
  }, [user, courseId]);

  if (!user) {
    return (
      <Link
        to="/auth"
        search={{ mode: "login" }}
        onClick={(e) => e.stopPropagation()}
        className={className ?? "inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/90 border border-border text-ink-muted hover:text-brand"}
        aria-label="Login to add to wishlist"
      >
        ♡
      </Link>
    );
  }

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    if (wishlisted) {
      await supabase.from("wishlists").delete().eq("user_id", user.id).eq("course_id", courseId);
      setWishlisted(false);
    } else {
      await supabase.from("wishlists").insert({ user_id: user.id, course_id: courseId, price_at_add: price ?? null });
      setWishlisted(true);
    }
    setBusy(false);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={
        className ??
        `inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/90 border border-border transition ${
          wishlisted ? "text-brand" : "text-ink-muted hover:text-brand"
        }`
      }
      aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
    >
      {wishlisted ? "♥" : "♡"}
    </button>
  );
}
