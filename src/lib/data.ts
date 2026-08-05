import { supabase } from "@/integrations/supabase/client";

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

export interface Course {
  id: string;
  title: string;
  details: string | null;
  category: string | null;
  price: number | null;
  discount_price: number | null;
  thumbnail_url: string | null;
  instructor_id: string | null;
  created_at: string;
}

export interface CourseContent {
  id: string;
  course_id: string;
  title: string;
  youtube_url: string | null;
  pdf_url: string | null;
  live_url: string | null;
  live_expires_at: string | null;
  exam_link: string | null;
  exam_enabled: boolean;
  is_free: boolean;
  thumbnail_url: string | null;
  created_at: string;
  lesson_type?: string;
  position?: number;
}

export interface Enrollment {
  id: string;
  profile_id: string;
  course_id: string;
  status: string;
  certificate_url: string | null;
  created_at: string;
}

export interface EnrollmentRequest {
  id: string;
  user_id?: string | null;
  profile_id: string;
  course_id: string;
  full_name: string;
  email: string;
  mobile: string;
  whatsapp?: string | null;
  roll_number?: string | null;
  transaction_id: string;
  amount?: number | null;
  status: 'pending' | 'approved' | 'rejected' | 'verified';
  photo_url?: string | null;
  created_at: string;
}

export interface ExamResult {
  id: string;
  user_id: string;
  course_id: string;
  score: number;
  total: number;
  created_at: string;
}

export function isLiveLinkActive(content: CourseContent) {
  if (!content.live_url || !content.live_expires_at) return false;
  return new Date(content.live_expires_at) > new Date();
}

export function youtubeId(url: string | null) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?/ ]{11})/);
  return match ? match[1] : null;
}
