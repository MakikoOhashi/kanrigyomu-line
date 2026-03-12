create extension if not exists pgcrypto;

create table if not exists public.kanrigyomu_users (
  id uuid primary key default gen_random_uuid(),
  line_user_id text not null unique,
  created_at timestamptz not null default now(),
  current_block int not null default 1 check (current_block >= 1),
  cursor_in_block int not null default 1 check (cursor_in_block >= 1),
  streak_count int not null default 0 check (streak_count >= 0),
  last_answer_date date,
  locale text not null default 'ja',
  exam_type text not null default 'kanrigyomu',
  plan text not null default 'free',
  is_paid boolean not null default false,
  timezone text not null default 'Asia/Tokyo',
  last_sent_date date,
  roadmap_last_sent_date date,
  roadmap_cycle_count int not null default 0 check (roadmap_cycle_count >= 0),
  active boolean not null default true
);

create table if not exists public.kanrigyomu_questions (
  id uuid primary key default gen_random_uuid(),
  block_number int not null check (block_number >= 1),
  order_index int not null check (order_index >= 1),
  exam_type text not null default 'kanrigyomu',
  difficulty int not null default 1 check (difficulty between 1 and 5),
  tags text[] not null default '{}'::text[],
  stem text not null,
  c1 text not null,
  c2 text not null,
  c3 text not null,
  c4 text not null,
  correct int not null check (correct between 1 and 4),
  explanation text not null,
  created_at timestamptz not null default now(),
  unique (block_number, order_index)
);

create table if not exists public.kanrigyomu_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.kanrigyomu_users(id) on delete cascade,
  question_id uuid not null references public.kanrigyomu_questions(id) on delete cascade,
  selected int not null check (selected between 1 and 4),
  is_correct boolean not null,
  answered_at timestamptz not null default now()
);

create index if not exists idx_kanrigyomu_answers_user_answered_at on public.kanrigyomu_answers(user_id, answered_at desc);

create table if not exists public.kanrigyomu_daily_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.kanrigyomu_users(id) on delete cascade,
  date date not null,
  question_id uuid references public.kanrigyomu_questions(id) on delete set null,
  sent_at timestamptz,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists idx_kanrigyomu_questions_block_order on public.kanrigyomu_questions(block_number, order_index);
create index if not exists idx_kanrigyomu_users_exam_type on public.kanrigyomu_users(exam_type);
create index if not exists idx_kanrigyomu_questions_exam_type_block_order on public.kanrigyomu_questions(exam_type, block_number, order_index);
create index if not exists idx_kanrigyomu_questions_tags on public.kanrigyomu_questions using gin(tags);
