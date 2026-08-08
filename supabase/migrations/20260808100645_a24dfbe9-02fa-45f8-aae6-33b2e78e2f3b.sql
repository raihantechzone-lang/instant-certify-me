DO $$
DECLARE
    new_user_id UUID;
BEGIN
    -- 1. Ensure the user exists in auth.users (this should exist if you've logged in)
    -- If it doesn't exist, we can't easily create it via SQL without Hashing passwords, 
    -- but usually the user has already signed up.
    SELECT id INTO new_user_id FROM auth.users WHERE email = 'adel111@gmail.com';

    IF new_user_id IS NOT NULL THEN
        -- 2. Upsert Profile
        INSERT INTO public.profiles (id, full_name)
        VALUES (new_user_id, 'Admin Adel')
        ON CONFLICT (id) DO UPDATE SET full_name = 'Admin Adel';

        -- 3. Upsert Admin Role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (new_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END $$;