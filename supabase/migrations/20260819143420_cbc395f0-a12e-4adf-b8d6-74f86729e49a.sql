-- Standardize reviews table idempotently
DO $$ 
BEGIN 
  -- Rename user_id to profile_id if user_id exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'user_id') THEN
    ALTER TABLE public.reviews RENAME COLUMN user_id TO profile_id;
  END IF;

  -- Rename message to comment if message exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'message') THEN
    ALTER TABLE public.reviews RENAME COLUMN message TO comment;
  END IF;

  -- Drop status column if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'status') THEN
    ALTER TABLE public.reviews DROP COLUMN status;
  END IF;
END $$;

-- Update constraints and defaults
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_rating_check;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_rating_check CHECK (rating >= 1 AND rating <= 5);

ALTER TABLE public.reviews ALTER COLUMN is_approved SET DEFAULT FALSE;
ALTER TABLE public.reviews ALTER COLUMN created_at SET DEFAULT NOW();

-- Standardize FKs
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_user_id_fkey;
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_profile_id_fkey;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_course_id_fkey;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

-- Re-grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT SELECT ON public.reviews TO anon;
GRANT ALL ON public.reviews TO service_role;
