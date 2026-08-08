-- 1. Create a function to check admin status by email
CREATE OR REPLACE FUNCTION public.is_admin_v3()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the current user email is adel111@gmail.com
  -- auth.jwt() -> 'email' is the standard way to get the user email in RLS
  RETURN (auth.jwt() ->> 'email' = 'adel111@gmail.com');
END;
$$;

-- 2. Ensure the admin user has the admin role in the user_roles table if it exists
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'adel111@gmail.com' LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
        -- Insert into user_roles if not exists
        INSERT INTO public.user_roles (user_id, role)
        VALUES (admin_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END $$;

-- 3. Grant full permissions on courses and categories to authenticated users
-- RLS will still filter them, but the table-level grant must be present
GRANT ALL ON public.courses TO authenticated;
GRANT ALL ON public.categories TO authenticated;
GRANT ALL ON public.user_roles TO authenticated;

-- 4. Update RLS policies for courses to allow the admin full access
DROP POLICY IF EXISTS "Admins can do everything on courses" ON public.courses;
CREATE POLICY "Admins can do everything on courses"
ON public.courses
FOR ALL
TO authenticated
USING (public.is_admin_v3())
WITH CHECK (public.is_admin_v3());

-- 5. Update RLS policies for categories
DROP POLICY IF EXISTS "Admins can do everything on categories" ON public.categories;
CREATE POLICY "Admins can do everything on categories"
ON public.categories
FOR ALL
TO authenticated
USING (public.is_admin_v3())
WITH CHECK (public.is_admin_v3());
