import { createClient } from "@supabase/supabase-js";

// Existing project database (publishable key — safe for browser use).
const SUPABASE_URL = "https://jouwcthdcjoegcqgwlpl.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Y1rY5LYRuDF9iqJNWS1blQ_9EqPBOp9";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    // Keeps the user logged in across reloads until they explicitly log out.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "gators-learning-auth",
  },
});
