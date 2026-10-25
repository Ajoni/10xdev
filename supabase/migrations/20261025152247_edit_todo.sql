grant update (description, complexity, deadline) on table public.todos to authenticated;

create policy "todos_update_own_open_content"
on public.todos
for update
to authenticated
using (user_id = auth.uid() and completed_at is null)
with check (user_id = auth.uid() and completed_at is null);
