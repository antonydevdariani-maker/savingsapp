-- SweatLock tables

create table if not exists sweatlock_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  balance numeric(12,2) not null default 0,
  locked_balance numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sweatlock_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('deposit', 'withdrawal')),
  amount numeric(12,2) not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

create table if not exists sweatlock_challenge_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  transaction_id uuid references sweatlock_transactions(id),
  reps_required int not null,
  reps_completed int not null,
  passed boolean not null default false,
  duration_seconds int,
  created_at timestamptz not null default now()
);

-- RLS
alter table sweatlock_accounts enable row level security;
alter table sweatlock_transactions enable row level security;
alter table sweatlock_challenge_logs enable row level security;

create policy "users own account" on sweatlock_accounts
  for all using (auth.uid() = user_id);

create policy "users own transactions" on sweatlock_transactions
  for all using (auth.uid() = user_id);

create policy "users own challenge logs" on sweatlock_challenge_logs
  for all using (auth.uid() = user_id);

-- auto-create account on signup
create or replace function create_sweatlock_account()
returns trigger language plpgsql security definer as $$
begin
  insert into sweatlock_accounts (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_sweatlock on auth.users;
create trigger on_auth_user_created_sweatlock
  after insert on auth.users
  for each row execute function create_sweatlock_account();
