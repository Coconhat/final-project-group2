create extension if not exists pgcrypto;

create table if not exists public.adoption_request_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.adoption_requests(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists adoption_request_messages_request_id_idx
  on public.adoption_request_messages(request_id);

create index if not exists adoption_request_messages_created_at_idx
  on public.adoption_request_messages(created_at);

-- Add table to Supabase Realtime publication if not already added.
do $$
begin
  begin
    alter publication supabase_realtime add table public.adoption_request_messages;
  exception
    when duplicate_object then
      null;
  end;
end
$$;
