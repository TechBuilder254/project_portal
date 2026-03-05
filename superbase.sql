-- Enable UUIDs if not already enabled
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-----------------------------
-- ENUM TYPES
-----------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('student', 'supervisor', 'admin');
  end if;

  if not exists (select 1 from pg_type where typname = 'submission_status') then
    create type submission_status as enum ('pending', 'reviewed', 'changes_requested');
  end if;

  if not exists (select 1 from pg_type where typname = 'feedback_action') then
    create type feedback_action as enum ('approved', 'revise');
  end if;
end$$;

-----------------------------
-- TABLE: profiles
-----------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role user_role not null,
  department text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Allow anyone logged in to see profiles (basic directory)
create policy "Profiles are readable by authenticated users"
  on public.profiles
  for select
  to authenticated
  using (true);

-- Users can insert their own profile row
create policy "Users can insert their own profile"
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

-- Users can update only their own profile
create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-----------------------------
-- TABLE: supervisor_assignments
-----------------------------
create table if not exists public.supervisor_assignments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  supervisor_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_supervisor_assignments_student
  on public.supervisor_assignments (student_id);

create index if not exists idx_supervisor_assignments_supervisor
  on public.supervisor_assignments (supervisor_id);

alter table public.supervisor_assignments enable row level security;

-- Everyone authenticated can read assignments (UI restricts who sees what)
create policy "Assignments readable by authenticated"
  on public.supervisor_assignments
  for select
  to authenticated
  using (true);

-- Only admins can insert/update/delete assignments
create policy "Admins manage assignments insert"
  on public.supervisor_assignments
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Admins manage assignments update"
  on public.supervisor_assignments
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Admins manage assignments delete"
  on public.supervisor_assignments
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-----------------------------
-- TABLE: submissions
-----------------------------
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  file_url text not null,
  status submission_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists idx_submissions_student
  on public.submissions (student_id);

create index if not exists idx_submissions_status
  on public.submissions (status);

alter table public.submissions enable row level security;

-- Students see their own submissions
create policy "Students can see their own submissions"
  on public.submissions
  for select
  to authenticated
  using (student_id = auth.uid());

-- Supervisors see submissions of their assigned students
create policy "Supervisors see submissions of assigned students"
  on public.submissions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.supervisor_assignments sa
      where sa.student_id = submissions.student_id
        and sa.supervisor_id = auth.uid()
    )
  );

-- Admins see all submissions
create policy "Admins see all submissions"
  on public.submissions
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Students can insert submissions for themselves
create policy "Students insert their own submissions"
  on public.submissions
  for insert
  to authenticated
  with check (student_id = auth.uid());

-- No direct updates/deletes from clients (status changes via serverless logic or feedback insert)
-- If you want to allow, you can add policies later.

-----------------------------
-- TABLE: feedback
-----------------------------
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  supervisor_id uuid not null references public.profiles(id) on delete cascade,
  comment text not null,
  rating int not null check (rating between 1 and 5),
  action feedback_action not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_feedback_submission
  on public.feedback (submission_id);

create index if not exists idx_feedback_supervisor
  on public.feedback (supervisor_id);

alter table public.feedback enable row level security;

-- Students, their supervisors, and admins can read feedback
create policy "Feedback readable for related users"
  on public.feedback
  for select
  to authenticated
  using (
    -- Student who owns the submission
    exists (
      select 1
      from public.submissions s
      where s.id = feedback.submission_id
        and s.student_id = auth.uid()
    )
    or
    -- Supervisor who created the feedback
    supervisor_id = auth.uid()
    or
    -- Admin
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Only supervisors can insert feedback for submissions of their assigned students
create policy "Supervisors can insert feedback"
  on public.feedback
  for insert
  to authenticated
  with check (
    supervisor_id = auth.uid()
    and exists (
      select 1
      from public.supervisor_assignments sa
      join public.submissions s
        on s.student_id = sa.student_id
      where s.id = feedback.submission_id
        and sa.supervisor_id = auth.uid()
    )
  );

-----------------------------
-- STORAGE BUCKET FOR FILES
-----------------------------
-- Run this in the "SQL" editor, not inside a transaction block if it errors.
-- This creates a bucket named 'submissions' that the React app uses.
insert into storage.buckets (id, name, public)
values ('submissions', 'submissions', true)
on conflict (id) do nothing;

-- Optionally add stricter RLS policies on storage.objects later.
-- For now, bucket is public, and the app only needs the public URL.

-- DONE