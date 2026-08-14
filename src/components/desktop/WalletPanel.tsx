import { HudPanel } from './HudPanel'
import { ResourceRow } from './StatPanel'
import { useGameStore } from '../../store/gameStore'
import { useDesktopPanelStore } from '../../store/desktopPanelStore'
import { getLivingCost, getNextTier, tierCostFor } from '../../systems/economy'
import { CALENDAR_PANEL_LAYOUT } from '../../data/calendar'

/**
 * 지갑칸 — **날짜칸 바로 아래에 서는 세 번째 바탕화면 패널**(2026-08-14, 설계자 지시).
 *
 * ## 왜 떼어 냈나
 * 소지금·생활비는 원래 스탯창의 마지막 구역이었다. 성장 스탯이 열다섯으로 늘면서 그
 * 패널이 화면보다 길어졌고, **잘리는 것이 하필 소지금 줄**이었다 — 이 게임에서 판을
 * 이끄는 숫자이자 파산이 걸린 값이라 잘려서는 안 되는 유일한 줄이다.
 * ⚠️ **스탯창으로 되돌리지 말 것.** 되돌리면 스탯을 하나 더할 때마다 같은 자리에서
 * 다시 잘린다(스탯창은 세로 스크롤바가 뜨면 안 된다는 규칙이 따로 있어 도망갈 곳도 없다).
 *
 * ## 지키는 것
 * ⚠️ **새 시각 언어가 아니다.** 스탯창·날짜칸과 같은 `HudPanel` + 같은 `--hud-*` 토큰 +
 * 같은 `.stat-*` 부품(`ResourceRow`·`.stat-note`)을 쓴다. 소지금 줄이 스탯창에 있을 때와
 * **픽셀 단위로 같은 모양**이어야 "옮겼다"가 되고, 다시 그리면 "새로 만들었다"가 된다.
 *
 * ⚠️ **`y`를 상수로 박지 않는다.** 날짜칸은 자동 진행 문구가 붙었다 떨어졌다 하며 키가
 * 변해서, 고정 오프셋은 겹치거나 빈 띠를 남긴다. 날짜칸이 `HudPanel.onHeight`로 넣어 둔
 * 실제 높이를 읽는다(`desktopPanelStore.heights`).
 *
 * ⚠️ **날짜칸을 끄면 위로 올라온다.** 작업 표시줄 버튼으로 날짜칸을 숨겼는데 지갑칸만
 * 허공에 떠 있으면 그 빈자리가 버그로 읽힌다.
 */
export function WalletPanel() {
  const state = useGameStore((s) => s.state)
  const zIndex = useDesktopPanelStore((s) => s.z.wallet)
  const raise = useDesktopPanelStore((s) => s.raise)
  /* 작업 표시줄 버튼이 끄면 아예 그리지 않는다. 되돌리는 수단은 같은 버튼이다. */
  const visible = useDesktopPanelStore((s) => s.visible.wallet)
  const calendarVisible = useDesktopPanelStore((s) => s.visible.calendar)
  const calendarHeight = useDesktopPanelStore((s) => s.heights.calendar)

  const { width, gap, top, statPanelReserve } = CALENDAR_PANEL_LAYOUT
  /** 날짜칸과 **같은 열**이다 — x와 width를 그쪽과 같은 상수에서 뽑는다. */
  const pos = {
    x: Math.max(8, window.innerWidth - statPanelReserve - width - gap),
    /* 첫 렌더에는 잰 값이 없다(0으로 폴백) — 날짜칸이 자기 높이를 알리는 즉시 제자리로 간다. */
    y: calendarVisible ? top + (calendarHeight ?? 0) + gap : top,
  }

  if (!state || !visible) return null

  const { day } = state
  const nextTier = getNextTier(day)

  return (
    <HudPanel
      id="wallet"
      /* ⚠️ **헤더가 없다**(설계자 지시, 날짜칸과 같은 규칙). "지갑"이라는 제목은 바로 아래
         `소지금` 줄이 이미 하는 말이라 같은 말의 반복이었다. `label`은 계속 넘긴다 —
         제목을 안 그리면 `HudPanel`이 이 값을 `aria-label`로 쓰므로, 지우면 스크린 리더에서
         이름 없는 영역이 된다. */
      label="지갑"
      x={pos.x}
      y={pos.y}
      width={width}
      zIndex={zIndex}
      onActivate={() => raise('wallet')}
    >
      <ResourceRow statKey="money" value={state.stats.money} suffix="원" warn={state.stats.money <= 100000} />
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
