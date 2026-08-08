import { HudPanel, HudSection } from './HudPanel'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import { useDesktopPanelStore } from '../../store/desktopPanelStore'
import { getLivingCost, getNextTier, tierCostFor } from '../../systems/economy'
import { STAMINA_CAP, growthCap } from '../../systems/turn'
import { rankOf, toNextRank } from '../../systems/rank'
import { isIll } from '../../systems/illness'
import { ILL_EFFICIENCY } from '../../data/illness'
import type { StatRank } from '../../systems/rank'
import { CALENDAR_PANEL_LAYOUT } from '../../data/calendar'
import { STAT_META, GROWTH_STAT_ORDER } from '../../data/statMeta'
import { HUD_ICONS } from '../../data/icons'
import { STAT_NAMES } from '../../types/game'
import type { GrowthStatKey, Stats } from '../../types/game'

/**
 * 등급 뱃지. 판정은 전부 `systems/rank.ts`가 하고 여기서는 **글자로 옮기기만** 한다.
 *
 * ⚠️ **색으로 등급을 말하지 않는다**(ux `color-not-only`, 이 패널의 "액센트는 하나" 규칙).
 * 글자 자체가 F·C·B·A·S·SS라 이미 순서가 읽히고, 여섯 색을 흩뿌리면 스탯별 색을
 * 걷어낸 이유가 그대로 되돌아온다. 상위 두 등급(S·SS)만 **같은 액센트를 진하게** 채워
 * "여기까지 왔다"를 표시한다 — 다른 색이 아니라 같은 색의 강도다.
 */
function RankBadge({ rank, title }: { rank: StatRank; title: string }) {
  const top = rank === 'S' || rank === 'SS'
  return (
    <span className={`stat-rank${top ? ' stat-rank-top' : ''}`} title={title}>
      {rank}
    </span>
  )
}

/** 뱃지 툴팁 문구. "다음까지 얼마"를 함께 적어야 등급이 장식이 아니라 목표가 된다. */
function rankTitle(key: GrowthStatKey, value: number): string {
  const need = toNextRank(key, value)
  const head = `${STAT_NAMES[key]} 등급 ${rankOf(key, value)}`
  return need === undefined ? `${head} (최고 등급)` : `${head} — 다음 등급까지 ${need}`
}

/**
 * 상한이 실제로 의미 있는 자원 스탯(행동력·멘탈·체력)만 게이지로 보여준다.
 * 소지금은 상한이 없으므로 숫자만 표시한다.
 *
 * 레이아웃: `글리프 + 한국어 라벨` 왼쪽, **큰 우측 정렬 숫자**가 오른쪽.
 * 게이지는 줄 안에 끼워 넣지 않고 그 아래 전폭 막대로 깐다 —
 * 줄 가운데 막대를 넣으면 숫자 자리가 좁아져 "숫자가 주인공"이라는 위계가 무너진다.
 */
function ResourceRow({
  statKey,
  value,
  max,
  suffix = '',
  warn = false,
  rankKey,
}: {
  statKey: keyof Stats
  value: number
  max?: number
  suffix?: string
  warn?: boolean
  /**
   * 등급을 함께 보여줄 성장 스탯 키. **소모 자원에는 넘기지 않는다** —
   * 행동력·멘탈은 매 턴 오르내리는 잔량이라 "등급"이라는 말이 성립하지 않는다
   * (오늘 일했다고 행동력 F가 되는 것이 아니다). 등급은 **쌓아 올린 것**의 척도다.
   */
  rankKey?: GrowthStatKey
}) {
  const { hudIcon } = STAT_META[statKey]
  return (
    <div className="stat-row">
      <div className="stat-row-line">
        {/* 외곽선 변형은 채워진 변형보다 시각 무게가 가볍다 — 크기를 한 단 올려 보정한다. */}
        <AppIcon name={hudIcon} size={15} className="stat-icon" />
        <span className="stat-label">{STAT_NAMES[statKey]}</span>
        {rankKey && (
          <RankBadge rank={rankOf(rankKey, value)} title={rankTitle(rankKey, value)} />
        )}
        <span className={`stat-value${warn ? ' stat-warn' : ''}`}>
          {value.toLocaleString('ko-KR')}
          {/* 막대가 있는 줄은 상한도 함께 적는다(설계자 지시) — 막대만으로는
              "얼마나 남았나"는 보여도 "끝이 어디냐"는 읽히지 않는다.
              상한은 작고 흐리게 떨어뜨려 주인공 숫자를 가리지 않게 한다. */}
          {max !== undefined && (
            <span className="stat-max">/{max.toLocaleString('ko-KR')}</span>
          )}
          {suffix && <span className="stat-unit">{suffix}</span>}
        </span>
      </div>
      {max !== undefined && (
        <span className="stat-bar">
          {/* width 대신 scaleX로 채운다 — width 전환은 매 프레임 레이아웃을 다시 계산시킨다.
              색은 CSS의 --hud-accent 하나뿐이라 인라인 style은 채움 비율만 나른다
              (예전에는 스탯별 accent와 boxShadow 글로우를 여기서 주입했다). */}
          <span
            className="stat-fill"
            style={{ transform: `scaleX(${Math.min(1, value / max)})` }}
          />
        </span>
      )}
    </div>
  )
}

/**
 * 성장 스탯 한 칸. 상한이 999라 게이지는 대부분 빈 막대로 보여 정보가 되지 않으므로,
 * 글리프 + 이름 + 숫자만 담아 2열 그리드에 배치한다.
 *
 * ⚠️ 칸에 **옅은 배경**이 깔린다(설계자 지시. 예전의 "배경도 테두리도 없다" 규칙은 뒤집혔다).
 * 색은 전부 같다 — 스탯별 9색을 시험했다가 한 색으로 되돌렸다(Desktop.css의 .stat-cell 주석).
 */
function GrowthCell({ statKey, value }: { statKey: GrowthStatKey; value: number }) {
  const { hudIcon } = STAT_META[statKey]
  return (
    <div className="stat-cell" title={rankTitle(statKey, value)}>
      <AppIcon name={hudIcon} size={14} className="stat-icon" />
      <span className="stat-cell-name">{STAT_NAMES[statKey]}</span>
      {/* 게이지가 없는 칸이라 **등급이 곧 게이지다** — 999 상한에서 숫자 137이 어디쯤인지
          말해 주는 것이 여기서는 이 한 글자뿐이다. */}
      <RankBadge rank={rankOf(statKey, value)} title={rankTitle(statKey, value)} />
      <span className="stat-cell-value">{value}</span>
    </div>
  )
}

export function StatPanel() {
  const state = useGameStore((s) => s.state)
  /**
   * 스탯창은 windowStore에 등록되지 않으므로 z-index를 직접 소유한다.
   * 위치는 우상단 고정이며 드래그로 옮길 수 없으므로 상태로 들고 있지 않는다.
   */
  const pos = {
    x: Math.max(8, window.innerWidth - CALENDAR_PANEL_LAYOUT.statPanelReserve),
    y: CALENDAR_PANEL_LAYOUT.top,
  }
  const zIndex = useDesktopPanelStore((s) => s.z.stats)
  const raise = useDesktopPanelStore((s) => s.raise)
  /* 작업 표시줄 버튼이 끄면 아예 그리지 않는다. 되돌리는 수단은 같은 버튼이다. */
  const visible = useDesktopPanelStore((s) => s.visible.stats)
  if (!state || !visible) return null

  const { stats, day } = state
  const nextTier = getNextTier(day)
  const ill = isIll(state)

  return (
    <HudPanel
      id="stats"
      /* 날짜칸과 달리 헤더를 유지한다 — 제목이 플레이어 이름(= 실제 정보)이라
         지우면 정보가 사라진다. 반복되는 라벨("날짜")이었던 쪽만 지웠다. */
      label={state.playerName}
      header
      x={pos.x}
      y={pos.y}
      /* ⚠️ 실측값이다. 성장 스탯 칸이 '예의범절 + 999'를 자르지 않으려면 칸당 135px이
         필요한데(아이콘 14 + 이름 38 + 등급 22 + 값 27 + 간격 18 + 패딩 16),
         280px일 때 칸은 115px뿐이라 값이 세 자리가 되는 순간 라벨이 잘렸다.
         줄이려면 `.stat-cell-value`의 min-width부터 다시 재라.
         ⚠️ `CALENDAR_PANEL_LAYOUT.statPanelReserve`가 이 값 + 16이어야 한다(테스트가 지킨다). */
      width={320}
      zIndex={zIndex}
      onActivate={() => raise('stats')}
    >
      {/* 1구역: 매 턴 변하고 상한이 의미 있는 자원 — 게이지로 한눈에 본다.
          구역 라벨("자원")은 설계자가 걷어냈다. 여기는 본문 첫 줄이라 위쪽 헤어라인도
          필요 없어 HudSection 자체를 빼 버린다 — 헤더 아래 구분선이 이미 경계다. */}
      {/*
       * 앓는 중 배지. **행동력 바로 위인 것이 규칙이다** — 아픔이 깎는 것이 회복과 효율이라
       * 그 두 게이지 옆에서 읽혀야 인과가 보인다.
       *
       * ⚠️ **아프지 않으면 아예 그리지 않는다**(빈 자리를 남기지 않는다 — 늘 떠 있는
       * "건강함" 배지는 아무것도 알리지 않으면서 매일 자리를 먹는다).
       * ⚠️ 색만으로 알리지 않는다: 남은 날과 무엇이 줄어드는지를 글자로 적는다.
       * `role="status"`를 붙인 것은 이 줄이 **나타나는 것 자체가 소식**이기 때문이다
       * (아픔은 토스트도 알림창도 쓰지 않는다 — `activityPreview.ts`의 경고가 예고를 맡는다).
       */}
      {ill && (
        <p className="stat-ill" role="status">
          <AppIcon name={HUD_ICONS.illness} size={15} />
          <span className="stat-ill-title">앓는 중</span>
          <span className="stat-ill-note">
            {state.illness!.daysLeft}일 남음 · 회복 절반 · 얻는 것 {Math.round(ILL_EFFICIENCY * 100)}%
          </span>
        </p>
      )}
      {/* ⚠️ 자원 줄이 둘이다(2026-08-08 통합 전에는 행동력·체력이 따로 있어 셋이었다).
          몸을 키운 결과는 아래 성장 스탯의 **운동**이 진다. */}
      <ResourceRow statKey="stamina" value={stats.stamina} max={STAMINA_CAP} />
      <ResourceRow statKey="mental" value={stats.mental} max={100} warn={stats.mental <= 20} />
      {/* 평판은 성장 스탯이지만 자원 줄에 둔다(설계자 지시).
          상한이 999라 게이지는 의미가 없으므로 max 없이 숫자만 보여준다. */}
      {/* 막대 기준은 실제 상한이다 — growthCap()이 클램프와 같은 값을 주므로
          표시와 규칙이 어긋날 수 없다(평판·도덕·예의범절은 100, 나머지 성장 스탯은 999).
          ⚠️ 이 둘만 등급을 함께 단다 — 위의 체력·멘탈은 잔량이지 쌓은 것이 아니다. */}
      <ResourceRow
        statKey="reputation"
        value={stats.reputation}
        max={growthCap('reputation')}
        rankKey="reputation"
      />
      <ResourceRow
        statKey="morality"
        value={stats.morality}
        max={growthCap('morality')}
        rankKey="morality"
      />
      {/* ⚠️ 예의범절은 상한이 100이라 여기가 어울려 보이지만 **그리드에 있다** —
          자원 줄 한 칸은 게이지까지 약 46px이라 720px 화면에서 스탯창에 세로 스크롤바가
          생긴다(실측). 사유는 `data/statMeta.ts`의 RESOURCE_ROW_STATS 주석. */}

      {/* 2구역: 성장 스탯 그리드(평판을 뺀 8종). 2열로 압축해 창 높이를 억제하되,
          3열일 때처럼 숫자가 짓눌리지 않게 한 칸의 폭을 넉넉히 준다. */}
      {/* 라벨 없이 구분선만 — 생활비 구역과 같은 형태다(설계자 지시). */}
      <HudSection />
      <div className="stat-grid">
        {GROWTH_STAT_ORDER.map((key) => (
          <GrowthCell key={key} statKey={key} value={stats[key]} />
        ))}
      </div>

      {/* 3구역: 생계. 소지금이 여기 머리에 온다(설계자 지시) — 버는 돈과 나가는 돈이
          한 구역에 모여야 "이 달을 버틸 수 있나"가 한눈에 읽힌다.
          라벨 없이 구분선만 두는 것은 다른 구역과 같다. */}
      <HudSection />
      <ResourceRow
        statKey="money"
        value={stats.money}
        suffix="원"
        warn={stats.money <= 100000}
      />
      {/* ⚠️ 두 줄 다 **지금 사는 집의 배율**을 탄 금액이다(`getLivingCost`/`tierCostFor`).
          한쪽만 기준 금액을 적으면 이사한 플레이어에게 "오늘 21,600원 → 5일 후 60,000원"처럼
          말이 안 되는 예고가 뜬다. */}
      <div className="stat-note">
        <span className="stat-note-row">
          <span>오늘 생활비</span>
          <span className="stat-note-num">{getLivingCost(state).toLocaleString('ko-KR')}원</span>
        </span>
        <span className="stat-note-row">
          <span>{nextTier.day - day}일 후 인상</span>
          <span className="stat-note-num">
            {tierCostFor(state, nextTier).toLocaleString('ko-KR')}원
          </span>
        </span>
      </div>
    </HudPanel>
  )
}
