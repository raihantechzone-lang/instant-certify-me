
-- 1. Create role if not exists
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
  END IF;
END $$;

-- 2. Ensure adel111@gmail.com is in user_roles as admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role 
FROM auth.users 
WHERE email = 'adel111@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Update is_admin_v3 to be bulletproof
CREATE OR REPLACE FUNCTION public.is_admin_v3()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    auth.jwt() ->> 'email' = 'adel111@gmail.com' 
    OR 
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'::public.app_role
    )
  );
END;
$$;

-- 4. Grant explicitly
GRANT ALL ON public.courses TO authenticated;
GRANT ALL ON public.categories TO authenticated;
GRANT ALL ON public.user_roles TO authenticated;
