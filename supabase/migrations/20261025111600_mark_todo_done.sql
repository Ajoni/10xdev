alter table public.todos add column completed_at timestamptz;

revoke update on table public.todos from anon, authenticated;
grant update (completed_at) on table public.todos to authenticated;

create policy "todos_update_own_open"
on public.todos
for update
to authenticated
using (user_id = auth.uid() and completed_at is null)
with check (user_id = auth.uid() and completed_at is not null);
