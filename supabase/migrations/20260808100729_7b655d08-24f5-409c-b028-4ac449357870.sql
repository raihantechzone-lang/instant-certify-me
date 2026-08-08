-- 1. Ensure the user exists in auth.users by searching via public data
-- If we can't find them, we'll try to sync via a dummy profile first
DO $$
DECLARE
    target_user_id UUID;
    target_email TEXT := 'adel111@gmail.com';
BEGIN
    -- Try to find the user in auth.users
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

    IF target_user_id IS NOT NULL THEN
        -- Create/Update Profile
        INSERT INTO public.profiles (id, full_name)
        VALUES (target_user_id, 'Admin Adel')
        ON CONFLICT (id) DO UPDATE SET full_name = 'Admin Adel';

        -- Ensure Admin Role exists
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END $$;

-- 2. Fix potential RLS complexity: Simplify admin policy to bypass function overhead
DROP POLICY IF EXISTS "Categories admin CRUD" ON public.categories;
DROP POLICY IF EXISTS "Categories admin manage" ON public.categories;
DROP POLICY IF EXISTS "Categories emergency CRUD" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;

CREATE POLICY "admin_full_access_categories" 
ON public.categories FOR ALL 
TO authenticated 
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- 3. Do the same for Courses just in case
DROP POLICY IF EXISTS "Courses admin CRUD" ON public.courses;
CREATE POLICY "admin_full_access_courses" 
ON public.courses FOR ALL 
TO authenticated 
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- 4. Content RLS fix
DROP POLICY IF EXISTS "Admin/Instructor manage content" ON public.course_contents;
CREATE POLICY "admin_full_access_contents" 
ON public.course_contents FOR ALL 
TO authenticated 
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- 5. Ensure GRANTS are explicit for authenticated users to perform CRUD
GRANT ALL ON public.categories TO authenticated;
GRANT ALL ON public.courses TO authenticated;
GRANT ALL ON public.course_contents TO authenticated;
GRANT ALL ON public.user_roles TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
