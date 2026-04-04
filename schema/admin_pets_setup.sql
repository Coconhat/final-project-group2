-- School project setup for admin pet CRUD + image upload.
-- Run this in Supabase SQL Editor.

-- 1) Ensure pets has a pet_type field used by the admin dropdown.
alter table public.pets
  add column if not exists pet_type text;

-- Optional: constrain pet_type values.
do $$
begin
  begin
    alter table public.pets
      add constraint pets_pet_type_check
      check (pet_type in ('Dog', 'Cat', 'Bird', 'Other'));
  exception
    when duplicate_object then
      null;
  end;
end
$$;

-- 2) Create a public storage bucket for pet images.
insert into storage.buckets (id, name, public)
values ('pet-images', 'pet-images', true)
on conflict (id) do nothing;

-- 3) Storage policies so authenticated users can upload/update/delete images.
-- (Needed to fix: "new row violates row-level security policy" during upload)

drop policy if exists "pet_images_public_read" on storage.objects;
create policy "pet_images_public_read"
on storage.objects
for select
to public
using (bucket_id = 'pet-images');

drop policy if exists "pet_images_auth_insert" on storage.objects;
create policy "pet_images_auth_insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'pet-images');

drop policy if exists "pet_images_auth_update" on storage.objects;
create policy "pet_images_auth_update"
on storage.objects
for update
to authenticated
using (bucket_id = 'pet-images')
with check (bucket_id = 'pet-images');

drop policy if exists "pet_images_auth_delete" on storage.objects;
create policy "pet_images_auth_delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'pet-images');

-- 4) For school project speed: let authenticated users manage pets.
-- If you already disabled RLS on pets, this is not required.
alter table public.pets enable row level security;

drop policy if exists "pets_auth_select" on public.pets;
create policy "pets_auth_select"
on public.pets
for select
to authenticated
using (true);

drop policy if exists "pets_auth_insert" on public.pets;
create policy "pets_auth_insert"
on public.pets
for insert
to authenticated
with check (true);

drop policy if exists "pets_auth_update" on public.pets;
create policy "pets_auth_update"
on public.pets
for update
to authenticated
using (true)
with check (true);

drop policy if exists "pets_auth_delete" on public.pets;
create policy "pets_auth_delete"
on public.pets
for delete
to authenticated
using (true);
