
-- 1. Create all tables
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    details TEXT,
    category TEXT REFERENCES public.categories(name),
    price NUMERIC,
    discount_price NUMERIC,
    thumbnail_url TEXT,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    photo_url TEXT,
    avatar_url TEXT,
    mobile TEXT,
    whatsapp TEXT,
    roll_number TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'certified', 'expired')),
    certificate_url TEXT,
    enrolled_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(profile_id, course_id)
);

CREATE TABLE public.course_contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    youtube_url TEXT,
    thumbnail_url TEXT,
    pdf_url TEXT,
    live_url TEXT,
    live_expires_at TIMESTAMPTZ,
    exam_link TEXT,
    exam_enabled BOOLEAN DEFAULT true,
    is_free BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.enrollment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    mobile TEXT NOT NULL,
    whatsapp TEXT,
    transaction_id TEXT NOT NULL,
    roll_number TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.exam_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    exam_name TEXT NOT NULL,
    score NUMERIC NOT NULL,
    max_score NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_url TEXT NOT NULL,
    link_url TEXT,
    placement TEXT DEFAULT 'homepage',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.site_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Grants
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT INSERT ON public.enrollment_requests TO anon, authenticated;
GRANT INSERT ON public.reviews TO authenticated;
GRANT INSERT ON public.exam_results TO authenticated;

-- 3. Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 4. Policies
CREATE POLICY "Public read categories" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read courses" ON public.courses FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Public view profiles by roll" ON public.profiles FOR SELECT TO anon USING (true);
CREATE POLICY "Users view own enrollments" ON public.enrollments FOR SELECT TO authenticated USING (auth.uid() = profile_id);
CREATE POLICY "Public read free lessons" ON public.course_contents FOR SELECT TO anon, authenticated USING (is_free = true);
CREATE POLICY "Enrolled students read lessons" ON public.course_contents FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.enrollments WHERE profile_id = auth.uid() AND course_id = public.course_contents.course_id)
);
CREATE POLICY "Users view own requests" ON public.enrollment_requests FOR SELECT TO authenticated USING (auth.uid() = user_id OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));
CREATE POLICY "Users view own results" ON public.exam_results FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Public rankings" ON public.exam_results FOR SELECT TO anon USING (true);
CREATE POLICY "Public read ads" ON public.ads FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read settings" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read approved reviews" ON public.reviews FOR SELECT TO anon, authenticated USING (is_approved = true);

-- Seed
INSERT INTO public.categories (name) VALUES ('University Admission'), ('IELTS'), ('Programming'), ('Design') ON CONFLICT DO NOTHING;
