
-- Reset Schema (For development phase flexibility - CAUTION: Deletes all data)
drop schema public cascade;
create schema public;
grant all on schema public to postgres;
grant all on schema public to public;

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Classes Table (Defines the structure: e.g., Middle 1, High 2-1)
create table public.classes (
  id uuid primary key default uuid_generate_v4(),
  grade text not null, -- 'Middle', 'High'
  name text not null,  -- '1반', '2반', '사랑반'
  teacher_id uuid references public.teachers(id) on delete set null,
  teacher_name text, -- Direct input or synced name
  created_at timestamptz default now()
);

-- 2. Students Table (Students are assigned to a class)
create table public.students (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  class_id uuid references public.classes(id) on delete set null, -- Null implies "Unassigned"
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 3. Teachers Table (Staff management)
create table public.teachers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  role text not null, -- 'Teacher', 'Staff'
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 4. Worship Logs Table (Header info)
create table public.worship_logs (
  id uuid primary key default uuid_generate_v4(),
  date date not null unique,
  prayer text,
  prayer_role text, -- '학생', '교사', '부장' etc.
  sermon_title text,
  sermon_text text,
  preacher text,
  coupon_recipient_count int default 0,
  coupons_per_person int default 0,
  created_at timestamptz default now()
);

-- 5. Student Attendance (Links Log + Student)
create table public.attendance (
  id uuid primary key default uuid_generate_v4(),
  log_id uuid references public.worship_logs(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  status text not null, -- 'present'
  created_at timestamptz default now(),
  unique(log_id, student_id)
);

-- 6. Teacher Attendance
create table public.teacher_attendance (
  id uuid primary key default uuid_generate_v4(),
  log_id uuid references public.worship_logs(id) on delete cascade,
  teacher_id uuid references public.teachers(id) on delete cascade,
  is_present boolean default true,
  created_at timestamptz default now(),
  unique(log_id, teacher_id)
);

-- 7. Offerings
create table public.offerings (
  id uuid primary key default uuid_generate_v4(),
  log_id uuid references public.worship_logs(id) on delete cascade,
  type text not null, 
  amount int default 0,
  memo text,
  created_at timestamptz default now()
);

-- RLS Policies (Open Access for MVP)
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.teachers enable row level security;
alter table public.worship_logs enable row level security;
alter table public.attendance enable row level security;
alter table public.teacher_attendance enable row level security;
alter table public.offerings enable row level security;

create policy "Allow public access" on public.classes for all using (true);
create policy "Allow public access" on public.students for all using (true);
create policy "Allow public access" on public.teachers for all using (true);
create policy "Allow public access" on public.worship_logs for all using (true);
create policy "Allow public access" on public.attendance for all using (true);
create policy "Allow public access" on public.teacher_attendance for all using (true);
create policy "Allow public access" on public.offerings for all using (true);

-- Initial Data Seeding (Optional: Default Classes)
insert into public.classes (grade, name) values 
('Middle', '1반'), ('Middle', '2반'), ('Middle', '3반'),
('High', '1반'), ('High', '2반'), ('High', '3반');
