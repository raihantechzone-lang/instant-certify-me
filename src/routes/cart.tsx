import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import type { Course } from "@/lib/data";

interface CartRow {
  id: string;
  course_id: string;
  courses: Course | null;
}

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "My Cart — Gators Learning" },
      { name: "description", content: "Review the courses in your cart before checkout." },
      { property: "og:title", content: "My Cart — Gators Learning" },
      { property: "og:description", content: "Review and checkout your selected courses." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<CartRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!user) return;
    setLoading(true);
    supabase
      .from("cart_items")
      .select("id, course_id, courses(*)")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setRows((data as unknown as CartRow[]) ?? []);
        setLoading(false);
      });
  };

  useEffect(load, [user]);

  const remove = async (id: string) => {
    await supabase.from("cart_items").delete().eq("id", id);
    load();
  };

  const total = rows.reduce((sum, r) => sum + (r.courses?.discount_price ?? r.courses?.price ?? 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="pt-32 sm:pt-40 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <h1 className="text-3xl font-bold text-ink mb-8">My Cart</h1>
        {!user ? (
          <p className="text-ink-muted">
            <Link to="/auth" search={{ mode: "login" }} className="text-brand font-semibold">Log in</Link> to see your cart.
          </p>
        ) : loading ? (
          <p className="text-ink-muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-ink-muted">Your cart is empty.</p>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => {
              const course = row.courses;
              if (!course) return null;
              return (
                <div key={row.id} className="flex items-center gap-4 rounded-2xl border border-border bg-surface-alt p-4">
                  <img src={course.thumbnail_url ?? ""} alt={course.title} className="h-20 w-28 rounded-xl object-cover" />
                  <div className="flex-1 min-w-0">
                    <Link to="/courses/$courseId" params={{ courseId: course.id }} className="font-bold text-ink hover:text-brand line-clamp-1">
                      {course.title}
                    </Link>
                    <span className="font-bold block mt-1">৳{course.discount_price ?? course.price ?? 0}</span>
                  </div>
                  <Link to="/enroll/$courseId" params={{ courseId: course.id }} className="px-4 py-2 rounded-xl bg-brand text-brand-foreground text-sm font-bold">
                    Checkout
                  </Link>
                  <button onClick={() => remove(row.id)} className="px-4 py-2 rounded-xl border border-border text-sm font-semibold text-ink-muted">
                    Remove
                  </button>
                </div>
              );
            })}
            <div className="flex justify-end pt-4 border-t border-border">
              <p className="text-lg font-bold text-ink">Total: ৳{total}</p>
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
