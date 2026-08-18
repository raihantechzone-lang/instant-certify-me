
ALTER TABLE public.enrollment_requests 
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'bkash',
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';

-- Re-verify RLS or just ensure they are available
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollment_requests TO authenticated;
GRANT ALL ON public.enrollment_requests TO service_role;
