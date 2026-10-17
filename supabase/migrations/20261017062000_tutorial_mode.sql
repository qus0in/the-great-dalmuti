-- 튜토리얼 여부는 방에 저장하고 Realtime 공개 상태에도 전달한다.
-- 전적의 single/multi 구분과 별개이며 튜토리얼 전적 행은 만들지 않는다.
alter table games
  add column mode text not null default 'normal'
  check (mode in ('normal', 'tutorial'));

alter table game_public
  add column mode text not null default 'normal'
  check (mode in ('normal', 'tutorial'));
