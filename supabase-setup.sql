-- Run this ONCE in your existing Supabase project (SQL editor).
-- It only ADDS the few things the new features need. Nothing existing is changed or deleted.

-- 1) Extra fields on course_contents: PDF, live class link (auto-expires after 1 day)
alter table public.course_contents add column if not exists pdf_url text;
alter table public.course_contents add column if not exists live_url text;
alter table public.course_contents add column if not exists live_expires_at timestamptz;

-- 2) Student reviews (admin approves before they show on the site)
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  message text not null,
  student_name text,
  student_photo text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
grant select, insert on public.reviews to authenticated;
grant select on public.reviews to anon;
grant all on public.reviews to service_role;
alter table public.reviews enable row level security;
drop policy if exists "approved reviews are public" on public.reviews;
create policy "approved reviews are public" on public.reviews for select using (status = 'approved' or auth.uid() = user_id);
drop policy if exists "users write own review" on public.reviews;
create policy "users write own review" on public.reviews for insert to authenticated with check (auth.uid() = user_id);

-- 3) Interstitial ads uploaded from the admin panel
create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  title text,
  image_url text,
  link_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.ads to anon, authenticated;
grant all on public.ads to service_role;
alter table public.ads enable row level security;
drop policy if exists "ads are public" on public.ads;
create policy "ads are public" on public.ads for select using (true);

-- 4) Site title / subtitle editable from the admin panel
create table if not exists public.site_settings (
  key text primary key,
  value text
);
grant select on public.site_settings to anon, authenticated;
grant all on public.site_settings to service_role;
alter table public.site_settings enable row level security;
drop policy if exists "settings are public" on public.site_settings;
create policy "settings are public" on public.site_settings for select using (true);
insert into public.site_settings (key, value) values
  ('hero_title', 'Gators Learning'),
  ('hero_subtitle', 'University Admission ও IELTS প্রস্তুতির সম্পূর্ণ প্ল্যাটফর্ম')
on conflict (key) do nothing;
