-- Telefoonnummer kolom op contact_messages
alter table public.contact_messages
  add column if not exists phone text;

-- Bijlagen-tabel: foto's bij contact-formulier
create table if not exists public.contact_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.contact_messages(id) on delete cascade,
  storage_path text not null,
  filename text not null,
  content_type text,
  size_bytes int,
  created_at timestamptz not null default now()
);

create index if not exists contact_attachments_message_id_idx
  on public.contact_attachments(message_id);

alter table public.contact_attachments enable row level security;

create policy "contact_attachments: anyone can insert"
  on public.contact_attachments for insert
  with check (true);

create policy "contact_attachments: admin read"
  on public.contact_attachments for select
  using (public.is_admin());

create policy "contact_attachments: admin delete"
  on public.contact_attachments for delete
  using (public.is_admin());

-- Storage bucket 'contact-attachments' (manueel aanmaken via Dashboard, PRIVATE)
create policy "contact-attachments: insert"
  on storage.objects for insert
  with check (bucket_id = 'contact-attachments');

create policy "contact-attachments: admin read"
  on storage.objects for select
  using (bucket_id = 'contact-attachments' and public.is_admin());

create policy "contact-attachments: admin delete"
  on storage.objects for delete
  using (bucket_id = 'contact-attachments' and public.is_admin());
