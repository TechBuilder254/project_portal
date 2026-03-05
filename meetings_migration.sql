-- ============================================
-- MEETING TRACKING SYSTEM - DATABASE SCHEMA
-- ============================================

-----------------------------
-- ENUM TYPES
-----------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'meeting_status') then
    create type meeting_status as enum (
      'scheduled',      -- Meeting created, waiting for time
      'in_progress',    -- Meeting time window active
      'completed',      -- Meeting finished
      'cancelled',      -- Cancelled by supervisor
      'missed'          -- Student didn't check in
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'attendance_status') then
    create type attendance_status as enum (
      'pending',        -- Not checked in yet
      'checked_in',     -- Student checked in
      'confirmed',      -- Supervisor confirmed attendance
      'disputed',       -- Supervisor disputes attendance
      'missed'          -- No check-in during window
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'recap_status') then
    create type recap_status as enum (
      'draft',          -- Student is writing
      'submitted',      -- Student submitted, awaiting review
      'approved',       -- Supervisor approved
      'rejected',       -- Supervisor rejected, needs revision
      'revised'         -- Student revised after rejection
    );
  end if;
end$$;

-----------------------------
-- TABLE: meetings
-----------------------------
create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  supervisor_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  
  -- Meeting details
  title text not null,
  description text,
  scheduled_at timestamptz not null,
  duration_minutes integer default 60,
  location text,
  meeting_type text, -- e.g., 'progress_review', 'guidance', 'milestone_check'
  
  -- Status tracking
  status meeting_status not null default 'scheduled',
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_meetings_supervisor on public.meetings(supervisor_id);
create index if not exists idx_meetings_student on public.meetings(student_id);
create index if not exists idx_meetings_scheduled_at on public.meetings(scheduled_at);
create index if not exists idx_meetings_status on public.meetings(status);

alter table public.meetings enable row level security;

-- Students can see their own meetings
create policy "Students can see their meetings"
  on public.meetings
  for select
  to authenticated
  using (student_id = auth.uid());

-- Supervisors can see meetings they created
create policy "Supervisors can see their meetings"
  on public.meetings
  for select
  to authenticated
  using (supervisor_id = auth.uid());

-- Admins can see all meetings
create policy "Admins can see all meetings"
  on public.meetings
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Only supervisors can create meetings for their assigned students
create policy "Supervisors can create meetings"
  on public.meetings
  for insert
  to authenticated
  with check (
    supervisor_id = auth.uid()
    and exists (
      select 1
      from public.supervisor_assignments sa
      where sa.student_id = meetings.student_id
        and sa.supervisor_id = auth.uid()
    )
  );

-- Supervisors can update their meetings
create policy "Supervisors can update their meetings"
  on public.meetings
  for update
  to authenticated
  using (supervisor_id = auth.uid())
  with check (supervisor_id = auth.uid());

-- Supervisors can delete their meetings
create policy "Supervisors can delete their meetings"
  on public.meetings
  for delete
  to authenticated
  using (supervisor_id = auth.uid());

-----------------------------
-- TABLE: meeting_attendance
-----------------------------
create table if not exists public.meeting_attendance (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  
  -- Check-in details
  checked_in_at timestamptz,
  check_in_location jsonb, -- {lat, lng, address} for geolocation
  check_in_ip text, -- Additional verification
  
  -- Attendance status
  attendance_status attendance_status not null default 'pending',
  
  -- Supervisor verification
  supervisor_confirmed_at timestamptz,
  supervisor_confirmed_by uuid references public.profiles(id),
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Ensure one attendance record per meeting
  unique(meeting_id)
);

create index if not exists idx_attendance_meeting on public.meeting_attendance(meeting_id);
create index if not exists idx_attendance_student on public.meeting_attendance(student_id);
create index if not exists idx_attendance_status on public.meeting_attendance(attendance_status);

alter table public.meeting_attendance enable row level security;

-- Students can see their own attendance records
create policy "Students can see their attendance"
  on public.meeting_attendance
  for select
  to authenticated
  using (student_id = auth.uid());

-- Supervisors can see attendance for their meetings
create policy "Supervisors can see attendance"
  on public.meeting_attendance
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.meetings m
      where m.id = meeting_attendance.meeting_id
        and m.supervisor_id = auth.uid()
    )
  );

-- Admins can see all attendance
create policy "Admins can see all attendance"
  on public.meeting_attendance
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Students can insert/update their own check-ins
create policy "Students can check in"
  on public.meeting_attendance
  for insert
  to authenticated
  with check (student_id = auth.uid());

create policy "Students can update their check-in"
  on public.meeting_attendance
  for update
  to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- Supervisors can update attendance status (confirm/dispute)
create policy "Supervisors can confirm attendance"
  on public.meeting_attendance
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.meetings m
      where m.id = meeting_attendance.meeting_id
        and m.supervisor_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.meetings m
      where m.id = meeting_attendance.meeting_id
        and m.supervisor_id = auth.uid()
    )
  );

-----------------------------
-- TABLE: meeting_recaps
-----------------------------
create table if not exists public.meeting_recaps (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  
  -- Recap content
  summary text not null,
  topics_discussed text not null,
  action_items text,
  next_steps text,
  student_notes text,
  
  -- Status
  recap_status recap_status not null default 'draft',
  
  -- Supervisor review
  supervisor_approved_at timestamptz,
  supervisor_approved_by uuid references public.profiles(id),
  supervisor_feedback text,
  supervisor_rating integer check (supervisor_rating between 1 and 5),
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Ensure one recap per meeting
  unique(meeting_id)
);

create index if not exists idx_recaps_meeting on public.meeting_recaps(meeting_id);
create index if not exists idx_recaps_student on public.meeting_recaps(student_id);
create index if not exists idx_recaps_status on public.meeting_recaps(recap_status);

alter table public.meeting_recaps enable row level security;

-- Students can see their own recaps
create policy "Students can see their recaps"
  on public.meeting_recaps
  for select
  to authenticated
  using (student_id = auth.uid());

-- Supervisors can see recaps for their meetings
create policy "Supervisors can see recaps"
  on public.meeting_recaps
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.meetings m
      where m.id = meeting_recaps.meeting_id
        and m.supervisor_id = auth.uid()
    )
  );

-- Admins can see all recaps
create policy "Admins can see all recaps"
  on public.meeting_recaps
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Students can insert/update their own recaps
create policy "Students can create recaps"
  on public.meeting_recaps
  for insert
  to authenticated
  with check (student_id = auth.uid());

create policy "Students can update their recaps"
  on public.meeting_recaps
  for update
  to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- Supervisors can update recap status (approve/reject)
create policy "Supervisors can review recaps"
  on public.meeting_recaps
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.meetings m
      where m.id = meeting_recaps.meeting_id
        and m.supervisor_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.meetings m
      where m.id = meeting_recaps.meeting_id
        and m.supervisor_id = auth.uid()
    )
  );

-----------------------------
-- TABLE: meeting_feedback
-----------------------------
create table if not exists public.meeting_feedback (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  supervisor_id uuid not null references public.profiles(id) on delete cascade,
  
  -- Feedback content
  remarks text not null,
  overall_rating integer check (overall_rating between 1 and 5),
  meeting_quality text, -- 'excellent', 'good', 'fair', 'poor'
  
  -- Action items for student
  action_items_for_student text,
  deadline_for_actions timestamptz,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Ensure one feedback per meeting
  unique(meeting_id)
);

create index if not exists idx_feedback_meeting on public.meeting_feedback(meeting_id);
create index if not exists idx_feedback_supervisor on public.meeting_feedback(supervisor_id);

alter table public.meeting_feedback enable row level security;

-- Students can see feedback for their meetings
create policy "Students can see feedback"
  on public.meeting_feedback
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.meetings m
      where m.id = meeting_feedback.meeting_id
        and m.student_id = auth.uid()
    )
  );

-- Supervisors can see their own feedback
create policy "Supervisors can see their feedback"
  on public.meeting_feedback
  for select
  to authenticated
  using (supervisor_id = auth.uid());

-- Admins can see all feedback
create policy "Admins can see all feedback"
  on public.meeting_feedback
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Only supervisors can create/update feedback for their meetings
create policy "Supervisors can create feedback"
  on public.meeting_feedback
  for insert
  to authenticated
  with check (
    supervisor_id = auth.uid()
    and exists (
      select 1
      from public.meetings m
      where m.id = meeting_feedback.meeting_id
        and m.supervisor_id = auth.uid()
    )
  );

create policy "Supervisors can update feedback"
  on public.meeting_feedback
  for update
  to authenticated
  using (supervisor_id = auth.uid())
  with check (supervisor_id = auth.uid());

-----------------------------
-- FUNCTION: Update updated_at timestamp
-----------------------------
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Add triggers for updated_at
drop trigger if exists update_meetings_updated_at on public.meetings;
create trigger update_meetings_updated_at
  before update on public.meetings
  for each row
  execute function update_updated_at_column();

drop trigger if exists update_attendance_updated_at on public.meeting_attendance;
create trigger update_attendance_updated_at
  before update on public.meeting_attendance
  for each row
  execute function update_updated_at_column();

drop trigger if exists update_recaps_updated_at on public.meeting_recaps;
create trigger update_recaps_updated_at
  before update on public.meeting_recaps
  for each row
  execute function update_updated_at_column();

drop trigger if exists update_feedback_updated_at on public.meeting_feedback;
create trigger update_feedback_updated_at
  before update on public.meeting_feedback
  for each row
  execute function update_updated_at_column();

-- DONE
