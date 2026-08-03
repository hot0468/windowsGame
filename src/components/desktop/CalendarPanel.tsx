import { HudPanel } from './HudPanel'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import { useDesktopPanelStore } from '../../store/desktopPanelStore'
import { HUD_ICONS } from '../../data/icons'
import { CALENDAR_PANEL_LAYOUT, formatGameDate } from '../../data/calendar'

/**
 * 날짜칸. 스탯창 왼쪽에 붙는 바탕화면 상시 패널이다.
 * 스탯창과 마찬가지로 windowStore에 등록하지 않으므로(작업 표시줄 목록·closeAll 회피)
 * z-index는 desktopPanelStore로 관리한다.
 * 크롬은 공용 Window가 아니라 게임 HUD 컨테이너(HudPanel)를 쓴다 — 사유는 HudPanel.tsx 주석 참조.
 *
 * ⚠️ **타이틀 영역이 없다**(설계자 요구). `header`를 넘기지 않으면 HudPanel이
 * 헤더를 아예 렌더하지 않는다. 제목 "날짜"는 화면에 그릴 정보가 아니었다 —
 * 날짜 자체가 바로 아래 24px로 적혀 있어 라벨이 같은 말을 반복했을 뿐이다.
 * 접근성 이름은 `label`이 계속 제공하고, 앞으로 가져오기는 패널 본문 클릭으로 동작한다.
 *
 * 시각 언어는 스탯창과 동일하다: 날짜가 주인공 숫자, 슬롯 칩은 액센트 헤어라인,
 * 구역은 작고 흐린 라벨로 가른다.
 */
export function CalendarPanel() {
  const state = useGameStore((s) => s.state)
  const doSkip = useGameStore((s) => s.doSkip)
  const zIndex = useDesktopPanelStore((s) => s.z.calendar)
  const raise = useDesktopPanelStore((s) => s.raise)
  /* 작업 표시줄 버튼이 끄면 아예 그리지 않는다. 되돌리는 수단은 같은 버튼이다. */
  const visible = useDesktopPanelStore((s) => s.visible.calendar)

  const { width, gap, top } = CALENDAR_PANEL_LAYOUT
  /** 스탯창 바로 왼쪽에 고정한다. 드래그로 옮길 수 없으므로 상태로 들고 있지 않는다. */
  const pos = {
    x: Math.max(8, window.innerWidth - CALENDAR_PANEL_LAYOUT.statPanelReserve - width - gap),
    y: top,
  }

  if (!state || !visible) return null

  const isMorning = state.slot === 'morning'
  const slotIcon = isMorning ? HUD_ICONS.slotMorning : HUD_ICONS.slotAfternoon

  return (
    <HudPanel
      id="calendar"
      label="날짜"
      /* header 없음 = 타이틀 영역 없음. 위 주석 참조. */
      x={pos.x}
      y={pos.y}
      width={width}
      zIndex={zIndex}
      onActivate={() => raise('calendar')}
    >
      {/* 날짜는 이 패널의 주인공이다 — 타입 스케일 최상단(24px) + tabular 숫자로
          한눈에 잡히게 한다(ux `visual-hierarchy`: 크기로 위계를 만든다).
          n일차와 슬롯 칩은 그 아래로 한 단계씩 물러난다. */}
      <div className="cal-date">{formatGameDate(state.day)}</div>
      <div className="cal-meta">
        <span className="cal-day">{state.day}일차</span>
        <span className="cal-slot">
          <AppIcon name={slotIcon} size={13} />
          {isMorning ? '오전' : '오후'}
        </span>
      </div>

      {/* 구역 라벨도 구분선도 없다(설계자 지시). 아래가 버튼 하나뿐이라 무엇인지는
          버튼 글자가 이미 말하고, 선을 그으면 없는 구역을 있는 척하게 된다. */}
      <button
        className="cal-skip"
        onClick={doSkip}
        disabled={state.gameOver !== null}
        title="이 슬롯을 아무것도 하지 않고 넘깁니다"
      >
        <AppIcon name={HUD_ICONS.skipTurn} size={14} />
        {isMorning ? '오전' : '오후'} 건너뛰기
      </button>
    </HudPanel>
  )
}
