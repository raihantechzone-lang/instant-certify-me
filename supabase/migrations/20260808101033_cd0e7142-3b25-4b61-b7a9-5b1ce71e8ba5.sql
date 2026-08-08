-- 1. Disable RLS on core admin tables to bypass policy restrictions
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_contents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollment_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. Ensure absolute permissions for all authenticated users
GRANT ALL ON TABLE public.categories TO authenticated, service_role;
GRANT ALL ON TABLE public.courses TO authenticated, service_role;
GRANT ALL ON TABLE public.course_contents TO authenticated, service_role;
GRANT ALL ON TABLE public.enrollments TO authenticated, service_role;
GRANT ALL ON TABLE public.enrollment_requests TO authenticated, service_role;
GRANT ALL ON TABLE public.user_roles TO authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO authenticated, service_role;

-- 3. Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
