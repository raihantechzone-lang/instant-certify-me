import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Ad {
  id: string;
  image_url: string | null;
  title: string | null;
  link_url: string | null;
}

/**
 * Interstitial ad, uploaded from the admin panel.
 * Shows on the home screen and on the student dashboard, and can only be
 * dismissed with the X in the top-right corner of the ad.
 */
export function InterstitialAd({ placement }: { placement: "home" | "dashboard" }) {
  const [ad, setAd] = useState<Ad | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      supabase
        .from("ads")
        .select("id, image_url, title, link_url")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if (cancelled) return;
          if (data) {
            setAd(data as Ad);
            setOpen(true);
          } else {
            // deleted / paused in the admin panel — remove the overlay at once
            setAd(null);
            setOpen(false);
          }
        });
    load();
    const channel = supabase
      .channel("ads-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "ads" }, () => load())
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [placement]);


  if (!ad || !open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl overflow-hidden bg-background shadow-2xl">
        <button
          onClick={() => setOpen(false)}
          aria-label="Close ad"
          className="absolute top-3 right-3 z-10 h-9 w-9 rounded-full bg-ink/70 text-background text-lg font-bold flex items-center justify-center hover:bg-ink"
        >
          ✕
        </button>
        {ad.link_url ? (
          <a href={ad.link_url} target="_blank" rel="noopener noreferrer">
            <img src={ad.image_url ?? ""} alt={ad.title ?? "Advertisement"} className="w-full h-auto" />
          </a>
        ) : (
          <img src={ad.image_url ?? ""} alt={ad.title ?? "Advertisement"} className="w-full h-auto" />
        )}
        {ad.title && <p className="p-4 text-sm font-semibold text-center">{ad.title}</p>}
      </div>
    </div>
  );
}
