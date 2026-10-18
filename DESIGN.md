# 달무티 디자인 시스템 (DESIGN.md)

## 1. Why: 배경 및 설계 철학

`더 그레이트 달무티(The Great Dalmuti)`는 신분 계급의 불평등과 권력의 순환을 다루는 중세 테마 카드 게임입니다. 이 디자인 시스템은 게임의 핵심 테마인 <strong>중세 봉건 계급 구조</strong>를 현대적인 웹 인터페이스로 시각화하면서도, 순수 HTML·CSS만으로 가볍고 직관적인 사용자 경험을 전달하기 위해 설계되었습니다. 본 디자인 시스템은 0.2 정적 프로토타입(`dist/`)과 0.3 서비스 화면(`src/ui/public/`) 둘 다에 동일하게 적용됩니다.

### 핵심 설계 원칙
1. **신분 격차의 시각적 계층화 (Feudal Hierarchy)**
   대달무티(1위)부터 대농노(4위)에 이르는 신분 격차를 색상 채도, 카드 테두리의 화려함, 좌석 배지 위계를 통해 직관적으로 인지하도록 합니다.
2. **따뜻하고 고풍스러운 양피지 무드 (Modern Medieval Parchment)**
   차가운 디지털 색조를 지양하고, 따뜻한 크림빛 양피지(`--color-cream`: `#FDF4D2`)를 베이스로 절제된 라벤더, 스카이 블루, 로즈 우드 컬러를 배치해 품격 있는 카드 룸 분위기를 형성합니다.
3. **순수 CSS 기반의 무에셋 구현 (No Images, Pure CSS)**
   외부 이미지 파일(`<img>`, `url()`) 없이 순수 CSS 그라디언트, 테두리, 기하학적 래티스(Lattice) 패턴만으로 12계급 카드와 카드 뒷면을 정밀하게 표현하여 네트워크 비용을 0으로 만듭니다.
4. **100% 팔레트 파생 및 접근성 (Strict Palette Derivation & WCAG Compliance)**
   사용자가 지정한 ColorHunt 4색을 기본 원천으로 삼고, 모든 액센트, 잉크, 상태 색상은 4색과 엄격한 필수 뉴트럴(다크 잉크, 화이트) 간의 `color-mix()`로만 파생합니다. 임의의 외부 원시 색상(외장 골드, 그레이 등)을 완전히 배제하고 WCAG AA/AAA 명도 대비를 보장합니다.

---

## 2. What: 설계 옵션 평가 (SWOT 분석)

디자인 파운데이션 구축 과정에서 검토된 4가지 주요 설계 의사결정에 대한 SWOT 분석입니다.

### 1) ColorHunt 4색 기반 계급 색상 체계 및 100% 파생 원칙
- **강점 (Strengths)**: `#FDF4D2`(크림), `#B0CDE6`(스카이), `#A290B7`(라벤더), `#946D6D`(로즈) 4색 조합이 중세 귀족과 평민의 분위기를 우아하게 연출하며, 일관된 톤앤매너를 유지합니다.
- **약점 (Weaknesses)**: 파스텔 성향의 원색 4종은 명도가 높아 밝은 배경 위 텍스트 컬러로 직접 사용할 경우 가독성이 떨어집니다.
- **기회 (Opportunities)**: 원색을 면(Surface)과 테두리(Border)에 배치하고, `color-mix()`를 통해 짙은 잉크(`--color-ink`: `#322423`, 13.49:1 AAA)와 계급별 딥 대비 컬러(`--color-rank-*`: 6:1~9:1 AAA)를 체계적으로 파생했습니다.
- **위협 (Threats)**: 외부 골드/그레이 등 오프 팔레트 색상 유입 위험을 `tokens.css` 내 100% 팔레트 파생 규칙과 strict check 스크립트로 원천 차단했습니다.

### 2) 순수 CSS 카드 렌더링 (Pure CSS vs Image/SVG Assets)
- **강점 (Strengths)**: HTTP 에셋 로딩이 없어 렌더링 속도가 극대화되며, 확대/축소 시에도 벡터 수준의 선명도를 유지합니다. 선택(`is-selected`), 비활성(`is-disabled`), 일자 겹침 손패(`hand-fan`), 낼 수 있음(`is-playable`) 등 상태 변경을 클래스만으로 제어할 수 있습니다.
- **약점 (Weaknesses)**: 실물 카드의 복잡한 인물 일러스트레이션을 완전하게 모사하는 데 한계가 있습니다.
- **기회 (Opportunities)**: 원형 인장(Seal Badge), 상하 대칭 인덱스 숫자, 이중 테두리, 카드 뒷면의 다이아몬드 격자 패턴(`repeating-linear-gradient`)을 순수 CSS로 완성하여 미니멀하면서도 클래식한 보드게임 카드 미학을 창출했습니다.
- **위협 (Threats)**: 복잡한 CSS 그라디언트의 렌더링 부하는 하드웨어 가속 트랜스폼(`transform: translate3d`) 및 절제된 모션 토큰으로 해결했습니다.

### 3) 한글 타이포그래피 (LevelUp & KotraGothic 조합)
- **강점 (Strengths)**: 영문·숫자 헤드라인에 적용된 `LevelUp` 폰트의 볼드하고 위트 있는 인상과, 본문에 적용된 `KotraGothic`의 단정하고 가독성 높은 고딕 획이 이상적인 조화를 이룹니다.
- **약점 (Weaknesses)**: 390px 등 좁은 모바일 뷰포트에서 대형 헤드라인 줄바꿈 또는 잘림 현상이 발생할 수 있습니다.
- **기회 (Opportunities)**: `clamp(1.75rem, 5vw, var(--font-size-3xl))` 반응형 유동 스케일을 적용하여 390px 모바일에서도 잘림 없는 매끄러운 타이포그래피를 구현했습니다.
- **위협 (Threats)**: 폰트 재배포 라이선스 제약(KOTRA 라이선스)을 준수하기 위해 로컬 복사 없이 jsDelivr 오픈 CDN 링크만을 엄격히 사용합니다.

### 4) 8px 그리드 및 유동형 게임 룸 아레나 (Responsive Arena)
- **강점 (Strengths)**: 8px 배수 간격 시스템(`--space-0-5`부터 `--space-12`)을 통해 대기실(Hall)과 플레이룸(Play) 간 시각적 리듬을 균일화합니다.
- **약점 (Weaknesses)**: 4인 대전 원형 테이블 레이아웃을 좁은 모바일 화면(390px)에 일대일로 축소하기 어렵습니다.
- **기회 (Opportunities)**: 데스크톱에서는 십자형 원형 배치(상/하/좌/우), 모바일에서는 상단 3인 가로 그리드 + 중앙 펠트 테이블 + 하단 일자 손패 행으로 반응형 전환하여 공간 효율을 극대화했습니다.
- **위협 (Threats)**: 손패가 화면보다 넓어지면 카드 폭과 장수에 따라 겹침 폭을 조정하고, 390px에서도 20장 손패가 가로 스크롤 없이 표시되도록 합니다.

---

## 3. How: 디자인 토큰 및 구현 명세 (Shipped Tokens)

### CSS 파일 구조와 로딩 순서

#### Why

CSS 파일을 역할별 100줄 이하로 유지하고, 한 페이지가 필요한 파일을 브라우저가 바로 발견하도록 합니다. 중첩 `@import`는 요청 단계가 이어지는 waterfall을 만들 수 있어 사용하지 않습니다.

#### What

`dist/css/tokens.css` 및 `src/ui/public/css/tokens.css`는 허용된 원천 팔레트와 폰트 선언을 보유합니다. `tokens/`, `base/`, `components/`, `hall/`, `play/`의 모듈 디렉터리는 페이지 HTML에서 직접 연결합니다. 대기실과 플레이룸은 공통 기반 모듈(`tokens/`, `base/`, `components/`)을 공유하고, 마지막에 화면별 모듈(`hall/` 또는 `play/`)을 연결합니다.

#### How

두 페이지의 공통 CSS 링크 순서는 다음과 같습니다.

1. `css/reset.css`
2. `css/tokens.css`
3. `css/tokens/typography.css`
4. `css/tokens/spacing.css`
5. `css/tokens/elevation.css`
6. `css/base/typography.css`
7. `css/base/layout.css`
8. `css/base/utilities.css`
9. `css/base/animations.css`
10. `css/components/card.css`
11. `css/components/card-crest.css`
12. `css/components/card-ranks.css`
13. `css/components/card-back.css`
14. `css/components/card-states.css`
15. `css/components/seat.css`
16. `css/components/badge.css`
17. `css/components/button.css`
18. `css/components/panel.css`

그 뒤 대기실은 `css/hall/` 모듈(`page-shell.css`, `waiting-room.css`, `rank-ladder.css`, `rule-summary.css`, `entry-cta.css`, `entrance-stagger.css`, `hover-affordances.css`, `responsive.css`, `reduced-motion.css`)을 연결합니다. 플레이룸 모듈은 `css/play/` 아래의 `layout.css`, `hud.css`, `hud-mobile.css`, `banner.css`, `arena.css`, `arena-mobile.css`, `card-stack.css`, `table-felt-details.css`, `table-felt.css`, `hand.css`, `hand-fan-deal.css`, `hand-mobile.css`, `hand-fan.css`, `animations.css`, `responsive-tablet.css` 순서로 연결합니다. 파일 구성을 바꾸면 이 링크 순서도 함께 갱신합니다.

#### 연결 방식 선택 (SWOT)

- 강점: HTML에서 적용 순서를 검토할 수 있고, 브라우저가 각 스타일시트를 직접 요청합니다.
- 약점: 링크 목록이 길어지고, 새 모듈을 추가할 때 페이지별 연결을 갱신해야 합니다.
- 기회: 공통 기반과 화면별 모듈을 분리해 필요한 CSS만 연결할 수 있습니다.
- 위협: 누락되거나 순서가 바뀐 링크는 스타일 계층을 깨뜨릴 수 있으므로 `ui-prototype` 체크가 링크 계층과 순서를 검사합니다.

### 3.1 색상 시스템 및 검증된 WCAG 명도 대비

CSS 원천 색상은 `css/tokens.css`(`dist/css/tokens.css` 및 `src/ui/public/css/tokens.css`)에만 둡니다. 허용 원천은 ColorHunt 4색과 필수 뉴트럴 다크 잉크·화이트뿐이며, 나머지 색은 이 변수들을 `color-mix()`로 조합해 파생합니다. 다른 CSS 파일에는 색상 리터럴을 두지 않습니다.

#### 1) 기본 팔레트 (ColorHunt 원천 4색 + 필수 뉴트럴)
- `--color-cream`: `#FDF4D2` (기본 배경 양피지)
- `--color-sky`: `#B0CDE6` (군사/기사 계급 원천)
- `--color-lavender`: `#A290B7` (고위 귀족 계급 원천)
- `--color-rose`: `#946D6D` (평민/농노 계급 원천)
- `--color-raw-dark`: `#191211` (고대비 잉크 베이스)
- `--color-raw-white`: `#FFFFFF` (카드 바탕 및 하이라이트)

#### 2) 파생 색상 및 검증된 WCAG 대비비 (Browser-verified)
모든 파생색은 팔레트 4색과 뉴트럴 간 `color-mix(in srgb)`로만 생성되었습니다.

| 역할 토큰명 | CSS 변수 정의 | 파생 RGB / HEX | 배경 대비비 (크림 `#FDF4D2` 기준) | 카드/서피스 대비비 | WCAG 등급 | 용도 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **주요 텍스트** | `--color-ink` | `mix(rose, 20%, dark)` (`#322423`) | **13.49:1** | **14.73:1** (흰색) | **AAA** | 본문 텍스트, 헤딩, 카드 인덱스 |
| **보조 텍스트** | `--color-ink-muted` | `mix(rose, 45%, raw-dark)` (`#503B3A`) | **9.38:1** | **10.34:1** (흰색) | **AAA** | 메타 정보, 잔여 카드수, 캡션 |
| **통치 계급 (1~2)** | `--color-rank-ruling` | `mix(rose, 45%, ink)` (`#5E4544`) | **7.90:1** | **8.63:1** (흰색) | **AAA** | 달무티, 대주교 인덱스 및 코너 |
| **귀족 계급 (3~5)** | `--color-rank-noble` | `mix(lavender, 40%, dark)` (`#4E395A`) | **8.31:1** | **9.07:1** (흰색) | **AAA** | 시종장, 남작부인, 수녀원장 |
| **기사/길드 (6~8)** | `--color-rank-guild` | `mix(sky, 40%, dark)` (`#264964`) | **6.06:1** | **6.61:1** (흰색) | **AAA** | 기사, 재봉사, 석공 |
| **평민/농노 (9~12)** | `--color-rank-labor` | `mix(rose, 50%, dark)` (`#5D3838`) | **8.65:1** | **9.45:1** (흰색) | **AAA** | 요리사, 양치기, 광부, 농노 |
| **어릿광대 (0)** | `--color-rank-jester` | `mix(lavender, 30%, ink)` (`#4A2E3E`) | **8.22:1** | **8.98:1** (흰색) | **AAA** | 조커 카드 번호 및 배지 |
| **패스 상태** | `--color-pass` | `mix(ink, 75%, cream)` (`#65584F`) | **6.22:1** | **4.96:1** (pass-soft) | **AA** | 패스 배지 및 비활성 표시 |
| **달무티 골드 액센트**| `--color-gold` | `mix(rose, 55%, cream)` (`#C3AA9A`) | 1.99:1 (면용) | **6.75:1** (잉크대비) | **AAA** | 턴 표시기, 버튼 골드 면 |
| **테이블 펠트 서피스**| `--color-surface-table-felt`| `mix(sky, 15%, raw-dark)` (`#302E31`)| - | **12.21:1** (크림대비) | **AAA** | 게임판 슬레이트 네이비/펠트 |

---

### 3.2 타이포그래피 스케일

- **헤드라인 폰트 (Display)**: `'LevelUp', system-ui, -apple-system, sans-serif`
- **본문 폰트 (Body)**: `'KotraGothic', system-ui, -apple-system, sans-serif`

| 토큰명 | 크기 (px / rem) | 행간 | 주 용도 | 반응형 조정 |
| :--- | :--- | :--- | :--- | :--- |
| `--font-size-3xl` | 40px (2.5rem) | 1.2 | 대형 타이틀, 대달무티 승리 배너 | `clamp(1.75rem, 5vw, 40px)`로 모바일 축소 |
| `--font-size-2xl` | 32px (2rem) | 1.2 | 섹션 헤딩 (H2), 모달 타이틀 | - |
| `--font-size-xl` | 24px (1.5rem) | 1.3 | 카드 코너 인덱스, 컴포넌트 헤딩 (H3) | - |
| `--font-size-lg` | 20px (1.25rem) | 1.3 | 버튼 텍스트, 브랜드 헤더 로고 | - |
| `--font-size-md` | 18px (1.125rem) | 1.4 | 플레이어 닉네임, 라운드 번호 | - |
| `--font-size-base` | 16px (1rem) | 1.5 | 본문 기본 텍스트, 카드 목록 라벨 | - |
| `--font-size-sm` | 14px (0.875rem) | 1.4 | 계급명칭, 시스템 안내 메시지 | - |
| `--font-size-xs` | 12px (0.75rem) | 1.3 | 배지, 코너 카드 계급 부제목, 덱 통계 | - |
| `--font-size-card-rank`| 48px (3rem) | 1.1 | 카드 중앙 엠블럼 대형 숫자 | - |

---

### 3.3 간격(Spacing) 및 입체감(Elevation) 시스템

- **8px 단위 간격 토큰**:
  - `--space-neg-px`: `-1px` (스크린리더 및 오버랩 보정)
  - `--space-px`: `1px` (미세 헤어라인 및 배지 패딩)
  - `--space-0-5`: `4px`
  - `--space-1`: `8px`
  - `--space-1-5`: `12px`
  - `--space-2`: `16px`
  - `--space-3`: 24px
  - `--space-4`: 32px
  - `--space-5`: 40px
  - `--space-6`: 48px
  - `--space-8`: 64px
  - `--space-10`: 80px
  - `--space-12`: 96px
  - 손패 오버랩: `.hand-tray` 너비와 `data-hand-count`에 맞춰 CSS Grid 열 간격을 조정하고, 회전·음수 마진·손패 가로 스크롤 없이 1~21장을 한 줄에 표시

- **곡률 및 그림자**:
  - `--radius-1`: `8px`, `--radius-2`: `16px`, `--radius-full`: `9999px`
  - `--shadow-1`: 기본 패널 부유감
  - `--shadow-2`: 테이블 및 모달 고도
  - `--shadow-card`: 카드 기본 그림자
  - `--shadow-card-hover`: 카드 호버 부유 그림자
  - `--shadow-turn-glow`: 차례 알림 발광 효과
  - `--shadow-table-felt`: 게임판 안쪽 깊이감 음영 (`inset 0 0 40px`)

---

### 3.4 핵심 컴포넌트 및 인터랙티브 상태

#### 1) 플레잉 카드 (`.card`)
- **규격**: 폭 140px, 높이 210px (비율 1:1.5), 곡률 `--radius-1`(8px), 흰색 바탕 위 이중 테두리
- **계급 테마 클래스**:
  - `.card--rank-1`, `.card--rank-2`: 골드 테두리 및 `--color-tint-ruling` 인장 배경
  - `.card--rank-3` ~ `.card--rank-5`: 라벤더 테두리 및 `--color-tint-noble` 인장 배경
  - `.card--rank-6` ~ `.card--rank-8`: 스카이 테두리 및 `--color-tint-guild` 인장 배경
  - `.card--rank-9` ~ `.card--rank-12`: 로즈 테두리 및 `--color-tint-labor` 인장 배경
  - `.card--jester`: 어릿광대 조커 카드 (`.card__rank` 별표 ★)
  - `.card--back`: 45도 다이아몬드 격자 래티스 패턴
- **인터랙티브 상태**:
  - `:hover`: `transform: translateY(-8px)` 부유 및 그림자 강화 (`@media (hover: hover) and (pointer: fine)` 격리)
  - `.is-selected`: `transform: translateY(-16px)` 상승 및 하이라이트 아웃라인
  - `.is-playable`: 현재 필드 트릭을 이길 수 있는 카드 상단 "낼 수 있음" 인디케이터
  - `.is-disabled`: 턴이 아니거나 낼 수 없는 카드 딤 처리 (`opacity: 0.45`)
  - `.hand-fan`: 클래스 이름은 유지하며 회전 없이 가로로 살짝 겹칩니다. `data-hand-count`와 손패 영역 너비로 카드 간격을 계산해 1~21장을 담고, 선택·호버 시 세로로만 올려 인접 카드의 클릭 영역을 가리지 않습니다.

#### 2) 플레이어 좌석 패널 (`.seat`)
- **구성**: 아바타 서클, 신분 배지(`.badge`), 닉네임, 잔여 카드 스택(`.card-stack`), 매수 라벨(`.seat__count`)
- **상태 제어**:
  - `.seat--me`: 플레이어 본인 좌석 하이라이트 (스카이 틴트 배경)
  - `.is-turn`: 현재 턴 플레이어 펄스 발광 애니메이션 (`animation: turn-glow 2s infinite`)
  - `.is-passed`: 패스 선언 플레이어 점선 테두리 및 소프트 배경 전환 (WCAG AA 명도 대비 유지)

#### 3) 게임 테이블 서피스 (`.table-felt`)
- 중세 고급 카드룸 슬레이트 펠트 서피스
- 내부 링 점선 모티프, 중앙 트릭 필드(`table-felt__trick`), 덮인 이전 트릭 표시기

#### 4) 버튼 및 액션 컨트롤 (`.btn`)
- `.btn--gold`: 카드 제출 및 메인 액션 버튼 (팔레트 골드 서피스)
- `.btn--primary`: 계정 생성 및 기본 액션
- `.btn--secondary`: 패스(Pass) 및 취소 버튼
- `.btn--outline`: 덱 정리 및 보조 버튼
- 모든 버튼은 48px 이상의 터치 타깃(`min-height: var(--space-6)`, `min-width: var(--space-6)`)을 보장합니다.

---

### 3.5 대기실(Hall, #11) 및 플레이룸(Play, #12) 화면 연계

- **대기실 (dist/index.html, src/ui/public/index.html & css/hall/ 모듈)**:
  - 방 만들기 폼, 공개 방 목록, 플레이어 신분 표시, 빠른 입장
  - 공통 파운데이션의 버튼, 패널, 배지 토큰을 100% 재사용
- **플레이룸 (dist/play.html, src/ui/public/play.html & css/play/ 모듈)**:
  - 4인 대전 아레나 (상단 1위 대달무티 민우, 동쪽 2위 소달무티 지은, 서쪽 4위 대농노 철수, 하단 3위 소농노 본인)
  - 80장 수학적 카드 분배 정합성 준수 (남은 덱 0장, 필드 3장, 버린 카드 20장, 4인 손패 57장 = 총 80장)
  - 반응형 전환: 데스크톱 십자형 배치 → 모바일(390px) 3열 컴팩트 좌석 + 중앙 필드 + 하단 손패 트레이

---

### 3.6 반응형 적응, 박스 모델 및 웹 접근성 계약 (Addendum 2)

#### 1) 한글 줄바꿈 (Korean Line Breaking)
- `body` 전역에 `word-break: keep-all; overflow-wrap: anywhere;`를 적용하여 조사나 어미 단위로 어색하게 줄바꿈되는 현상을 방지합니다.
- 카드 매수 등 숫자와 단위 결합이 줄바꿈되어 깨지는 문제를 막기 위해 `.seat__count` 및 `.nowrap` 유틸리티 클래스(`white-space: nowrap;`)를 적용합니다.

#### 2) 반응형 브레이크포인트 및 혼용 입력 모드 (Responsive & Mixed Input)
- **Phone (360px ~ 599px)**:
  - 상단 3인 상대방 좌석을 컴팩트 3열 가로 그리드로 재배치
  - 중앙 테이블 펠트 및 트릭 카드를 0.72배 스케일로 축소
  - 20장 손패(+어릿광대 포함 최대 21장)는 `.hand-tray` 너비와 실제 장수에 맞춘 일자 겹침으로 배치해 390px에서 가로 스크롤 없이 표시
  - 손패 헤더 및 조작 버튼은 뷰포트 하단에 고정(`position: sticky; bottom: 0;`)
- **Tablet (600px ~ 1023px)**:
  - 세로(820x1180) 및 가로(1180x820) 환경 지원
  - 2단/3단 적응형 그리드로 전환하며 쾌적한 카드 패닝 공간 확보
- **Desktop (>= 1024px)**:
  - 1440x900 기준 데스크톱 뷰포트에서 상/하/좌/우 4방위 십자형 아레나를 스크롤 없이 한 화면에 온전히 표출
- **혼용 입력 모드 (Mixed Input)**:
  - 카드 호버 부유, 버튼 호버 색상 변화 등 모든 마우스 호버 효과는 `@media (hover: hover) and (pointer: fine)` 조건문 내에서만 활성화됩니다.
  - 터치 디바이스(스마트폰, 태블릿)에서는 불필요한 호버 고착 상태를 방지하고, 모든 대화형 요소에 48px 이상의 터치 타깃을 제공합니다.

#### 3) 웹 접근성 (Accessibility & Lighthouse 100)
- **Lighthouse 검증**: Mobile 및 Desktop 모드 전 부문에서 접근성(Accessibility) 100점을 달성했습니다.
- **시맨틱 랜드마크 및 논리적 헤딩 구조**:
  - `header`, `main`, `section`, `footer` 랜드마크를 완전하게 정의
  - 최상위 브랜딩 `h1`부터 각 대전 구역, 최근 플레이, 조작 패널에 이르는 계층적 헤딩(`h1` → `h2` → `h3`)을 스크린리더 보조 헤딩(`.sr-only`)과 함께 구성
- **순수 CSS 카드 접근성 이름 제공**:
  - `<article class="card">`에 `aria-label="<계급> <명칭>"`과 `tabindex="0"`을 부여하여 키보드 탭 탐색 및 보조기기 읽기를 지원
  - 카드 내부의 코너 인덱스, 중앙 인장, 텍스트 등 시각 전용 장식 요소에는 `aria-hidden="true"`를 적용하여 스크린리더의 중복 낭독(동일 숫자·이름의 다중 발음)을 방지
- **색상 무관 정보 전달**:
  - 턴, 패스, 신분 상태를 색상뿐만 아니라 명시적 텍스트 배지(`.badge`)와 레이아웃 상태로 병행 안내

#### 4) 박스 모델 계약 (Box Model Contract)
- **전역 border-box**:
  - `*, *::before, *::after { box-sizing: border-box; }`를 적용하여 테두리와 패딩이 너비 계산에 포함되도록 강제합니다.
- **간격 일원화 (Gap-driven Spacing)**:
  - 컴포넌트 내부 여백은 고유의 `padding`으로 완결하며, 형제 요소 간 간격은 부모 flex/grid 컨테이너의 `gap` 토큰으로만 제어합니다.
  - 임의의 마진 중첩(margin collapse) 및 자식 요소의 비정형 마진을 완전히 배제합니다.
- **비음수 마진 레이아웃 (Non-Negative-Margin Overlap)**:
  - 손패(`.hand-fan`)와 카드 덱 스택(`.card-stack`)은 음수 마진 없이 배치합니다.
  - CSS Grid 열 간격을 `.hand-tray`의 container query 너비와 `data-hand-count`로 계산해 카드 수가 늘면 겹침 폭을 넓히고, 손패 행을 중앙에 맞춥니다.
- **클리핑 없는 유동형 크기 및 카드 여백 계약 (No-Clipping Sizing & Overflow Policy)**:
  - 고정 높이(`height`) 대신 `min-height`를 활용하여 폰트 렌더링 환경에 따른 텍스트 잘림을 예방합니다.
  - 카드 컨테이너(`.hand-fan`, `.table-felt`, `.card-stack`)에 불필요한 `overflow: hidden` 및 `overflow: clip` 적용을 금지하고 `overflow: visible`을 유지합니다.
  - 카드 호버 및 선택 시 세로 상승 효과를 수용하도록 토큰 기반 수직 패딩(`padding-top: var(--space-6); padding-bottom: var(--space-4);`)을 둡니다. 손패 카드는 회전하거나 가로로 확대하지 않습니다.
  - `.hand-tray`는 가로 스크롤을 사용하지 않고, 카드 수가 20장(+어릿광대 포함 최대 21장)일 때 390px 폭 안에 손패 전체가 들어오도록 겹침 간격을 조정합니다.
  - 360px 모바일 최소 뷰포트에서도 손패와 다른 콘텐츠의 가로 넘침이나 레이아웃 깨짐이 발생하지 않습니다.

#### 5) 메타 태그 및 카카오톡 우선 공유 미리보기 정책 (Meta & OG Policy)
- **간결한 핵심 메타 태그**:
  - 간결하고 명확한 제목("달무티 · 플레이") 및 게임 본질을 설명하는 메타 디스크립션을 수록합니다.
  - 브라우저 주소창 및 상태 표시줄 일체화를 위해 `<meta name="theme-color" content="#FDF4D2">`를 선언합니다.
- **카카오톡 우선 Open Graph**:
  - 카카오톡 인앱 브라우저 스크랩 캐시 정책을 충족하도록 1200x630 고해상도 절대 URL 이미지(`https://qus0in.github.io/the-great-dalmuti/og.png`)를 지정합니다.
  - 제목은 40자 이내, 설명은 80자 이내의 간결한 문구로 구성합니다.
- **트위터 카드**:
  - `twitter:card` (`summary_large_image`) 및 관련 메타 태그를 누락 없이 병행 제공합니다.

#### 6) 에셋 예외 규정 (Asset Exceptions)
- **Why**: 웹 플랫폼 표준(파비콘 멀티사이즈, iOS/안드로이드 홈 화면), PWA 설치 억제 규격 및 메신저(카카오톡, 트위터) 소셜 미리보기 표준을 충족하기 위한 예외입니다.
- **What**: 순수 CSS 무에셋 원칙(No Images)을 기본으로 하되, 다음 6개 정적 파일에 한하여 배포 및 참조를 공식 허용합니다:
  1. `dist/favicon.ico`: 구형 데스크톱 브라우저 탭 및 북마크용 32x32 래스터 아이콘
  2. `dist/favicon.svg`: 모던 브라우저용 팔레트 컬러(크림/로즈) 기반의 카드 형상 벡터 아이콘
  3. `dist/apple-touch-icon.png`: iOS 사파리 홈 화면 추가용 180x180 고해상도 아이콘
  4. `dist/icon-192.png`: 안드로이드 홈 화면 및 PWA 표준 규격 192x192 아이콘
  5. `dist/manifest.webmanifest`: 웹 매니페스트 (`display: "browser"`로 선언하여 브라우저의 원치 않는 PWA 자동 설치 팝업 억제)
  6. `dist/og.png`: 카카오톡 인앱 브라우저 및 트위터 카드용 1200x630 고해상도 소셜 미리보기 이미지
- **How**:
  - HTML `<head>` 내 표준 5종 아이콘/매니페스트 링크 블록을 일관되게 선언합니다.
  - **순수 CSS 페이지 비주얼 (CSS-Only Page Visuals)**: HTML 본문 내 `<img>`, `<picture>`, `<svg>` 태그 및 CSS 파일 내 배경 이미지 `url()` 로딩은 엄격히 금지되며(폰트 선언 `src: url()` 제외), 12계급 카드 아트워크, 좌석 아바타, 테이블 펠트 텍스처 등 모든 시각 요소는 순수 CSS 그라디언트, 보더, 섀도우만으로 렌더링합니다.

#### 7) 헤드리스 브라우저 실측 한계 및 iframe 하네스 검증 정책 (Headless 500px Clamp & Iframe Harness Policy)
- **Why**: Headless Chrome CLI 환경(`--headless=new --window-size=390,844`) 실행 시, 브라우저 렌더러가 최소 레이아웃 너비를 500px로 클램프(clamp)하는 내부 사양이 존재합니다. 이로 인해 `--window-size=390`을 지정하더라도 실제 레이아웃은 500px 너비로 계산된 후 390px 영역만 크롭(crop)되어 캡처되므로, 360~390px 모바일 폰 밴드의 순수한 레이아웃 무오버플로우 여부를 단순 스크린샷만으로 판정하기 어렵습니다.
- **What**: 360~599px 모바일 폰 뷰포트의 실제 반응형 레이아웃 정합성 검증은 iframe 하네스 페이지(목표 뷰포트 치수의 iframe을 생성하고 그 내부의 `innerWidth`와 `scrollWidth`를 실측하는 방식)를 통해 확정합니다 (`ui-prototype` 스킬 연계).
- **How**:
  - 데스크톱(1440x900) 및 태블릿(820x1180, 1180x820)은 500px 클램프의 영향을 받지 않으므로 `shot.sh` 캡처 이미지를 직접 검수합니다.
  - 모바일 환경 검증 시에는 iframe 하네스 프로브를 통해 모든 block 요소의 `min-content <= 342px`(390px 뷰포트에서 좌우 패딩 48px 차감 기준) 및 `scrollWidth == innerWidth` 무오버플로우를 실측합니다.
  - CSS 구현 수준에서는 `word-break: keep-all; overflow-wrap: anywhere;`와 `min-width: 0`을 엄격히 유지하고, 모바일 카드 규격(60x86px)과 장수에 따른 겹침 간격을 적용하여 360px 최소 뷰포트에서도 손패 가로 넘침이 발생하지 않도록 보장합니다.

### 3.7 부록 3: 타이포그래피 리듬 및 컴포넌트 간격 계약 (Addendum 3: Typography Rhythm & Component Spacing)

#### 1) 한국어 우선 행간(Leading) 및 자간(Tracking) 토큰 체계
- **행간(Leading) 규격**:
  - `<code>--leading-tight</code>: 1.25`: 제목 및 디스플레이 헤딩(`h1` ~ `h6`, 브랜드 로고, 카드 인덱스)에 적용하여 글자 간 위아래가 과도하게 벌어지지 않도록 단단한 덩어리감을 형성합니다.
  - `<code>--leading-snug</code>: 1.4`: 레이블, 배지(`.badge`), 버튼(`.btn`), 상태 행(`.seat__status-row`), 안내 문구에 적용하여 좁은 컴포넌트 내부에서도 텍스트가 위아래 테두리에 붙지 않고 균형 있게 중앙에 안착되도록 합니다.
  - `<code>--leading-body</code>: 1.7`: 한국어 본문(`body`, `p`) 전역에 적용하여 음절 및 받침 구조가 복잡한 한글의 시각적 답답함을 해소하고 편안한 가독성을 제공합니다.
- **자간(Tracking) 규격**:
  - 한글 본문 및 제목에 음수 자간(negative letter-spacing)을 적용하면 글자가 엉겨 붙어 가독성을 해치므로, `<code>--tracking-normal</code>: 0` 및 `<code>--tracking-tight</code>: 0`으로 유지합니다.
  - 영문 대문자 약어 및 캡션 레이블에 한하여 `<code>--tracking-caps</code>: 0.05em`를 선언하여 시각적 개방감을 부여합니다.

#### 2) 스택(Stack)을 통한 수직 리듬 일원화
- 텍스트 및 블록 요소가 토큰 간격 없이 맞닿는 마진 해크를 배제하고, CSS Flexbox 기반 스택 유틸리티를 통해 수직 리듬을 규격화합니다:
  - **헤딩 → 관련 본문**: `var(--space-1)`(8px) 또는 `var(--space-2)`(16px)
  - **문단 간 간격**: `var(--space-2)`(16px)
  - **블록 그룹 간격**: `var(--space-3)`(24px) 또는 `var(--space-4)`(32px)
  - **섹션 및 주요 구역 간격**: `var(--space-6)`(48px) 또는 `var(--space-8)`(64px)

#### 3) 소형 텍스트 및 배지(Badge) 최소 규격
- **소형 텍스트 최소 크기**: 보조 설명, 라운드 정보, 배지 등 모든 텍스트는 최소 14px(`--font-size-sm`) 이상(모바일 압축 환경 최소 12px)을 유지하며 `line-height: var(--leading-snug)`를 결합합니다.
- **배지 여백**: 배지 내부 텍스트가 테두리에 밀착되지 않도록 상하 `var(--space-0-5)`(4px), 좌우 `var(--space-1-5)`(12px) 이상의 안전 여백을 필수로 확보합니다.
- **레이블/값 분리**: " · " 문자열이나 단순 공백에만 의존하던 항목 나열을 지양하고, `cluster cluster--sm`(`gap: var(--space-1)`) 구조로 명시적 간격을 제어합니다.

#### 4) 컴포넌트 간격 및 컨테이너 패딩 계약
- **형제 UI 요소 간격(Cluster Gap)**: 툴바 및 버튼 그룹 등 나란히 배치되는 대화형 요소는 최소 `var(--space-2)`(16px) 이상의 간격을 유지하여 오터치와 답답함을 방지합니다 (단, 모바일 화면에서는 48px 이상의 터치 타깃을 유지하는 전제하에 `var(--space-1)` 허용).
- **버튼 규격**: 모든 버튼은 최소 48px(`var(--space-6)`) 이상의 높이(`min-height`)를 보장하며, 좌우 패딩 `var(--space-3)`(24px), 상하 패딩 `var(--space-1)`(8px), 아이콘/레이블 간격 `var(--space-1)`(8px)을 적용합니다.
- **컨테이너 패딩**: 패널(`.panel`), 상단 헤더 HUD(`.play-hud`), 최근 플레이 배너(`.play-action-banner`), 좌석 카드(`.seat`), 하단 조작 영역(`.play-hand-area`)은 데스크톱/태블릿 기준 최소 `var(--space-3)`(24px) 이상, 모바일 기준 최소 `var(--space-2)`(16px) 이상의 내부 패딩을 유지하여 내부 콘텐츠가 테두리에 붙는 현상을 원천 방지합니다.
- **패널 간 외부 간격**: 주요 카드 및 패널 간에는 일관되게 `var(--space-3)`(24px)의 외부 간격을 부여하여 시각적 위계를 확립합니다.

#### 5) 한국어 문단 폭(Measure, 40em)
- 본문 텍스트가 한 줄에 지나치게 길게 늘어지면 줄 바꿈 시 시선 추적이 어려워지므로, `p` 및 `.text-measure` 클래스에 `max-width: 40em`을 적용하여 한국어 독서에 최적화된 문단 폭을 보장합니다.

### 3.8 부록 4: 다자리 숫자(2-digit+) 원형 인장 클리핑 방지 및 박스 모델 계약 (Addendum 4: Multi-digit Clipping Prevention & Box Model Contract)

#### 1) 사용자 버그 원인 분석
- 10, 11, 12 계급 및 "15장", "16장" 등 2자리 이상의 숫자가 원형 인장(`.card__crest`), 플레이어 아바타(`.seat__avatar`), 배지(`.badge`) 내에 렌더링될 때, 고정된 원형 크기(`width: 56px; height: 56px; border-radius: 9999px;`)와 양끝 원호(arc) 곡률로 인해 외곽 글리프가 잘리거나 밀착되는 클리핑 결함이 발생했습니다.

#### 2) 근본 원인 해결 (Content-driven Dynamic Sizing)
- **최소 인라인 규격 및 수평 패딩 (Pill/Ellipse Auto-Expansion)**:
  - 고정 `width` 대신 `min-inline-size: 56px; width: auto; height: 56px; padding-inline: var(--space-1);` 및 `border-radius: var(--radius-full);`을 적용합니다.
  - 1자리 숫자(1~9, 별표 ★)는 56px x 56px 완전한 정원을 유지하며, 2자리 숫자(10, 11, 12)는 내용물에 맞추어 좌우로 자연스럽게 타원(Stadium/Pill) 형태로 팽창하여 테두리 곡선에 글리프가 잘리지 않도록 안전 여백을 확보합니다.
- **모바일 인장 스케일링**:
  - 모바일(390px) 환경에서도 `min-inline-size: 28px; width: auto; height: 28px; padding-inline: var(--space-0-5);`을 통해 동일한 정원/타원 반응형 확장을 제공합니다.
- **클리핑 해제**:
  - 인장 및 아바타, 배지에 `overflow: visible;` 및 `box-sizing: border-box;`를 부여하여 어떠한 상황에서도 글자가 잘려나가지 않도록 합니다.

#### 3) 숫자 타이포그래피 정렬 (Tabular Figures & Leading 1)
- `font-variant-numeric: tabular-nums`를 선언하여 1과 0 등 폭이 다른 숫자 글리프가 일정한 자폭으로 렌더링되도록 균형을 잡습니다.
- 원형 인장 내부 텍스트는 `line-height: 1` 및 `white-space: nowrap`을 강제하여 상하 중앙 정렬 편차를 방지합니다.
- 2자리 전용 모디파이어(`.card--rank-10`, `.card--rank-11`, `.card--rank-12`)를 제공하여 인장 내부 폰트 크기를 `var(--font-size-xl)`(24px)로 정밀 스케일링하고 미세 자간(`letter-spacing: -0.02em`)을 결합합니다.

#### 4) 음수 마진 전면 배제 (Zero Negative Margins)
- 카드 겹침 및 크기 조절 과정에서 사용되던 음수 마진(`margin: calc(-1 * ...);`)을 전면 제거하고, CSS Grid 트래킹 규격 및 `transform: scale()`과 flex 레이아웃으로 대체하여 박스 모델의 엄격한 정합성을 수호합니다.


