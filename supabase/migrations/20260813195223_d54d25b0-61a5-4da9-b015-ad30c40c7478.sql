ALTER TABLE public.lesson_progress
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS progress_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_position_seconds numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration_seconds numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS lesson_progress_profile_lesson_uidx
  ON public.lesson_progress (profile_id, lesson_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_progress TO authenticated;
GRANT ALL ON public.lesson_progress TO service_role;

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
