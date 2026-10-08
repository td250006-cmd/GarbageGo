-- CleanRoute AI schema for Supabase / PostgreSQL
-- Field names match ml/dataset.csv, FastAPI, and React.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  role text check (role in ('admin', 'driver')) default 'admin',
  truck_id text,
  created_at timestamptz default now()
);

create table if not exists public.bins (
  id uuid primary key default gen_random_uuid(),
  bin_id text unique not null,
  latitude double precision not null,
  longitude double precision not null,
  bin_fill_level numeric,
  historical_fill_average numeric,
  last_collection_interval numeric,
  overflow_history numeric,
  collection_frequency numeric,
  missed_collection_count numeric,
  hour_of_day integer,
  day_of_week integer,
  month integer,
  weekend_flag integer,
  holiday_flag integer,
  land_use_type text,
  traffic_density numeric,
  average_vehicle_speed numeric,
  road_congestion_index numeric,
  travel_time_to_bin numeric,
  road_closure_flag integer,
  nearest_road_distance numeric,
  road_connectivity_index numeric,
  junction_count integer,
  status text default 'Pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.bin_history (
  id uuid primary key default gen_random_uuid(),
  bin_id text not null references public.bins(bin_id) on update cascade,
  bin_fill_level numeric,
  recorded_at timestamptz default now()
);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  bin_id text not null,
  prediction text check (prediction in ('Low', 'Medium', 'High')),
  confidence numeric,
  model_name text default 'RandomForestClassifier',
  created_at timestamptz default now()
);

create table if not exists public.priority_scores (
  id uuid primary key default gen_random_uuid(),
  bin_id text not null,
  priority_score numeric,
  priority_status text check (priority_status in ('Normal', 'Medium', 'High', 'Critical')),
  prediction text,
  created_at timestamptz default now()
);

create table if not exists public.trucks (
  id uuid primary key default gen_random_uuid(),
  truck_id text unique not null,
  driver_name text,
  capacity_kg numeric,
  status text default 'Available',
  assigned_route_id text
);

create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  truck_id text,
  total_distance numeric,
  estimated_time numeric,
  total_bins integer,
  created_at timestamptz default now()
);

create table if not exists public.route_bins (
  id uuid primary key default gen_random_uuid(),
  route_id uuid references public.routes(id) on delete cascade,
  bin_id text,
  sequence integer,
  collected boolean default false
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  bin_id text not null,
  truck_id text,
  collected_at timestamptz default now(),
  fill_level_at_collection numeric,
  status text default 'Collected'
);

alter table public.profiles enable row level security;
alter table public.bins enable row level security;
alter table public.bin_history enable row level security;
alter table public.predictions enable row level security;
alter table public.priority_scores enable row level security;
alter table public.trucks enable row level security;
alter table public.routes enable row level security;
alter table public.route_bins enable row level security;
alter table public.collections enable row level security;

create policy "authenticated read bins" on public.bins for select to authenticated using (true);
create policy "authenticated update bins" on public.bins for update to authenticated using (true);
create policy "authenticated read trucks" on public.trucks for select to authenticated using (true);
create policy "authenticated read collections" on public.collections for select to authenticated using (true);
create policy "authenticated insert collections" on public.collections for insert to authenticated with check (true);
create policy "authenticated read predictions" on public.predictions for select to authenticated using (true);
create policy "authenticated insert predictions" on public.predictions for insert to authenticated with check (true);
create policy "authenticated read priority" on public.priority_scores for select to authenticated using (true);
create policy "authenticated insert priority" on public.priority_scores for insert to authenticated with check (true);
create policy "authenticated read routes" on public.routes for select to authenticated using (true);
create policy "authenticated read route_bins" on public.route_bins for select to authenticated using (true);
create policy "users read own profile" on public.profiles for select to authenticated using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role, truck_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'admin'),
    new.raw_user_meta_data->>'truck_id'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
