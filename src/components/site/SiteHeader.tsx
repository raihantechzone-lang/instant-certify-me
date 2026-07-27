import { Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";

export function SiteHeader() {
  const { user, profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const router = useRouter();

  return (
    <header className="fixed top-2 sm:top-6 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 w-full max-w-7xl mx-auto">
      <nav className="bg-background/90 backdrop-blur-xl border border-border shadow-[0_4px_30px_rgb(0,0,0,0.05)] rounded-2xl px-4 py-2 sm:px-6 sm:py-3 grid grid-cols-3 items-center">
        <div className="flex justify-start items-center">
          <Link to="/" className="block">
            <img
              src="https://ik.imagekit.io/n7rgjyaxh/Untitled%20design_20260630_142739_0000.png"
              alt="Gators Learning"
              className="h-12 sm:h-16 w-auto object-contain"
            />
          </Link>
        </div>

        <div className="flex justify-center items-center">
          <div className="hidden lg:flex space-x-6 items-center">
            <Link to="/" className="text-sm font-semibold text-ink hover:text-brand transition-colors">
              Home
            </Link>
            <Link to="/courses" className="text-sm font-semibold text-ink hover:text-brand transition-colors">
              Our Courses
            </Link>
            <Link to="/contact" className="text-sm font-semibold text-ink hover:text-brand transition-colors">
              Contact Us
            </Link>
          </div>
        </div>

        <div className="flex justify-end items-center relative">
          {!user ? (
            <div className="hidden lg:flex items-center space-x-3">
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="px-5 py-2.5 rounded-xl border-2 border-border bg-background text-sm font-bold text-ink hover:border-ink-muted transition shadow-sm whitespace-nowrap"
              >
                Sign up
              </Link>
              <Link
                to="/auth"
                search={{ mode: "login" }}
                className="px-5 py-2.5 rounded-xl bg-ink text-background text-sm font-bold hover:opacity-90 transition shadow-md whitespace-nowrap"
              >
                Log in
              </Link>
            </div>
          ) : (
            <div className="hidden lg:flex items-center space-x-3 relative">
              <Link to="/dashboard" className="text-sm font-bold text-brand mr-4 hover:underline">
                Dashboard
              </Link>
              <button
                onClick={() => setProfileOpen((v) => !v)}
                aria-label="Account menu"
                className="w-10 h-10 rounded-full bg-brand-soft border-2 border-brand flex items-center justify-center text-brand overflow-hidden shadow-sm"
              >
                {profile?.photo_url ? (
                  <img src={profile.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold">{(profile?.full_name ?? user.email ?? "?").charAt(0).toUpperCase()}</span>
                )}
              </button>
              {profileOpen && (
                <div className="absolute top-12 right-0 w-52 bg-background rounded-xl shadow-lg border border-border py-2">
                  <div className="px-4 py-2 border-b border-border mb-2">
                    <p className="text-xs text-ink-muted">Signed in as</p>
                    <p className="text-sm font-bold truncate">{profile?.full_name ?? user.email}</p>
                    {profile?.roll_number && (
                      <p className="text-xs font-bold text-brand truncate mt-1">{profile.roll_number}</p>
                    )}
                  </div>
                  <Link
                    to="/dashboard"
                    onClick={() => setProfileOpen(false)}
                    className="block px-4 py-2 text-sm hover:bg-muted hover:text-brand"
                  >
                    My Dashboard
                  </Link>
                  <button
                    onClick={async () => {
                      setProfileOpen(false);
                      await signOut();
                      router.navigate({ to: "/" });
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10 font-medium"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Open menu"
            className="lg:hidden w-10 h-10 rounded-xl bg-background border border-border text-ink flex items-center justify-center shadow-sm ml-3"
          >
            ☰
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="lg:hidden absolute top-[calc(100%+10px)] left-4 right-4 bg-background/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-border p-6 flex flex-col gap-4 z-50">
          <Link to="/" onClick={() => setMenuOpen(false)} className="text-base font-bold border-b border-border pb-3">
            Home
          </Link>
          <Link to="/courses" onClick={() => setMenuOpen(false)} className="text-base font-bold border-b border-border pb-3">
            Our Courses
          </Link>
          <Link to="/contact" onClick={() => setMenuOpen(false)} className="text-base font-bold border-b border-border pb-3">
            Contact Us
          </Link>
          {!user ? (
            <div className="flex flex-col gap-3 pt-2">
              <Link
                to="/auth"
                search={{ mode: "login" }}
                onClick={() => setMenuOpen(false)}
                className="w-full py-3.5 text-center rounded-xl border-2 border-ink font-bold"
              >
                Log in
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                onClick={() => setMenuOpen(false)}
                className="w-full py-3.5 text-center rounded-xl bg-brand text-brand-foreground font-bold shadow-lg"
              >
                Sign up
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3 pt-2">
              <Link
                to="/dashboard"
                onClick={() => setMenuOpen(false)}
                className="w-full py-3.5 text-center rounded-xl bg-brand-soft text-brand font-bold"
              >
                My Dashboard
              </Link>
              <button
                onClick={async () => {
                  setMenuOpen(false);
                  await signOut();
                  router.navigate({ to: "/" });
                }}
                className="w-full py-3.5 rounded-xl border-2 border-destructive/30 text-destructive font-bold"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
