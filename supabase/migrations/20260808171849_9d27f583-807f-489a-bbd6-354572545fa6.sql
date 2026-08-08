-- 4. Re-verify Courses table structure and grants
GRANT ALL ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
GRANT SELECT ON public.courses TO anon;

-- 5. Add a simple admin check function that works even if user_roles is empty (fallback to email)
CREATE OR REPLACE FUNCTION public.is_admin_v2()
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Check if user has admin role in user_roles table
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RETURN TRUE;
  END IF;
  
  -- Fallback: check if user email is the specific admin email
  IF auth.jwt() ->> 'email' = 'adel111@gmail.com' THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- 6. Update Courses RLS to use the new check
DROP POLICY IF EXISTS "Courses admin CRUD" ON public.courses;
DROP POLICY IF EXISTS "Courses admin CRUD V2" ON public.courses;
CREATE POLICY "Courses admin CRUD V2" ON public.courses
FOR ALL TO authenticated
USING (public.is_admin_v2())
WITH CHECK (public.is_admin_v2());
