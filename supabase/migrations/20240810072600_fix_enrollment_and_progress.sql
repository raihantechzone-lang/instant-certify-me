-- Enable RLS and setup permissions for enrollment_requests if missing
CREATE TABLE IF NOT EXISTS public.enrollment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    full_name TEXT,
    mobile TEXT,
    transaction_id TEXT,
    roll_number TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.enrollment_requests TO authenticated;
GRANT ALL ON public.enrollment_requests TO service_role;

ALTER TABLE public.enrollment_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own enrollment requests') THEN
        CREATE POLICY "Users can view own enrollment requests" ON public.enrollment_requests
        FOR SELECT TO authenticated USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own enrollment requests') THEN
        CREATE POLICY "Users can insert own enrollment requests" ON public.enrollment_requests
        FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Lesson Progress Table
CREATE TABLE IF NOT EXISTS public.lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    content_id UUID REFERENCES public.course_contents(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT false,
    last_position_seconds INTEGER DEFAULT 0,
    seconds_watched INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, content_id)
);

GRANT SELECT, INSERT, UPDATE ON public.lesson_progress TO authenticated;
GRANT ALL ON public.lesson_progress TO service_role;

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own progress') THEN
        CREATE POLICY "Users can view own progress" ON public.lesson_progress
        FOR SELECT TO authenticated USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own progress') THEN
        CREATE POLICY "Users can manage own progress" ON public.lesson_progress
        FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Ensure public course data is readable by all
GRANT SELECT ON public.courses TO anon, authenticated;
GRANT SELECT ON public.course_contents TO anon, authenticated;
GRANT SELECT ON public.categories TO anon, authenticated;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read access for published courses') THEN
        CREATE POLICY "Public read access for published courses" ON public.courses
        FOR SELECT USING (is_published = true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read access for contents') THEN
        CREATE POLICY "Public read access for contents" ON public.course_contents
        FOR SELECT USING (true);
    END IF;
END $$;
