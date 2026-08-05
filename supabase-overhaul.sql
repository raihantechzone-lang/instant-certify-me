-- Results and Exam Scores
CREATE TABLE IF NOT EXISTS public.exam_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    exam_name TEXT NOT NULL,
    score NUMERIC NOT NULL,
    max_score NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_results TO authenticated;
GRANT ALL ON public.exam_results TO service_role;
GRANT SELECT ON public.exam_results TO anon;

ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own results" ON public.exam_results
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Public can see results for rankings" ON public.exam_results
    FOR SELECT TO anon USING (true);

-- Track who clicked enroll but didn't finish
CREATE TABLE IF NOT EXISTS public.abandoned_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    email TEXT,
    full_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT ALL ON public.abandoned_enrollments TO authenticated;
GRANT ALL ON public.abandoned_enrollments TO service_role;
GRANT INSERT ON public.abandoned_enrollments TO anon;

ALTER TABLE public.abandoned_enrollments ENABLE ROW LEVEL SECURITY;

-- Lesson Progress tracking (ensure it exists and has what we need)
CREATE TABLE IF NOT EXISTS public.lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    content_id UUID REFERENCES public.course_contents(id) ON DELETE CASCADE NOT NULL,
    completed BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, content_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_progress TO authenticated;
GRANT ALL ON public.lesson_progress TO service_role;

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own progress" ON public.lesson_progress
    FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Add fields to course_contents if they don't exist
ALTER TABLE public.course_contents ADD COLUMN IF NOT EXISTS exam_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.course_contents ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Add categories to courses if not there
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS category TEXT;

