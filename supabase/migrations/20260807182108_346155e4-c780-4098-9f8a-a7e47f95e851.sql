-- A) REMOVE THE CURRENT DEMO COURSES
DELETE FROM public.courses 
WHERE title IN ('DU A Unit Crash Course', 'IELTS Academic Mastery', 'React & Next.js Bootcamp');

-- B) Fix/Ensure RLS policies for admin CRUD on courses table
DO $$
DECLARE
    admin_id UUID;
BEGIN
    SELECT id INTO admin_id FROM auth.users WHERE email = 'adel111@gmail.com';
    
    IF admin_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (admin_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END $$;

-- Drop potentially conflicting or redundant policies to ensure clean state
DROP POLICY IF EXISTS "Courses admin manage" ON public.courses;
DROP POLICY IF EXISTS "Courses admin CRUD" ON public.courses;
DROP POLICY IF EXISTS "Admins can manage courses" ON public.courses;
DROP POLICY IF EXISTS "Admins full access" ON public.courses;

-- Create a definitive Admin CRUD policy using has_role security definer function
CREATE POLICY "Admins full access" ON public.courses
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Ensure GRANTs are present
GRANT ALL ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
GRANT SELECT ON public.courses TO anon;

-- Also ensure related tables have proper admin access for deletion
GRANT ALL ON public.reviews TO authenticated;
GRANT ALL ON public.exam_results TO authenticated;
GRANT ALL ON public.enrollment_requests TO authenticated;
GRANT ALL ON public.enrollments TO authenticated;
GRANT ALL ON public.course_contents TO authenticated;
GRANT ALL ON public.user_roles TO authenticated;
