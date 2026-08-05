import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Course {
  id: string;
  title: string;
  details: string | null;
  category: string | null;
  price: number | null;
  discount_price: number | null;
  thumbnail_url: string | null;
  created_at: string;
}

export interface CourseContent {
  id: string;
  course_id: string;
  title: string;
  youtube_url: string | null;
  thumbnail_url?: string | null;
  exam_link: string | null;
  exam_enabled?: boolean;
  pdf_url?: string | null;
  live_url?: string | null;
  live_expires_at?: string | null;
  is_free: boolean | null;
  created_at: string;
}

export interface Enrollment {
  id: string;
  profile_id: string;
  course_id: string;
  status: string;
  certificate_url: string | null;
  enrolled_at?: string | null;
}

/** Live class links disappear automatically 1 day after the admin adds them. */
export function isLiveLinkActive(content: CourseContent) {
  if (!content.live_url) return false;
  const expiry = content.live_expires_at
    ? new Date(content.live_expires_at).getTime()
    : new Date(content.created_at).getTime() + 24 * 60 * 60 * 1000;
  return Date.now() < expiry;
}

export function youtubeId(url?: string | null) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          if (cancelled) return;
          setCourses((data as Course[]) ?? []);
          setLoading(false);
        });
    load();
    const channel = supabase
      .channel("courses-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "courses" }, () => load())
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return { courses, loading };
}

const DEFAULT_SETTINGS: Record<string, string> = {
  hero_title: "Gators Learning",
  hero_subtitle: "University Admission ও IELTS প্রস্তুতির সম্পূর্ণ প্ল্যাটফর্ম",
};

/** Title / subtitle are editable in real time from the admin panel. */
export function useSiteSettings() {
  const [settings, setSettings] = useState<Record<string, string>>(DEFAULT_SETTINGS);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      supabase
        .from("site_settings")
        .select("key, value")
        .then(({ data }) => {
          if (cancelled || !data) return;
          const next = { ...DEFAULT_SETTINGS };
          for (const row of data as { key: string; value: string | null }[]) {
            if (row.value) next[row.key] = row.value;
          }
          setSettings(next);
        });
    load();
    const channel = supabase
      .channel("settings-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, () => load())
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return settings;
}

export interface EnrollmentRequest {
  id: string;
  user_id: string | null;
  course_id: string;
  full_name: string;
  photo_url: string | null;
  email: string;
  mobile: string;
  whatsapp: string | null;
  transaction_id: string;
  roll_number: string | null;
  status: string;
  created_at: string;
}
