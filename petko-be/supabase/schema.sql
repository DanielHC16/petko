-- ============================================================
-- Petko — Initial Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. USERS
-- Mirrors auth.users — stores role and profile info.
-- A trigger auto-inserts a row here after Google SSO sign-in.
-- ────────────────────────────────────────────────────────────
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  full_name   text not null default '',
  avatar_url  text not null default '',
  role        text not null default 'customer' check (role in ('admin', 'customer')),
  created_at  timestamptz not null default now()
);

-- Row Level Security — users can only read/edit their own row
alter table public.users enable row level security;

create policy "Users can view their own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id);

-- Column-level lock (see security-patch-001-lock-user-role.sql):
-- clients may only edit their display fields, never `role`.
-- Role changes go through the NestJS backend (service role) only.
revoke update on public.users from anon, authenticated;
grant update (full_name, avatar_url) on public.users to authenticated;

-- ────────────────────────────────────────────────────────────
-- 2. AUTO-INSERT TRIGGER
-- When a user signs in with Google SSO for the first time,
-- Supabase creates a row in auth.users. This trigger
-- automatically creates the corresponding public.users row.
-- ────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Drop and recreate to ensure idempotency
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- 3. PRODUCTS
-- ────────────────────────────────────────────────────────────
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  price       numeric(10,2) not null check (price >= 0),
  stock       integer not null default 0 check (stock >= 0),
  category    text not null,
  pet_type    text not null check (pet_type in ('cat', 'dog', 'both')),
  image_url   text not null default '',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.products enable row level security;

-- Anyone can view active products
create policy "Anyone can view active products"
  on public.products for select
  using (is_active = true);

-- Only service role (NestJS backend) can insert/update/delete
-- (Enforced by the backend — no public write RLS needed)

-- ────────────────────────────────────────────────────────────
-- 4. CART ITEMS
-- ────────────────────────────────────────────────────────────
create table if not exists public.cart_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  quantity    integer not null default 1 check (quantity > 0),
  created_at  timestamptz not null default now(),
  unique (user_id, product_id)
);

alter table public.cart_items enable row level security;

create policy "Users can manage their own cart"
  on public.cart_items for all
  using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 5. ORDERS
-- ────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete restrict,
  status            text not null default 'pending'
                      check (status in ('pending', 'paid', 'shipped', 'cancelled')),
  total_amount      numeric(10,2) not null check (total_amount >= 0),
  payment_reference text,           -- Gateway reference — TBA
  created_at        timestamptz not null default now()
);

alter table public.orders enable row level security;

create policy "Users can view their own orders"
  on public.orders for select
  using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 6. ORDER ITEMS
-- ────────────────────────────────────────────────────────────
create table if not exists public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete restrict,
  quantity    integer not null check (quantity > 0),
  unit_price  numeric(10,2) not null check (unit_price >= 0)  -- Snapshot at purchase time
);

alter table public.order_items enable row level security;

create policy "Users can view items from their own orders"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
        and orders.user_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- 7. SEED — Admin user placeholder
-- After your first Google SSO sign-in, run this to promote
-- yourself to admin. Replace the email with your own.
-- ────────────────────────────────────────────────────────────
-- update public.users
-- set role = 'admin'
-- where email = 'your-email@gmail.com';
