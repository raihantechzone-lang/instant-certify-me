# Rename 'ads' table to 'app_ads' and 'link_url' column to 'target_link'

The user wants to rename the `ads` table to `app_ads` and the `link_url` column to `target_link`. This requires a database migration and updates to all frontend and integration code referencing these names.

## Database Changes

1.  **Migration**: Create a new migration to:
    *   Rename the `ads` table to `app_ads`.
    *   Rename the `link_url` column to `target_link` in the new `app_ads` table.
    *   Update RLS policies and GRANTS to reflect the new table name.

## Frontend & Integration Changes

1.  **TypeScript Types**: The `src/integrations/supabase/types.ts` will be updated automatically by the platform, but I will need to update components that use these types.
2.  **`src/components/site/InterstitialAd.tsx`**: Update the `Ad` interface and the `supabase.from("ads")` query.
3.  **`src/routes/admin/reviews.tsx`**: Update the `supabase.from("ads")` queries (select, update, insert, delete) and usage of `link_url`.
4.  **`src/html/homepage-integration.html`**: Update the `showInterstitialAd` function and the realtime channel subscription.

## Technical Details

```sql
-- Migration snippet
ALTER TABLE public.ads RENAME TO app_ads;
ALTER TABLE public.app_ads RENAME COLUMN link_url TO target_link;
-- RLS policies follow the rename automatically, but triggers or custom functions might need manual adjustment.
-- I will re-grant permissions just to be safe.
GRANT SELECT ON public.app_ads TO anon, authenticated;
GRANT ALL ON public.app_ads TO service_role;
```

I will verify the changes by checking the preview and ensuring the interstitial ad still loads (if active) and the admin panel still shows the ad management section.
