import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { useCourses } from "@/lib/data";

export const Route = createFileRoute("/courses/")({
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

function CoursesPage() {
  const { courses, loading } = useCourses();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="pt-32 sm:pt-40 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-ink">Our Courses</h1>
        <p className="text-ink-muted mt-2 mb-10 font-bengali">আপনার পছন্দের কোর্সটি বেছে নিন</p>

        {loading ? (
          <p className="text-ink-muted">Loading courses…</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <Link
                key={c.id}
                to="/courses/$courseId"
                params={{ courseId: c.id }}
                className="group rounded-2xl overflow-hidden border border-border bg-background shadow-sm hover:shadow-xl transition"
              >
                <img src={c.thumbnail_url ?? ""} alt={c.title} loading="lazy" className="h-44 w-full object-cover" />
                <div className="p-5">
                  <span className="text-xs font-bold text-brand">{c.category}</span>
                  <h2 className="font-bold mt-1 text-ink">{c.title}</h2>
                  <p className="text-sm text-ink-muted mt-2 line-clamp-2">{c.details}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-lg font-bold">৳{c.discount_price ?? c.price}</span>
                    {c.discount_price && c.price && (
                      <span className="text-sm line-through text-ink-muted">৳{c.price}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
