-- Revoke default public execution rights for the security definer functions
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;

-- Only service_role should execute these internally for RLS
-- However, if the frontend needs to check is_admin(), we might need to grant it to authenticated.
-- But since we use them IN policies, the RLS system executes them with the owner's privileges.
-- We only need to grant EXECUTE if the client calls them via RPC.

GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

-- If the admin panel uses `select public.is_admin()`, we need this:
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
