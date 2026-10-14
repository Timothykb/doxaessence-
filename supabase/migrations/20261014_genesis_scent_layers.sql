begin;
create table public.scent_layers (
  slug text primary key check (slug in ('light','life','earth')),
  number text not null,
  stage text not null,
  title text not null,
  notes text not null,
  copy text not null
);
alter table public.scent_layers enable row level security;
revoke all on public.scent_layers from anon, authenticated;
grant select on public.scent_layers to anon, authenticated;
create policy "Read published fragrance notes" on public.scent_layers for select to anon, authenticated using (true);
insert into public.scent_layers values
('light','01','THE OPENING',E'The warmth\nof light.','Bergamot · Cardamom','The moment darkness gave way to light.'),
('life','02','THE HEART',E'The promise\nof life.','Fig · Fig Leaf · Soft Florals','When water and earth took form, and life began.'),
('earth','03','THE FOUNDATION',E'The stillness\nof earth.','Sandalwood · Cedarwood · Musk','Fresh, warm, woody, and mysterious. Familiar, yet never ordinary.');
commit;
