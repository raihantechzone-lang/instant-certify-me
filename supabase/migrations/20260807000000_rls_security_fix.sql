-- =====================================================================
-- RLS Security Fix — Comprehensive Application Policy Overhaul
-- =====================================================================

-- 0. Security Definer Functions (Role Checks)
-- Re-defining roles checking functions with proper search_path and security
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

CREATE OR REPLACE FUNCTION public.is_instructor()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'instructor')
$$;

-- 1. Enable RLS on all public tables (idempotent)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY;';
    END LOOP;
END $$;

-- 2. Drop existing overly permissive policies
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.' || quote_ident(r.tablename) || ';';
    END LOOP;
END $$;

-- 3. Table-Specific Policies

-- CATEGORIES
CREATE POLICY "Categories public read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Categories admin CRUD" ON public.categories FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- COURSES
CREATE POLICY "Courses public read" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Courses admin CRUD" ON public.courses FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Instructors manage own courses" ON public.courses FOR ALL TO authenticated 
    USING (instructor_id = auth.uid()) 
    WITH CHECK (instructor_id = auth.uid());

-- PROFILES
CREATE POLICY "Profiles self read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) 
    WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles admin CRUD" ON public.profiles FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Profiles public select" ON public.profiles FOR SELECT TO anon, authenticated USING (true); -- Required for ranking/reviews

-- ENROLLMENTS
CREATE POLICY "Enrollments self read" ON public.enrollments FOR SELECT TO authenticated USING (auth.uid() = profile_id);
CREATE POLICY "Enrollments admin CRUD" ON public.enrollments FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Instructors read course enrollments" ON public.enrollments FOR SELECT TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND instructor_id = auth.uid()));

-- COURSE_CONTENTS
CREATE POLICY "Course contents public read free" ON public.course_contents FOR SELECT USING (is_free = true);
CREATE POLICY "Enrolled students read lessons" ON public.course_contents FOR SELECT TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.enrollments WHERE profile_id = auth.uid() AND course_id = course_id AND status = 'active'));
CREATE POLICY "Admin/Instructor manage content" ON public.course_contents FOR ALL TO authenticated 
    USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND instructor_id = auth.uid()))
    WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND instructor_id = auth.uid()));

-- ENROLLMENT_REQUESTS
CREATE POLICY "Enrollment requests self read" ON public.enrollment_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Enrollment requests anyone insert" ON public.enrollment_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Enrollment requests admin CRUD" ON public.enrollment_requests FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- EXAM_RESULTS
CREATE POLICY "Results self read" ON public.exam_results FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Results self insert" ON public.exam_results FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Results admin/instructor read" ON public.exam_results FOR SELECT TO authenticated 
    USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND instructor_id = auth.uid()));

-- ADS
CREATE POLICY "Ads public read" ON public.ads FOR SELECT USING (is_active = true);
CREATE POLICY "Ads admin CRUD" ON public.ads FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- SITE_SETTINGS
CREATE POLICY "Site settings public read" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Site settings admin CRUD" ON public.site_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- REVIEWS
CREATE POLICY "Reviews public read approved" ON public.reviews FOR SELECT USING (is_approved = true OR auth.uid() = user_id);
CREATE POLICY "Reviews self insert" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Reviews admin CRUD" ON public.reviews FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- INSTRUCTOR_PROFILES
CREATE POLICY "Instructor profiles public read approved" ON public.instructor_profiles FOR SELECT USING (status = 'approved' OR auth.uid() = id);
CREATE POLICY "Instructor profiles self upsert" ON public.instructor_profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Instructor profiles admin CRUD" ON public.instructor_profiles FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ANNOUNCEMENTS
CREATE POLICY "Announcements enrolled read" ON public.announcements FOR SELECT TO authenticated 
    USING (course_id IS NULL OR EXISTS (SELECT 1 FROM public.enrollments WHERE course_id = announcements.course_id AND profile_id = auth.uid()));
CREATE POLICY "Announcements instructor manage" ON public.announcements FOR ALL TO authenticated 
    USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "Announcements admin CRUD" ON public.announcements FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- LESSON_PROGRESS
CREATE POLICY "Progress self management" ON public.lesson_progress FOR ALL TO authenticated 
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- USER_ROLES
CREATE POLICY "User roles self read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "User roles admin manage" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4. Storage Policies (course-videos)
-- Assuming the bucket name is 'course-videos'
-- Drop existing policies
DO $$ 
BEGIN
    DELETE FROM storage.policies WHERE bucket_id = 'course-videos';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Enrolled students can view videos" ON storage.objects FOR SELECT TO authenticated 
    USING (bucket_id = 'course-videos' AND (
        EXISTS (
            SELECT 1 FROM public.course_contents cc
            JOIN public.enrollments e ON e.course_id = cc.course_id
            WHERE e.profile_id = auth.uid() 
            AND e.status = 'active'
            AND (name = cc.video_file_url OR name LIKE cc.video_file_url || '%')
        )
    ));

CREATE POLICY "Admins/Instructors manage videos" ON storage.objects FOR ALL TO authenticated 
    USING (bucket_id = 'course-videos' AND (public.is_admin() OR public.is_instructor()))
    WITH CHECK (bucket_id = 'course-videos' AND (public.is_admin() OR public.is_instructor()));

-- 5. Grants (Final check)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
