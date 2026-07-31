import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import type { Course } from "@/lib/data";

interface WishlistRow {
  id: string;
  course_id: string;
  price_at_add: number | null;
  courses: Course | null;
}

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: "My Wishlist — Gators Learning" },
      { name: "description", content: "Courses you've saved for later on Gators Learning." },
      { property: "og:title", content: "My Wishlist — Gators Learning" },
      { property: "og:description", content: "View and manage your saved courses." },
    ],
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<WishlistRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!user) return;
    setLoading(true);
    supabase
      .from("wishlists")
      .select("id, course_id, price_at_add, courses(*)")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setRows((data as unknown as WishlistRow[]) ?? []);
        setLoading(false);
      });
  };

  useEffect(load, [user]);

  const moveToCart = async (row: WishlistRow) => {
    if (!user) return;
    await supabase.from("cart_items").insert({ user_id: user.id, course_id: row.course_id }).select();
    await supabase.from("wishlists").delete().eq("id", row.id);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("wishlists").delete().eq("id", id);
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="pt-32 sm:pt-40 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <h1 className="text-3xl font-bold text-ink mb-8">My Wishlist</h1>
        {!user ? (
          <p className="text-ink-muted">
            <Link to="/auth" search={{ mode: "login" }} className="text-brand font-semibold">Log in</Link> to see your wishlist.
          </p>
        ) : loading ? (
          <p className="text-ink-muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-ink-muted">Your wishlist is empty.</p>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => {
              const course = row.courses;
              if (!course) return null;
              const currentPrice = course.discount_price ?? course.price ?? 0;
              const priceDropped = row.price_at_add != null && currentPrice < row.price_at_add;
              return (
                <div key={row.id} className="flex items-center gap-4 rounded-2xl border border-border bg-surface-alt p-4">
                  <img src={course.thumbnail_url ?? ""} alt={course.title} className="h-20 w-28 rounded-xl object-cover" />
                  <div className="flex-1 min-w-0">
                    <Link to="/courses/$courseId" params={{ courseId: course.id }} className="font-bold text-ink hover:text-brand line-clamp-1">
                      {course.title}
                    </Link>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-bold">৳{currentPrice}</span>
                      {priceDropped && (
                        <span className="text-xs font-bold text-brand bg-brand-soft px-2 py-0.5 rounded-full">
                          Price dropped from ৳{row.price_at_add}!
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => moveToCart(row)} className="px-4 py-2 rounded-xl bg-brand text-brand-foreground text-sm font-bold">
                    Move to cart
                  </button>
                  <button onClick={() => remove(row.id)} className="px-4 py-2 rounded-xl border border-border text-sm font-semibold text-ink-muted">
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
