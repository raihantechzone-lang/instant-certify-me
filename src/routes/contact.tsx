import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us — Gators Learning" },
      { name: "description", content: "Get in touch with the Gators Learning team about courses, admission or IELTS support." },
      { property: "og:title", content: "Contact Us — Gators Learning" },
      { property: "og:description", content: "Questions about courses or admission? Talk to our team." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="min-h-screen bg-surface-alt">
      <SiteHeader />
      <main className="pt-32 sm:pt-40 pb-16 max-w-3xl mx-auto px-4 sm:px-6">
        <h1 className="text-4xl font-bold text-ink">Contact Us</h1>
        <p className="text-ink-muted mt-2 mb-10 font-bengali">যেকোনো প্রয়োজনে আমাদের সাথে যোগাযোগ করুন</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <a href="mailto:support@gatorslearning.com" className="rounded-2xl bg-background border border-border p-6 shadow-sm hover:shadow-md transition">
            <p className="text-xs font-bold text-brand mb-1">Email</p>
            <p className="font-bold text-ink">support@gatorslearning.com</p>
          </a>
          <a href="tel:+8801000000000" className="rounded-2xl bg-background border border-border p-6 shadow-sm hover:shadow-md transition">
            <p className="text-xs font-bold text-brand mb-1">Phone</p>
            <p className="font-bold text-ink">+880 1000-000000</p>
          </a>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
