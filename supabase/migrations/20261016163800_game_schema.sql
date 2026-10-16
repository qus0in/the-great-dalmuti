-- 0.3 달무티 게임 정규화 스키마, RLS, Realtime 및 전적 뷰 (초반부 수강생 눈높이)

-- 1. games: 한 판(게임 세션)의 진행 주기와 식별자
create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  join_code text not null unique,
  phase text not null default 'waiting' check (phase in ('waiting', 'playing', 'finished')),
  version integer not null default 1,
  host_seat integer not null default 0 check (host_seat between 0 and 3),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- 2. game_seats: 판에 배치된 4개 좌석과 사용자/봇 매핑
create table if not exists game_seats (
  game_id uuid not null references games(id) on delete cascade,
  seat integer not null check (seat between 0 and 3),
  user_id uuid references auth.users(id) on delete set null,
  is_bot boolean not null default false,
  finish_position integer check (finish_position between 1 and 4),
  left_at timestamptz, primary key (game_id, seat)
);

-- 3. game_hands: 각 좌석의 비공개 손패 카드 목록 (브라우저 접근 차단)
create table if not exists game_hands (
  game_id uuid not null references games(id) on delete cascade,
  seat integer not null check (seat between 0 and 3),
  cards jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(), primary key (game_id, seat)
);

-- 4. game_tricks: 판 내 개별 트릭(카드 내기 한 묶음) 이력
create table if not exists game_tricks (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  seq integer not null default 1,
  leader_seat integer not null check (leader_seat between 0 and 3),
  passes integer not null default 0,
  winner_seat integer check (winner_seat between 0 and 3),
  created_at timestamptz not null default now(), unique (game_id, seq)
);

-- 5. game_trick_plays: 트릭 내에서 제출한 카드 및 패스 행동 기록
create table if not exists game_trick_plays (
  id uuid primary key default gen_random_uuid(),
  trick_id uuid not null references game_tricks(id) on delete cascade,
  turn_no integer not null default 1,
  seat integer not null check (seat between 0 and 3),
  action text not null check (action in ('play', 'pass')),
  cards jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(), unique (trick_id, turn_no)
);

-- 6. game_results: 판 종료 후 사용자별 최종 순위 및 누적 전적 (ADR-0004 확정 2·7·8)
create table if not exists game_results (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('single', 'multi')),
  rank integer not null check (rank between 1 and 4),
  played_at timestamptz not null default now(), unique (game_id, user_id)
);

-- 7. game_public: 브라우저가 Realtime으로 구독하는 공개 전용 상태 (결정 87)
create table if not exists game_public (
  game_id uuid primary key references games(id) on delete cascade,
  phase text not null default 'waiting' check (phase in ('waiting', 'playing', 'finished')),
  version integer not null default 1,
  current_turn_seat integer check (current_turn_seat between 0 and 3),
  seat_summary jsonb not null default '[]'::jsonb,
  last_play jsonb, updated_at timestamptz not null default now()
);

-- RLS: 모든 테이블 활성화 (브라우저 직접 쓰기는 없으며 Express 서버가 secret 키로 전담)
alter table games enable row level security;
alter table game_seats enable row level security;
alter table game_hands enable row level security;
alter table game_tricks enable row level security;
alter table game_trick_plays enable row level security;
alter table game_results enable row level security;
alter table game_public enable row level security;

-- RLS 읽기: game_public은 로그인 사용자 전체, game_results는 본인 행만 허용 (나머지 테이블은 브라우저 읽기 차단)
create policy "Allow authenticated read game_public" on game_public for select to authenticated using (true);
create policy "Allow user read own game_results" on game_results for select to authenticated using (auth.uid() = user_id);

-- Realtime: game_public 테이블 행 변경 구독 활성화
alter publication supabase_realtime add table game_public;

-- 8. user_game_stats: 계정별/모드별 전적 집계 뷰 (ADR-0004 확정 7, security_invoker로 RLS 계승)
create or replace view user_game_stats with (security_invoker = true) as
select
  user_id, mode,
  count(*)::integer as total_games,
  count(*) filter (where rank = 1)::integer as rank_1_count,
  count(*) filter (where rank = 2)::integer as rank_2_count,
  count(*) filter (where rank = 3)::integer as rank_3_count,
  count(*) filter (where rank = 4)::integer as rank_4_count
from game_results
group by user_id, mode;
