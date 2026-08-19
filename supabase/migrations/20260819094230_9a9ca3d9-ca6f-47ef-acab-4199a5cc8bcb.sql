ALTER TABLE public.ads RENAME TO app_ads;
ALTER TABLE public.app_ads RENAME COLUMN link_url TO target_link;

-- Re-grant permissions
GRANT SELECT ON public.app_ads TO anon, authenticated;
GRANT ALL ON public.app_ads TO service_role;
