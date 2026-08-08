GRANT ALL ON public.courses TO anon, authenticated, service_role;
GRANT ALL ON public.categories TO anon, authenticated, service_role;
GRANT ALL ON public.course_contents TO anon, authenticated, service_role;
GRANT ALL ON public.user_roles TO anon, authenticated, service_role;
GRANT ALL ON public.profiles TO anon, authenticated, service_role;
GRANT ALL ON public.enrollments TO anon, authenticated, service_role;
GRANT ALL ON public.enrollment_requests TO anon, authenticated, service_role;

ALTER TABLE public.courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_contents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollment_requests DISABLE ROW LEVEL SECURITY;