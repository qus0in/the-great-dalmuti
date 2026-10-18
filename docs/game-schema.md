# 게임 데이터베이스 스키마 및 보안 규칙

## 왜 (Why)

- **배경**: 0.3 버전 달무티의 게임 진행 상태 저장, 실시간 상태 브로드캐스트, 그리고 누적 전적 보존을 위한 표준 데이터베이스 구조가 필요합니다.
- **근거**: 사용자 결정(결정 86: 정규화 테이블, 결정 87: 공개 테이블 Realtime 구독, 결정 89: 전적 영구 보존, 결정 91: 전적 서버 API 조회) 및 [ADR-0004](adr/0004-0.3-session-and-stats.md), [ADR-0011](adr/0011-0.3-game-progress.md)의 원칙을 따릅니다.
- **설계 눈높이**: 초반부 수강생이 쉽게 파악할 수 있도록 복잡한 저장 프로시저나 트리거를 배제하고, 테이블별 단일 책임과 명시적인 외래키(FK) 관계를 유지합니다.

---

## 무엇을 (What)

### 1. 테이블 정의 요약

| 테이블명 | 한 줄 설명 | 주요 칼럼 | 공개 / 비공개 |
|---|---|---|---|
| `games` | 한 게임 세션(방)의 진행 주기 및 식별자 | `id`, `join_code`, `phase`, `version`, `host_seat`, `mode` (`normal`\|`tutorial`, 기본 `normal`) | 비공개 (공개 정보는 `game_public` 경유) |
| `game_seats` | 판에 배치된 4개 좌석과 사용자/봇 매핑 | `game_id`, `seat`, `user_id`, `is_bot`, `finish_position` | 비공개 (요약은 `game_public` 경유) |
| `game_hands` | 각 좌석이 보유한 비공개 손패 카드 목록 | `game_id`, `seat`, `cards` (JSONB 배열) | **절대 비공개** (서버만 접근) |
| `game_tricks` | 한 판 내 순환 트릭(카드 내기 한 묶음) 이력 | `id`, `game_id`, `seq`, `leader_seat`, `passes`, `winner_seat` | 비공개 (현재 트릭 정보는 `game_public` 경유) |
| `game_trick_plays` | 트릭 내에서 플레이어가 제출한 카드/패스 행동 | `id`, `trick_id`, `turn_no`, `seat`, `action`, `cards` | 비공개 (최근 행동은 `game_public` 경유) |
| `game_results` | 게임 완료 시 사용자별 최종 순위 및 전적 이력 | `id`, `game_id`, `user_id`, `mode`, `rank`, `played_at` | **개인 공개** (본인 행만 조회 가능) |
| `game_public` | 브라우저가 Realtime으로 구독하는 공개 전용 상태 | `game_id`, `phase`, `version`, `current_turn_seat`, `seat_summary`, `last_play`, `mode` (`normal`\|`tutorial`, 기본 `normal`) | **전체 공개** (로그인한 사용자 읽기 허용) |

---

### 2. 테이블 관계도 (텍스트 다이어그램)

```text
[auth.users] (Supabase 내장 계정)
      │
      ├──────────────────────┐
      │ (1:N, on delete set null)
      ▼                      ▼ (1:N, on delete cascade)
[game_seats]           [game_results]
      ▲                      ▲
      │ (N:1, on delete cascade)
      │                      │
   [games] ──────────────────┼─────────────────────────┐
      │                      │                         │
      ├──────────────────────┼──────────────────────┐  │
      │ (1:1, cascade)       │ (1:N, cascade)       │  │ (1:N, cascade)
      ▼                      ▼                      ▼  ▼
 [game_public]          [game_hands]           [game_tricks]
(Realtime 구독 대상)     (비공개 손패 카드)            │
                                                       │ (1:N, on delete cascade)
                                                       ▼
                                              [game_trick_plays]
                                              (트릭 내 카드 제출/패스)
```

---

### 3. 공개 / 비공개 및 RLS (Row Level Security) 요약

1. **쓰기 권한 (INSERT / UPDATE / DELETE)**:
   - 모든 테이블에 대해 브라우저 클라이언트(`anon`, `authenticated`)의 직접 쓰기 정책을 생성하지 않습니다.
   - 모든 상태 변경 및 전적 저장은 Express 서버가 비공개 키(`service_role` 키)를 통해 수행하여 RLS를 우회합니다.
2. **읽기 권한 (SELECT)**:
   - `game_public`: 로그인한 모든 사용자(`authenticated`)에게 읽기를 허용합니다. 브라우저는 이 테이블의 변경을 Supabase Realtime으로 구독하여 화면을 갱신합니다.
   - `game_results`: 로그인한 사용자가 자신의 `user_id`와 일치하는 결과 행만 읽을 수 있도록 허용합니다 (`auth.uid() = user_id`).
   - `game_hands`: 읽기 정책이 전혀 없으며, 브라우저의 직접 조회를 원천 차단합니다. 본인 손패 확인은 Express 서버 인증 API를 통해서만 이루어집니다.
   - `games`, `game_seats`, `game_tricks`, `game_trick_plays`: 브라우저 직접 읽기 정책을 부여하지 않습니다. 화면에 필요한 공개 데이터는 서버가 `game_public`에 투영합니다.

---

### 4. Realtime 구독 설정

- Supabase의 `supabase_realtime` publication에 `game_public` 테이블을 등록합니다:
  ```sql
  alter publication supabase_realtime add table game_public;
  ```
- 브라우저는 `supabase.channel('game-public').on('postgres_changes', ...)`를 통해 손패 노출 위험 없이 전체 공개 게임 상태를 실시간 수신합니다.

---

### 5. 전적 집계 뷰 (`user_game_stats`)

- **역할**: 계정(`user_id`)과 모드(`mode`: `single` / `multi`)별로 총 게임 수(`total_games`) 및 순위별 달성 횟수(`rank_1_count` ~ `rank_4_count`)를 집계합니다.
- **튜토리얼 미기록**: 튜토리얼 게임(`mode = 'tutorial'`)은 전적에 기록되지 않습니다 (별도의 `game_results` 행을 생성하지 않음).
- **보안**: `with (security_invoker = true)` 속성으로 정의되어 질의하는 사용자의 RLS 권한을 기반으로 동작하므로, 다른 사용자의 전적 집계는 조회할 수 없습니다.

---

## 어떻게 (How)

### 적용 방법

#### 방법 (a) Supabase 대시보드 SQL Editor 이용
1. Supabase 프로젝트 관리 콘솔에 로그인한 뒤 좌측 메뉴에서 **SQL Editor**를 선택합니다.
2. 기본 스키마는 `supabase/migrations/20261016163800_game_schema.sql`, 튜토리얼 모드 확장은 `supabase/migrations/20261017062000_tutorial_mode.sql` 파일의 내용을 차례로 편집기에 붙여넣습니다.
3. **Run** 버튼을 클릭하여 스키마 생성 및 RLS 정책 활성화를 완료합니다.

#### 방법 (b) Supabase CLI 이용 (`supabase db push`)
1. 터미널에서 Supabase 프로젝트에 로그인하고 연결합니다:
   ```bash
   npx supabase login
   npx supabase link --project-ref <프로젝트-참조-ID>
   ```
2. 마이그레이션 파일을 원격 데이터베이스에 적용합니다:
   ```bash
   npx supabase db push
   ```
