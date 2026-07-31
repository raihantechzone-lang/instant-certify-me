-- =====================================================================
-- Gators Learning — full LMS feature set (Saasico spec)
-- Run ONCE in your Supabase SQL editor. Everything here is ADDITIVE:
-- no existing table, column, policy or row is dropped or changed
-- destructively. Safe to re-run (idempotent).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0) Roles (admin / instructor / student) — separate table, never on profiles
-- ---------------------------------------------------------------------
do $$ begin
  create type public.app_role as enum ('admin', 'instructor', 'student');
exception when duplicate_object then null; end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
drop policy if exists "read own roles" on public.user_roles;
create policy "read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'admin')
$$;

-- ---------------------------------------------------------------------
-- 1) Profile extras (blocking, bio, locale, referral code)
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists is_blocked boolean not null default false;
alter table public.profiles add column if not exists locale text not null default 'bn';
alter table public.profiles add column if not exists referral_code text;
create unique index if not exists profiles_referral_code_key on public.profiles (referral_code) where referral_code is not null;

-- ---------------------------------------------------------------------
-- 2) Category management (order, icon, subcategories)
-- ---------------------------------------------------------------------
alter table public.categories add column if not exists parent_id uuid references public.categories(id) on delete set null;
alter table public.categories add column if not exists display_order int not null default 0;
alter table public.categories add column if not exists icon text;
alter table public.categories add column if not exists slug text;

-- ---------------------------------------------------------------------
-- 3) Course extras: instructor, level, publishing/approval, SEO
-- ---------------------------------------------------------------------
alter table public.courses add column if not exists instructor_id uuid references auth.users(id) on delete set null;
alter table public.courses add column if not exists level text default 'all';           -- beginner | intermediate | advanced | all
alter table public.courses add column if not exists status text not null default 'published'; -- draft | pending | published | rejected | unpublished
alter table public.courses add column if not exists review_feedback text;
alter table public.courses add column if not exists is_featured boolean not null default false;
alter table public.courses add column if not exists is_bestseller boolean not null default false;
alter table public.courses add column if not exists meta_title text;
alter table public.courses add column if not exists meta_description text;
alter table public.courses add column if not exists slug text;
alter table public.courses add column if not exists rating_avg numeric(3,2) not null default 0;
alter table public.courses add column if not exists rating_count int not null default 0;
alter table public.courses add column if not exists students_count int not null default 0;

-- ---------------------------------------------------------------------
-- 4) Curriculum: sections + richer lessons
-- ---------------------------------------------------------------------
create table if not exists public.course_sections (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.course_sections to anon, authenticated;
grant insert, update, delete on public.course_sections to authenticated;
grant all on public.course_sections to service_role;
alter table public.course_sections enable row level security;
drop policy if exists "sections public read" on public.course_sections;
create policy "sections public read" on public.course_sections for select using (true);
drop policy if exists "sections owner write" on public.course_sections;
create policy "sections owner write" on public.course_sections for all to authenticated
  using (public.is_admin() or exists (select 1 from public.courses c where c.id = course_id and c.instructor_id = auth.uid()))
  with check (public.is_admin() or exists (select 1 from public.courses c where c.id = course_id and c.instructor_id = auth.uid()));

alter table public.course_contents add column if not exists section_id uuid references public.course_sections(id) on delete set null;
alter table public.course_contents add column if not exists position int not null default 0;
alter table public.course_contents add column if not exists lesson_type text not null default 'video'; -- video | text | quiz | assignment
alter table public.course_contents add column if not exists article_html text;
alter table public.course_contents add column if not exists video_file_url text;
alter table public.course_contents add column if not exists duration_seconds int;
alter table public.course_contents add column if not exists subtitles_url text;

create table if not exists public.lesson_resources (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.course_contents(id) on delete cascade,
  title text not null,
  file_url text not null,
  kind text default 'file',
  created_at timestamptz not null default now()
);
grant select on public.lesson_resources to anon, authenticated;
grant insert, update, delete on public.lesson_resources to authenticated;
grant all on public.lesson_resources to service_role;
alter table public.lesson_resources enable row level security;
drop policy if exists "resources public read" on public.lesson_resources;
create policy "resources public read" on public.lesson_resources for select using (true);
drop policy if exists "resources owner write" on public.lesson_resources;
create policy "resources owner write" on public.lesson_resources for all to authenticated
  using (public.is_admin() or exists (
    select 1 from public.course_contents cc join public.courses c on c.id = cc.course_id
    where cc.id = content_id and c.instructor_id = auth.uid()))
  with check (public.is_admin() or exists (
    select 1 from public.course_contents cc join public.courses c on c.id = cc.course_id
    where cc.id = content_id and c.instructor_id = auth.uid()));

-- ---------------------------------------------------------------------
-- 5) Progress tracking, notes
-- ---------------------------------------------------------------------
create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  content_id uuid not null references public.course_contents(id) on delete cascade,
  completed boolean not null default false,
  last_position_seconds int not null default 0,
  seconds_watched int not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, content_id)
);
grant select, insert, update, delete on public.lesson_progress to authenticated;
grant all on public.lesson_progress to service_role;
alter table public.lesson_progress enable row level security;
drop policy if exists "own progress" on public.lesson_progress;
create policy "own progress" on public.lesson_progress for all to authenticated
  using (auth.uid() = user_id or public.is_admin()
    or exists (select 1 from public.courses c where c.id = course_id and c.instructor_id = auth.uid()))
  with check (auth.uid() = user_id);

create table if not exists public.lesson_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  content_id uuid not null references public.course_contents(id) on delete cascade,
  timestamp_seconds int not null default 0,
  body text not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.lesson_notes to authenticated;
grant all on public.lesson_notes to service_role;
alter table public.lesson_notes enable row level security;
drop policy if exists "own notes" on public.lesson_notes;
create policy "own notes" on public.lesson_notes for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 6) Q&A / discussion
-- ---------------------------------------------------------------------
create table if not exists public.lesson_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  content_id uuid references public.course_contents(id) on delete cascade,
  title text,
  body text not null,
  author_name text,
  author_photo text,
  created_at timestamptz not null default now()
);
grant select on public.lesson_questions to anon, authenticated;
grant insert, update, delete on public.lesson_questions to authenticated;
grant all on public.lesson_questions to service_role;
alter table public.lesson_questions enable row level security;
drop policy if exists "questions readable" on public.lesson_questions;
create policy "questions readable" on public.lesson_questions for select using (true);
drop policy if exists "questions own write" on public.lesson_questions;
create policy "questions own write" on public.lesson_questions for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "questions own update" on public.lesson_questions;
create policy "questions own update" on public.lesson_questions for update to authenticated
  using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());
drop policy if exists "questions own delete" on public.lesson_questions;
create policy "questions own delete" on public.lesson_questions for delete to authenticated
  using (auth.uid() = user_id or public.is_admin());

create table if not exists public.lesson_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.lesson_questions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  author_name text,
  author_photo text,
  is_instructor boolean not null default false,
  upvotes int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.lesson_answers to anon, authenticated;
grant insert, update, delete on public.lesson_answers to authenticated;
grant all on public.lesson_answers to service_role;
alter table public.lesson_answers enable row level security;
drop policy if exists "answers readable" on public.lesson_answers;
create policy "answers readable" on public.lesson_answers for select using (true);
drop policy if exists "answers own write" on public.lesson_answers;
create policy "answers own write" on public.lesson_answers for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "answers own update" on public.lesson_answers;
create policy "answers own update" on public.lesson_answers for update to authenticated
  using (auth.uid() = user_id or public.is_admin()) with check (true);
drop policy if exists "answers own delete" on public.lesson_answers;
create policy "answers own delete" on public.lesson_answers for delete to authenticated
  using (auth.uid() = user_id or public.is_admin());

create table if not exists public.answer_votes (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null references public.lesson_answers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  unique (answer_id, user_id)
);
grant select, insert, delete on public.answer_votes to authenticated;
grant all on public.answer_votes to service_role;
alter table public.answer_votes enable row level security;
drop policy if exists "votes own" on public.answer_votes;
create policy "votes own" on public.answer_votes for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.recount_answer_votes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.lesson_answers a
  set upvotes = (select count(*) from public.answer_votes v where v.answer_id = a.id)
  where a.id = coalesce(new.answer_id, old.answer_id);
  return null;
end $$;
drop trigger if exists answer_votes_recount on public.answer_votes;
create trigger answer_votes_recount after insert or delete on public.answer_votes
for each row execute function public.recount_answer_votes();

-- ---------------------------------------------------------------------
-- 7) Quizzes & assessments
-- ---------------------------------------------------------------------
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  content_id uuid references public.course_contents(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  pass_mark int not null default 50,
  time_limit_minutes int,
  max_attempts int not null default 3,
  created_at timestamptz not null default now()
);
grant select on public.quizzes to anon, authenticated;
grant insert, update, delete on public.quizzes to authenticated;
grant all on public.quizzes to service_role;
alter table public.quizzes enable row level security;
drop policy if exists "quizzes readable" on public.quizzes;
create policy "quizzes readable" on public.quizzes for select using (true);
drop policy if exists "quizzes owner write" on public.quizzes;
create policy "quizzes owner write" on public.quizzes for all to authenticated
  using (public.is_admin() or exists (select 1 from public.courses c where c.id = course_id and c.instructor_id = auth.uid()))
  with check (public.is_admin() or exists (select 1 from public.courses c where c.id = course_id and c.instructor_id = auth.uid()));

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  type text not null default 'mcq',          -- mcq | truefalse | short | fill
  prompt text not null,
  options jsonb not null default '[]'::jsonb,
  correct_answer text not null,
  points int not null default 1,
  position int not null default 0
);
grant select on public.quiz_questions to anon, authenticated;
grant insert, update, delete on public.quiz_questions to authenticated;
grant all on public.quiz_questions to service_role;
alter table public.quiz_questions enable row level security;
drop policy if exists "quiz questions readable" on public.quiz_questions;
create policy "quiz questions readable" on public.quiz_questions for select using (true);
drop policy if exists "quiz questions owner write" on public.quiz_questions;
create policy "quiz questions owner write" on public.quiz_questions for all to authenticated
  using (public.is_admin() or exists (
    select 1 from public.quizzes q join public.courses c on c.id = q.course_id
    where q.id = quiz_id and c.instructor_id = auth.uid()))
  with check (public.is_admin() or exists (
    select 1 from public.quizzes q join public.courses c on c.id = q.course_id
    where q.id = quiz_id and c.instructor_id = auth.uid()));

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score int not null default 0,
  total int not null default 0,
  passed boolean not null default false,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select, insert on public.quiz_attempts to authenticated;
grant all on public.quiz_attempts to service_role;
alter table public.quiz_attempts enable row level security;
drop policy if exists "attempts own" on public.quiz_attempts;
create policy "attempts own" on public.quiz_attempts for select to authenticated
  using (auth.uid() = user_id or public.is_admin() or exists (
    select 1 from public.quizzes q join public.courses c on c.id = q.course_id
    where q.id = quiz_id and c.instructor_id = auth.uid()));
drop policy if exists "attempts own insert" on public.quiz_attempts;
create policy "attempts own insert" on public.quiz_attempts for insert to authenticated with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 8) Assignments
-- ---------------------------------------------------------------------
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  content_id uuid references public.course_contents(id) on delete cascade,
  title text not null,
  instructions text,
  due_at timestamptz,
  created_at timestamptz not null default now()
);
grant select on public.assignments to anon, authenticated;
grant insert, update, delete on public.assignments to authenticated;
grant all on public.assignments to service_role;
alter table public.assignments enable row level security;
drop policy if exists "assignments readable" on public.assignments;
create policy "assignments readable" on public.assignments for select using (true);
drop policy if exists "assignments owner write" on public.assignments;
create policy "assignments owner write" on public.assignments for all to authenticated
  using (public.is_admin() or exists (select 1 from public.courses c where c.id = course_id and c.instructor_id = auth.uid()))
  with check (public.is_admin() or exists (select 1 from public.courses c where c.id = course_id and c.instructor_id = auth.uid()));

create table if not exists public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text,
  file_url text,
  grade numeric(5,2),
  feedback text,
  status text not null default 'submitted',  -- submitted | graded
  created_at timestamptz not null default now()
);
grant select, insert, update on public.assignment_submissions to authenticated;
grant all on public.assignment_submissions to service_role;
alter table public.assignment_submissions enable row level security;
drop policy if exists "submissions visible" on public.assignment_submissions;
create policy "submissions visible" on public.assignment_submissions for select to authenticated
  using (auth.uid() = user_id or public.is_admin() or exists (
    select 1 from public.assignments a join public.courses c on c.id = a.course_id
    where a.id = assignment_id and c.instructor_id = auth.uid()));
drop policy if exists "submissions own insert" on public.assignment_submissions;
create policy "submissions own insert" on public.assignment_submissions for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "submissions grade" on public.assignment_submissions;
create policy "submissions grade" on public.assignment_submissions for update to authenticated
  using (auth.uid() = user_id or public.is_admin() or exists (
    select 1 from public.assignments a join public.courses c on c.id = a.course_id
    where a.id = assignment_id and c.instructor_id = auth.uid()))
  with check (true);

-- ---------------------------------------------------------------------
-- 9) Wishlist & cart
-- ---------------------------------------------------------------------
create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  price_at_add numeric(10,2),
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);
grant select, insert, delete on public.wishlists to authenticated;
grant all on public.wishlists to service_role;
alter table public.wishlists enable row level security;
drop policy if exists "own wishlist" on public.wishlists;
create policy "own wishlist" on public.wishlists for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);
grant select, insert, delete on public.cart_items to authenticated;
grant all on public.cart_items to service_role;
alter table public.cart_items enable row level security;
drop policy if exists "own cart" on public.cart_items;
create policy "own cart" on public.cart_items for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 10) Instructor side: applications, payouts
-- ---------------------------------------------------------------------
create table if not exists public.instructor_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  bio text,
  photo_url text,
  expertise text,
  status text not null default 'pending',      -- pending | approved | rejected
  commission_rate int not null default 70,      -- instructor share, %
  payout_method text,                           -- bkash | bank
  payout_account text,
  created_at timestamptz not null default now()
);
grant select on public.instructor_profiles to anon, authenticated;
grant insert, update on public.instructor_profiles to authenticated;
grant all on public.instructor_profiles to service_role;
alter table public.instructor_profiles enable row level security;
drop policy if exists "instructors readable" on public.instructor_profiles;
create policy "instructors readable" on public.instructor_profiles for select using (true);
drop policy if exists "instructor own insert" on public.instructor_profiles;
create policy "instructor own insert" on public.instructor_profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "instructor own update" on public.instructor_profiles;
create policy "instructor own update" on public.instructor_profiles for update to authenticated
  using (auth.uid() = id or public.is_admin()) with check (true);

create table if not exists public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null,
  method text not null default 'bkash',
  account text,
  status text not null default 'pending',      -- pending | approved | paid | rejected
  admin_note text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
grant select, insert on public.payout_requests to authenticated;
grant update on public.payout_requests to authenticated;
grant all on public.payout_requests to service_role;
alter table public.payout_requests enable row level security;
drop policy if exists "payouts visible" on public.payout_requests;
create policy "payouts visible" on public.payout_requests for select to authenticated
  using (auth.uid() = instructor_id or public.is_admin());
drop policy if exists "payouts own insert" on public.payout_requests;
create policy "payouts own insert" on public.payout_requests for insert to authenticated with check (auth.uid() = instructor_id);
drop policy if exists "payouts admin update" on public.payout_requests;
create policy "payouts admin update" on public.payout_requests for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 11) Payments: invoices, refunds, coupons
-- ---------------------------------------------------------------------
create sequence if not exists public.invoice_number_seq start 1000;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_no text not null default ('INV-' || nextval('public.invoice_number_seq')),
  user_id uuid references auth.users(id) on delete set null,
  course_id uuid references public.courses(id) on delete set null,
  request_id uuid,
  full_name text,
  email text,
  amount numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  coupon_code text,
  method text not null default 'bkash',
  transaction_id text,
  status text not null default 'paid',        -- paid | refunded
  created_at timestamptz not null default now()
);
grant select, insert on public.invoices to authenticated;
grant update on public.invoices to authenticated;
grant all on public.invoices to service_role;
alter table public.invoices enable row level security;
drop policy if exists "invoices visible" on public.invoices;
create policy "invoices visible" on public.invoices for select to authenticated
  using (auth.uid() = user_id or public.is_admin());
drop policy if exists "invoices insert" on public.invoices;
create policy "invoices insert" on public.invoices for insert to authenticated with check (true);
drop policy if exists "invoices admin update" on public.invoices;
create policy "invoices admin update" on public.invoices for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create table if not exists public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  course_id uuid references public.courses(id) on delete set null,
  reason text not null,
  status text not null default 'pending',     -- pending | approved | rejected
  admin_note text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
grant select, insert on public.refund_requests to authenticated;
grant update on public.refund_requests to authenticated;
grant all on public.refund_requests to service_role;
alter table public.refund_requests enable row level security;
drop policy if exists "refunds visible" on public.refund_requests;
create policy "refunds visible" on public.refund_requests for select to authenticated
  using (auth.uid() = user_id or public.is_admin());
drop policy if exists "refunds own insert" on public.refund_requests;
create policy "refunds own insert" on public.refund_requests for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "refunds admin update" on public.refund_requests;
create policy "refunds admin update" on public.refund_requests for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  course_id uuid references public.courses(id) on delete cascade,
  discount_type text not null default 'percent',  -- percent | flat
  discount_value numeric(10,2) not null,
  expires_at timestamptz,
  usage_limit int,
  used_count int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.coupons to anon, authenticated;
grant update on public.coupons to anon, authenticated;
grant all on public.coupons to service_role;
alter table public.coupons enable row level security;
drop policy if exists "coupons readable" on public.coupons;
create policy "coupons readable" on public.coupons for select using (is_active or public.is_admin());
drop policy if exists "coupons admin write" on public.coupons;
create policy "coupons admin write" on public.coupons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 12) Subscriptions & bulk/team enrollment
-- ---------------------------------------------------------------------
create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  interval text not null default 'monthly',  -- monthly | yearly
  price numeric(10,2) not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.subscription_plans to anon, authenticated;
grant all on public.subscription_plans to service_role;
alter table public.subscription_plans enable row level security;
drop policy if exists "plans readable" on public.subscription_plans;
create policy "plans readable" on public.subscription_plans for select using (true);
drop policy if exists "plans admin write" on public.subscription_plans;
create policy "plans admin write" on public.subscription_plans for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid references public.subscription_plans(id) on delete set null,
  status text not null default 'pending',    -- pending | active | cancelled | expired
  auto_renew boolean not null default true,
  transaction_id text,
  started_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
alter table public.subscriptions enable row level security;
drop policy if exists "subs visible" on public.subscriptions;
create policy "subs visible" on public.subscriptions for select to authenticated
  using (auth.uid() = user_id or public.is_admin());
drop policy if exists "subs own insert" on public.subscriptions;
create policy "subs own insert" on public.subscriptions for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "subs update" on public.subscriptions;
create policy "subs update" on public.subscriptions for update to authenticated
  using (auth.uid() = user_id or public.is_admin()) with check (true);

create table if not exists public.bulk_orders (
  id uuid primary key default gen_random_uuid(),
  buyer_user_id uuid references auth.users(id) on delete set null,
  company_name text,
  contact_email text not null,
  course_id uuid references public.courses(id) on delete set null,
  seats int not null default 1,
  status text not null default 'pending',
  transaction_id text,
  created_at timestamptz not null default now()
);
grant select, insert on public.bulk_orders to anon, authenticated;
grant update on public.bulk_orders to authenticated;
grant all on public.bulk_orders to service_role;
alter table public.bulk_orders enable row level security;
drop policy if exists "bulk insert" on public.bulk_orders;
create policy "bulk insert" on public.bulk_orders for insert with check (true);
drop policy if exists "bulk visible" on public.bulk_orders;
create policy "bulk visible" on public.bulk_orders for select to authenticated
  using (auth.uid() = buyer_user_id or public.is_admin());
drop policy if exists "bulk admin update" on public.bulk_orders;
create policy "bulk admin update" on public.bulk_orders for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create table if not exists public.seat_invites (
  id uuid primary key default gen_random_uuid(),
  bulk_order_id uuid not null references public.bulk_orders(id) on delete cascade,
  email text not null,
  status text not null default 'invited',   -- invited | claimed
  created_at timestamptz not null default now()
);
grant select, insert, update on public.seat_invites to authenticated;
grant all on public.seat_invites to service_role;
alter table public.seat_invites enable row level security;
drop policy if exists "seats visible" on public.seat_invites;
create policy "seats visible" on public.seat_invites for select to authenticated
  using (public.is_admin() or exists (select 1 from public.bulk_orders b where b.id = bulk_order_id and b.buyer_user_id = auth.uid()));
drop policy if exists "seats write" on public.seat_invites;
create policy "seats write" on public.seat_invites for all to authenticated
  using (public.is_admin() or exists (select 1 from public.bulk_orders b where b.id = bulk_order_id and b.buyer_user_id = auth.uid()))
  with check (public.is_admin() or exists (select 1 from public.bulk_orders b where b.id = bulk_order_id and b.buyer_user_id = auth.uid()));

-- ---------------------------------------------------------------------
-- 13) Announcements & notifications
-- ---------------------------------------------------------------------
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);
grant select on public.announcements to anon, authenticated;
grant insert, update, delete on public.announcements to authenticated;
grant all on public.announcements to service_role;
alter table public.announcements enable row level security;
drop policy if exists "announcements readable" on public.announcements;
create policy "announcements readable" on public.announcements for select using (true);
drop policy if exists "announcements owner write" on public.announcements;
create policy "announcements owner write" on public.announcements for all to authenticated
  using (public.is_admin() or auth.uid() = author_id) with check (public.is_admin() or auth.uid() = author_id);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
drop policy if exists "own notifications" on public.notifications;
create policy "own notifications" on public.notifications for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "notifications insert" on public.notifications;
create policy "notifications insert" on public.notifications for insert to authenticated with check (true);
drop policy if exists "own notifications update" on public.notifications;
create policy "own notifications update" on public.notifications for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 14) Marketing: newsletter, referrals, FAQ
-- ---------------------------------------------------------------------
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);
grant insert on public.newsletter_subscribers to anon, authenticated;
grant select on public.newsletter_subscribers to authenticated;
grant all on public.newsletter_subscribers to service_role;
alter table public.newsletter_subscribers enable row level security;
drop policy if exists "newsletter signup" on public.newsletter_subscribers;
create policy "newsletter signup" on public.newsletter_subscribers for insert with check (true);
drop policy if exists "newsletter admin read" on public.newsletter_subscribers;
create policy "newsletter admin read" on public.newsletter_subscribers for select to authenticated using (public.is_admin());

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null unique,
  clicks int not null default 0,
  commission_rate int not null default 10,
  created_at timestamptz not null default now()
);
grant select on public.referrals to anon, authenticated;
grant insert, update on public.referrals to authenticated;
grant all on public.referrals to service_role;
alter table public.referrals enable row level security;
drop policy if exists "referrals readable" on public.referrals;
create policy "referrals readable" on public.referrals for select using (true);
drop policy if exists "referrals own write" on public.referrals;
create policy "referrals own write" on public.referrals for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "referrals own update" on public.referrals;
create policy "referrals own update" on public.referrals for update to authenticated using (true) with check (true);

create table if not exists public.referral_commissions (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  amount numeric(10,2) not null default 0,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
grant select on public.referral_commissions to authenticated;
grant insert, update on public.referral_commissions to authenticated;
grant all on public.referral_commissions to service_role;
alter table public.referral_commissions enable row level security;
drop policy if exists "commissions visible" on public.referral_commissions;
create policy "commissions visible" on public.referral_commissions for select to authenticated
  using (public.is_admin() or exists (select 1 from public.referrals r where r.id = referral_id and r.user_id = auth.uid()));
drop policy if exists "commissions write" on public.referral_commissions;
create policy "commissions write" on public.referral_commissions for all to authenticated
  using (public.is_admin()) with check (true);

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  position int not null default 0,
  is_active boolean not null default true
);
grant select on public.faqs to anon, authenticated;
grant all on public.faqs to service_role;
alter table public.faqs enable row level security;
drop policy if exists "faqs readable" on public.faqs;
create policy "faqs readable" on public.faqs for select using (true);
drop policy if exists "faqs admin write" on public.faqs;
create policy "faqs admin write" on public.faqs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 15) Reviews: per-course + editable by the author
-- ---------------------------------------------------------------------
alter table public.reviews add column if not exists course_id uuid references public.courses(id) on delete cascade;
grant update on public.reviews to authenticated;
drop policy if exists "users edit own review" on public.reviews;
create policy "users edit own review" on public.reviews for update to authenticated
  using (auth.uid() = user_id or public.is_admin()) with check (true);

-- ---------------------------------------------------------------------
-- 16) Homepage management defaults
-- ---------------------------------------------------------------------
insert into public.site_settings (key, value) values
  ('hero_banner_url', ''),
  ('hero_cta_text', ''),
  ('hero_cta_link', ''),
  ('refund_policy_days', '7'),
  ('platform_commission', '30')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- 17) Helpful indexes
-- ---------------------------------------------------------------------
create index if not exists idx_progress_user_course on public.lesson_progress (user_id, course_id);
create index if not exists idx_notes_user_course on public.lesson_notes (user_id, course_id);
create index if not exists idx_questions_content on public.lesson_questions (content_id);
create index if not exists idx_answers_question on public.lesson_answers (question_id);
create index if not exists idx_contents_course_pos on public.course_contents (course_id, position);
create index if not exists idx_courses_instructor on public.courses (instructor_id);
create index if not exists idx_invoices_user on public.invoices (user_id);

-- =====================================================================
-- Done. Grant yourself admin once (replace the email):
--   insert into public.user_roles (user_id, role)
--   select id, 'admin' from auth.users where email = 'adel111@gmail.com'
--   on conflict do nothing;
-- =====================================================================
