-- =====================================================================
-- COMPREHENSIVE RLS POLICIES FOR MAXSKILLS LEARNING
-- =====================================================================

-- 1. Setup Roles and check function
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'student');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    UNIQUE (user_id, role)
);

-- Grant select to authenticated so they can check their own role
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- 2. Security Definer Functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  -- Hardcoded fallback for the primary admin email
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = auth.uid() AND email = 'adel111@gmail.com'
  ) OR public.has_role(auth.uid(), 'admin')
$$;

-- 3. Enable RLS on all tables
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY;';
    END LOOP;
END $$;

-- 4. Clear all existing policies to avoid conflicts
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.' || quote_ident(r.tablename) || ';';
    END LOOP;
END $$;

-- 5. Global Table Policies

-- CATEGORIES
CREATE POLICY "Categories public read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Categories admin manage" ON public.categories FOR ALL TO authenticated USING (public.is_admin());

-- COURSES
CREATE POLICY "Courses public read" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Courses admin manage" ON public.courses FOR ALL TO authenticated USING (public.is_admin());

-- PROFILES
CREATE POLICY "Profiles self read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles public selection" ON public.profiles FOR SELECT USING (true); -- Required for reviews/lookup
CREATE POLICY "Profiles admin manage" ON public.profiles FOR ALL TO authenticated USING (public.is_admin());

-- ENROLLMENTS
CREATE POLICY "Enrollments self read" ON public.enrollments FOR SELECT TO authenticated USING (auth.uid() = profile_id);
CREATE POLICY "Enrollments admin manage" ON public.enrollments FOR ALL TO authenticated USING (public.is_admin());

-- COURSE_CONTENTS
CREATE POLICY "Course contents public read free" ON public.course_contents FOR SELECT USING (is_free = true);
CREATE POLICY "Course contents enrolled read" ON public.course_contents FOR SELECT TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.enrollments WHERE profile_id = auth.uid() AND course_id = public.course_contents.course_id));
CREATE POLICY "Course contents admin manage" ON public.course_contents FOR ALL TO authenticated USING (public.is_admin());

-- ENROLLMENT_REQUESTS
CREATE POLICY "Enrollment requests anyone insert" ON public.enrollment_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Enrollment requests self read" ON public.enrollment_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Enrollment requests admin manage" ON public.enrollment_requests FOR ALL TO authenticated USING (public.is_admin());

-- EXAM_RESULTS
CREATE POLICY "Exam results self read" ON public.exam_results FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Exam results self insert" ON public.exam_results FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Exam results admin manage" ON public.exam_results FOR ALL TO authenticated USING (public.is_admin());

-- ADS
CREATE POLICY "Ads public read" ON public.ads FOR SELECT USING (is_active = true);
CREATE POLICY "Ads admin manage" ON public.ads FOR ALL TO authenticated USING (public.is_admin());

-- SITE_SETTINGS
CREATE POLICY "Site settings public read" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Site settings admin manage" ON public.site_settings FOR ALL TO authenticated USING (public.is_admin());

-- REVIEWS
CREATE POLICY "Reviews public read approved" ON public.reviews FOR SELECT USING (is_approved = true OR auth.uid() = user_id);
CREATE POLICY "Reviews self insert" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Reviews admin manage" ON public.reviews FOR ALL TO authenticated USING (public.is_admin());

-- USER_ROLES
CREATE POLICY "User roles self read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "User roles admin manage" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin());

-- 6. Final Grants for Tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
