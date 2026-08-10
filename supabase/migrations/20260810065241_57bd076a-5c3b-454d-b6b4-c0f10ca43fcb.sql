ALTER TABLE public.course_contents ADD COLUMN IF NOT EXISTS position INTEGER;
GRANT ALL ON public.course_contents TO authenticated;
GRANT ALL ON public.course_contents TO service_role;
GRANT SELECT ON public.course_contents TO anon;
