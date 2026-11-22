-- Residents may set their program once; after that only an admin can change it.
-- This stops someone switching programs to read another program's posts.
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
as $$
begin
  -- auth.uid() is null when run from the Supabase SQL editor.
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Only an admin can change roles';
    end if;
    if old.program is not null and new.program is distinct from old.program then
      raise exception 'Ask the site admin to change your program';
    end if;
  end if;
  return new;
end;
$$;

-- Readers cannot see other people's profiles, so store the author's display name on the post.
alter table public.posts add column if not exists author_name text;
