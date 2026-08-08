-- 1. Ensure user_roles table is properly granted
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- 2. Create a missing category for the hardcoded admin if they log in
DO $$
DECLARE
    target_user_id UUID;
BEGIN
    SELECT id INTO target_user_id FROM auth.users WHERE email = 'adel111@gmail.com';
    
    IF target_user_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        -- Also ensure they have a profile
        INSERT INTO public.profiles (id, full_name, roll_number)
        VALUES (target_user_id, 'Admin User', 'ADMIN001')
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- 3. Fix potential category deletion issues (Cascade delete)
ALTER TABLE public.courses 
DROP CONSTRAINT IF EXISTS courses_category_fkey,
ADD CONSTRAINT courses_category_fkey 
FOREIGN KEY (category) REFERENCES public.categories(name) 
ON UPDATE CASCADE 
ON DELETE SET NULL;

-- 4. Re-grant permissions on categories just in case
GRANT ALL ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
GRANT SELECT ON public.categories TO anon;

-- 5. Fix RLS for categories
DROP POLICY IF EXISTS "Categories admin CRUD" ON public.categories;
CREATE POLICY "Categories admin CRUD" ON public.categories 
FOR ALL TO authenticated 
USING (public.is_admin()) 
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Categories emergency CRUD" ON public.categories;
CREATE POLICY "Categories emergency CRUD" ON public.categories 
FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- 6. Ensure courses table has proper grants
GRANT ALL ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
GRANT SELECT ON public.courses TO anon;
