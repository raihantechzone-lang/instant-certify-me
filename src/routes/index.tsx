import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { InterstitialAd } from "@/components/site/InterstitialAd";
import { ReviewsSection } from "@/components/site/Reviews";
import { useCourses, useSiteSettings } from "@/lib/data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "raihan" },
      {
        name: "description",
        content:
          "Live classes, recorded video lessons, PDF notes, exams and certificates for university admission and IELTS preparation.",
      },
      { property: "og:title", content: "raihan" },
      {
        property: "og:description",
        content: "Live classes, recorded video lessons, PDF notes, exams and certificates for university admission and IELTS preparation.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { courses } = useCourses();
  const settings = useSiteSettings();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <InterstitialAd placement="home" />

      <main className="pt-32 sm:pt-40">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <div className="reveal-up">
            <span className="inline-block px-4 py-1.5 rounded-full bg-brand-soft text-brand text-xs font-bold mb-6">
              Admission • IELTS • Skill Development
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-ink">{settings.hero_title}</h1>
            <p className="mt-5 text-lg text-ink-muted font-bengali leading-relaxed">{settings.hero_subtitle}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/courses"
                className="px-7 py-3.5 rounded-xl bg-brand text-brand-foreground font-bold shadow-lg hover:opacity-90 transition"
              >
                Explore Courses
              </Link>
              <Link
                to="/dashboard"
                className="px-7 py-3.5 rounded-xl border-2 border-ink font-bold hover:bg-ink hover:text-background transition"
              >
                My Dashboard
              </Link>
            </div>
          </div>
          <div className="relative animate-float">
            <img
              src="https://ik.imagekit.io/n7rgjyaxh/Untitled%20design_20260630_142739_0000.png"
              alt="Gators Learning"
              className="w-full max-w-md mx-auto drop-shadow-2xl"
            />
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-ink">Popular Courses</h2>
              <p className="text-ink-muted mt-2 font-bengali">আমাদের জনপ্রিয় কোর্সসমূহ</p>
            </div>
            <Link to="/courses" className="text-sm font-bold text-brand hover:underline whitespace-nowrap">
              View all →
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.slice(0, 6).map((c) => (
              <Link
                key={c.id}
                to="/courses/$courseId"
                params={{ courseId: c.id }}
                className="group rounded-2xl overflow-hidden border border-border bg-background shadow-sm hover:shadow-xl transition"
              >
                <img
                  src={c.thumbnail_url ?? ""}
                  alt={c.title}
                  loading="lazy"
                  className="h-44 w-full object-cover group-hover:scale-105 transition duration-500"
                />
                <div className="p-5">
                  <span className="text-xs font-bold text-brand">{c.category}</span>
                  <h3 className="font-bold mt-1 text-ink line-clamp-2">{c.title}</h3>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-lg font-bold text-ink">৳{c.discount_price ?? c.price}</span>
                    {c.discount_price && c.price && (
                      <span className="text-sm line-through text-ink-muted">৳{c.price}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <ReviewsSection />
      </main>

      <SiteFooter />
    </div>
  );
}
