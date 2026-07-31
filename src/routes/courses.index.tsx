import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { WishlistButton } from "@/components/site/WishlistButton";
import { useCourses, type Course } from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";

type CourseRow = Course & {
  status?: string | null;
  level?: string | null;
  is_bestseller?: boolean | null;
  rating_avg?: number | null;
  instructor_id?: string | null;
};

interface CoursesSearch {
  q?: string;
  category?: string;
  level?: string;
  price?: "all" | "free" | "paid";
  rating?: "all" | "4" | "3";
  bestseller?: boolean;
  sort?: "newest" | "price_asc" | "price_desc" | "rating";
}

export const Route = createFileRoute("/courses/")({
  validateSearch: (search: Record<string, unknown>): CoursesSearch => ({
    q: typeof search.q === "string" ? search.q : undefined,
    category: typeof search.category === "string" ? search.category : undefined,
    level: typeof search.level === "string" ? search.level : undefined,
    price: search.price === "free" || search.price === "paid" ? search.price : "all",
    rating: search.rating === "4" || search.rating === "3" ? search.rating : "all",
    bestseller: search.bestseller === true || search.bestseller === "true" ? true : undefined,
    sort:
      search.sort === "price_asc" || search.sort === "price_desc" || search.sort === "rating"
        ? search.sort
        : "newest",
  }),
  head: () => ({
    meta: [
      { title: "All Courses — Gators Learning" },
      { name: "description", content: "Browse every admission, IELTS and skill course with live classes, videos, PDFs and exams." },
      { property: "og:title", content: "All Courses — Gators Learning" },
      { property: "og:description", content: "Browse every admission, IELTS and skill course on Gators Learning." },
    ],
  }),
  component: CoursesPage,
});

const selectClass =
  "rounded-xl border border-border bg-surface-alt px-3 py-2.5 text-sm outline-none focus:border-brand text-ink";

function CoursesPage() {
  const { courses, loading } = useCourses();
  const [rows, setRows] = useState<CourseRow[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  useEffect(() => {
    supabase
      .from("courses")
      .select("*")
      .then(({ data }) => setRows((data as CourseRow[]) ?? []));
    supabase
      .from("categories")
      .select("id, name, display_order")
      .order("display_order", { ascending: true })
      .then(({ data }) => setCategories((data as { id: string; name: string }[]) ?? []));
  }, [courses]);

  const set = (patch: Partial<CoursesSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }) });

  const filtered = useMemo(() => {
    const q = (search.q ?? "").trim().toLowerCase();
    let list = rows.filter((c) => !c.status || c.status === "published");

    if (q) {
      list = list.filter(
        (c) =>
          c.title?.toLowerCase().includes(q) ||
          c.details?.toLowerCase().includes(q) ||
          c.category?.toLowerCase().includes(q),
      );
    }
    if (search.category) list = list.filter((c) => c.category === search.category);
    if (search.level && search.level !== "all") list = list.filter((c) => (c.level ?? "all") === search.level);
    if (search.price === "free") list = list.filter((c) => !(c.discount_price ?? c.price));
    if (search.price === "paid") list = list.filter((c) => (c.discount_price ?? c.price ?? 0) > 0);
    if (search.rating === "4") list = list.filter((c) => (c.rating_avg ?? 0) >= 4);
    if (search.rating === "3") list = list.filter((c) => (c.rating_avg ?? 0) >= 3);
    if (search.bestseller) list = list.filter((c) => c.is_bestseller);

    const sort = search.sort ?? "newest";
    list = [...list].sort((a, b) => {
      if (sort === "price_asc") return (a.discount_price ?? a.price ?? 0) - (b.discount_price ?? b.price ?? 0);
      if (sort === "price_desc") return (b.discount_price ?? b.price ?? 0) - (a.discount_price ?? a.price ?? 0);
      if (sort === "rating") return (b.rating_avg ?? 0) - (a.rating_avg ?? 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return list;
  }, [rows, search]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="pt-32 sm:pt-40 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <h1 className="text-4xl font-bold text-ink">Our Courses</h1>
        <p className="text-ink-muted mt-2 mb-8 font-bengali">আপনার পছন্দের কোর্সটি বেছে নিন</p>

        <div className="rounded-2xl border border-border bg-surface-alt p-4 sm:p-5 mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <input
            value={search.q ?? ""}
            onChange={(e) => set({ q: e.target.value || undefined })}
            placeholder="Search title, details, instructor…"
            className="lg:col-span-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand text-ink"
          />
          <select className={selectClass} value={search.category ?? ""} onChange={(e) => set({ category: e.target.value || undefined })}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
          <select className={selectClass} value={search.level ?? "all"} onChange={(e) => set({ level: e.target.value })}>
            <option value="all">All levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          <select className={selectClass} value={search.price ?? "all"} onChange={(e) => set({ price: e.target.value as CoursesSearch["price"] })}>
            <option value="all">Any price</option>
            <option value="free">Free</option>
            <option value="paid">Paid</option>
          </select>
          <select className={selectClass} value={search.rating ?? "all"} onChange={(e) => set({ rating: e.target.value as CoursesSearch["rating"] })}>
            <option value="all">Any rating</option>
            <option value="4">4★ & up</option>
            <option value="3">3★ & up</option>
          </select>
          <select className={selectClass} value={search.sort ?? "newest"} onChange={(e) => set({ sort: e.target.value as CoursesSearch["sort"] })}>
            <option value="newest">Newest</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="rating">Top rated</option>
          </select>
          <label className="flex items-center gap-2 text-sm font-semibold text-ink">
            <input
              type="checkbox"
              checked={!!search.bestseller}
              onChange={(e) => set({ bestseller: e.target.checked || undefined })}
            />
            Bestseller only
          </label>
        </div>

        {loading ? (
          <p className="text-ink-muted">Loading courses…</p>
        ) : filtered.length === 0 ? (
          <p className="text-ink-muted">No courses match your filters.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <div key={c.id} className="group relative rounded-2xl overflow-hidden border border-border bg-background shadow-sm hover:shadow-xl transition">
                <div className="absolute top-3 right-3 z-10">
                  <WishlistButton courseId={c.id} price={c.discount_price ?? c.price} />
                </div>
                <Link to="/courses/$courseId" params={{ courseId: c.id }}>
                  <img src={c.thumbnail_url ?? ""} alt={c.title} loading="lazy" className="h-44 w-full object-cover" />
                  <div className="p-5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-brand">{c.category}</span>
                      {c.is_bestseller && (
                        <span className="text-[10px] font-bold uppercase tracking-wide bg-brand-soft text-brand px-2 py-0.5 rounded-full">Bestseller</span>
                      )}
                    </div>
                    <h2 className="font-bold mt-1 text-ink">{c.title}</h2>
                    <p className="text-sm text-ink-muted mt-2 line-clamp-2">{c.details}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-lg font-bold">৳{c.discount_price ?? c.price ?? 0}</span>
                      {c.discount_price && c.price && (
                        <span className="text-sm line-through text-ink-muted">৳{c.price}</span>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
