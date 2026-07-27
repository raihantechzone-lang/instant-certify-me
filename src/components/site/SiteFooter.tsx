import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="bg-ink text-background/80 pt-20 pb-10 border-t-[6px] border-brand mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid gap-10 md:grid-cols-3">
        <div>
          <h3 className="text-background text-xl font-bold mb-3">Gators Learning</h3>
          <p className="text-sm leading-relaxed font-bengali">
            বিশ্ববিদ্যালয় ভর্তি ও IELTS প্রস্তুতি সহজ করুন। দক্ষ মেন্টর, লাইভ ক্লাস ও রেকর্ডেড ভিডিও একসাথে।
          </p>
        </div>
        <div>
          <h4 className="text-background font-semibold mb-3">Explore</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/" className="hover:text-brand">Home</Link></li>
            <li><Link to="/courses" className="hover:text-brand">Our Courses</Link></li>
            <li><Link to="/reviews" className="hover:text-brand">Student Reviews</Link></li>
            <li><Link to="/contact" className="hover:text-brand">Contact Us</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-background font-semibold mb-3">Account</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/auth" search={{ mode: "login" }} className="hover:text-brand">Log in</Link></li>
            <li><Link to="/dashboard" className="hover:text-brand">My Dashboard</Link></li>
          </ul>
        </div>
      </div>
      <p className="text-center text-xs text-background/50 mt-12">
        © {new Date().getFullYear()} Gators Learning. All rights reserved.
      </p>
    </footer>
  );
}
