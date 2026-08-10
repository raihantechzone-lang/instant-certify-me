CREATE TABLE IF NOT EXISTS public.lesson_progress (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    lesson_id uuid REFERENCES public.course_contents(id) ON DELETE CASCADE NOT NULL,
    completed boolean DEFAULT false,
    watched_at timestamp with time zone DEFAULT now(),
    UNIQUE(profile_id, lesson_id)
);

GRANT SELECT, INSERT, UPDATE ON public.lesson_progress TO authenticated;
GRANT ALL ON public.lesson_progress TO service_role;

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own progress' AND tablename = 'lesson_progress') THEN
        CREATE POLICY "Users can manage their own progress" ON public.lesson_progress
            FOR ALL TO authenticated USING (auth.uid() = profile_id);
    END IF;
END $$;
