-- One last check: Make sure user_roles table itself is readable by authenticated users
-- so the RLS policy subquery can work.
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User roles self read" ON public.user_roles;
CREATE POLICY "user_roles_auth_read" ON public.user_roles FOR SELECT TO authenticated USING (true);

-- This is CRITICAL: RLS policies on other tables use SELECT on user_roles.
-- If an authenticated user can't SELECT from user_roles, they can't pass the check.
GRANT SELECT ON public.user_roles TO authenticated;
