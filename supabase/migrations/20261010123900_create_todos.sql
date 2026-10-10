create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  description text not null,
  complexity smallint not null,
  deadline timestamptz not null,
  created_at timestamptz not null default now(),
  constraint todos_description_trimmed_nonblank check (
    description = btrim(description)
    and description <> ''
  ),
  constraint todos_complexity_range check (complexity between 1 and 5)
);

alter table public.todos enable row level security;

create policy "todos_select_own"
on public.todos
for select
to authenticated
using (user_id = auth.uid());

create policy "todos_insert_own"
on public.todos
for insert
to authenticated
with check (user_id = auth.uid());

create index todos_user_id_deadline_complexity_created_at_idx
on public.todos (user_id, deadline, complexity, created_at);
