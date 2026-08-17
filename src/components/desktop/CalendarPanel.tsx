import { useCallback } from 'react'
import { HudPanel } from './HudPanel'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import { useDesktopPanelStore } from '../../store/desktopPanelStore'
import { useShownTime } from './shownTime'
import { HUD_ICONS } from '../../data/icons'
import { CALENDAR_PANEL_LAYOUT, formatGameDate } from '../../data/calendar'
import { weatherOf } from '../../systems/weather'

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
  /*
   * 자동 진행 컨트롤이 **여기** 있는 이유(스케줄러 창이 아니라):
   *  1) 건너뛰기와 같은 동사다 — "한 슬롯 넘기기"와 "멈출 때까지 넘기기"는 규모만 다른
   *     같은 행동이라 서로 붙어 있어야 관계가 읽힌다. 일정 창은 **계획을 짜는 곳**이지
   *     시간을 미는 곳이 아니다.
   *  2) ⚠️ **멈추기 버튼은 언제나 화면에 있어야 한다.** 창 안에 두면 그 창을 닫는 순간
   *     멈출 수단이 사라진다 — 끊을 수 없는 빨리 감기는 기능이 아니라 함정이다.
   *     날짜칸은 바탕화면 상시 패널이라 창에 가려져도 작업 표시줄 버튼으로 되찾을 수 있다.
   */
  const autoRunning = useGameStore((s) => s.autoRunning)
  const autoSlots = useGameStore((s) => s.autoSlots)
  const autoRun = useGameStore((s) => s.autoRun)
  const startAuto = useGameStore((s) => s.startAuto)
  const stopAuto = useGameStore((s) => s.stopAuto)
  const zIndex = useDesktopPanelStore((s) => s.z.calendar)
  const raise = useDesktopPanelStore((s) => s.raise)
  /* 작업 표시줄 버튼이 끄면 아예 그리지 않는다. 되돌리는 수단은 같은 버튼이다. */
  const visible = useDesktopPanelStore((s) => s.visible.calendar)
  /* ⚠️ **자기 높이를 알린다** — 지갑칸이 바로 아래에 서는데 이 패널은 자동 진행 문구가
     붙었다 떨어졌다 하며 키가 변한다(`WalletPanel` 머리말). 셀렉터로 액션 하나만 고르므로
     참조가 안정적이고, 그래서 `HudPanel`의 effect가 매 렌더 다시 돌지 않는다. */
  const setHeight = useDesktopPanelStore((s) => s.setHeight)
  /* ⚠️ `useCallback`이 필수다 — 매 렌더 새 함수를 넘기면 `HudPanel`의 effect가 매번
     `ResizeObserver`를 끊었다 다시 건다(무한 루프는 아니지만 순수한 낭비다). */
  const reportHeight = useCallback((h: number) => setHeight('calendar', h), [setHeight])
  /* ⚠️ **날짜·슬롯은 `state`가 아니라 여기서 읽는다** — 결과 창이 떠 있는 동안은 행동
     직전의 시각에 머문다(사유는 `shownTime.ts`). `lagging`이면 턴을 미는 버튼 둘을
     잠근다: 화면이 오전이라고 적는 동안 [오전 건너뛰기]가 오후를 태우면 안 된다. */
  const { day: shownDay, slot: shownSlot, lagging } = useShownTime()

  const { width, gap, top } = CALENDAR_PANEL_LAYOUT
  /** 스탯창 바로 왼쪽에 고정한다. 드래그로 옮길 수 없으므로 상태로 들고 있지 않는다. */
  const pos = {
    x: Math.max(8, window.innerWidth - CALENDAR_PANEL_LAYOUT.statPanelReserve - width - gap),
    y: top,
  }

  if (!state || !visible) return null

  /* 판이 선 뒤에는 `useShownTime`이 늘 값을 주지만, 타입상 옵셔널이라 실값으로 받친다. */
  const day = shownDay ?? state.day
  const isMorning = (shownSlot ?? state.slot) === 'morning'
  const slotIcon = isMorning ? HUD_ICONS.slotMorning : HUD_ICONS.slotAfternoon
  const weather = weatherOf(day)

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
      onHeight={reportHeight}
    >
      {/* 날짜는 이 패널의 주인공이다 — 타입 스케일 최상단(24px) + tabular 숫자로
          한눈에 잡히게 한다(ux `visual-hierarchy`: 크기로 위계를 만든다).
          n일차와 슬롯 칩은 그 아래로 한 단계씩 물러난다. */}
      <div className="cal-date">{formatGameDate(day)}</div>
      <div className="cal-meta">
        <span className="cal-day">{day}일차</span>
        <span className="cal-slot">
          <AppIcon name={slotIcon} size={13} />
          {isMorning ? '오전' : '오후'}
        </span>
      </div>

      {/*
       * 오늘 날씨. **날짜칸에 있는 이유는 날씨가 날짜의 순수 함수라서다**(저장되지 않는
       * 파생값이므로 스탯창에 두면 스탯처럼 읽힌다 — `systems/weather.ts`).
       *
       * ⚠️ **아이콘만으로 알리지 않는다**(ux `color-not-only`): 이름과 보정폭을 글자로 적는다.
       * 야외 활동만 영향을 받으므로 그 문장도 날씨가 직접 갖고 있다(`Weather.note`).
       */}
      <p className="cal-weather" title={weather.note}>
        <AppIcon name={weather.icon} size={13} />
        <span className="cal-weather-label">{weather.label}</span>
        <span className="cal-weather-note">{weather.note}</span>
      </p>

      {/* 구역 라벨도 구분선도 없다(설계자 지시). 아래가 버튼 하나뿐이라 무엇인지는
          버튼 글자가 이미 말하고, 선을 그으면 없는 구역을 있는 척하게 된다. */}
      {/* ⚠️ **주저앉아 있을 때도 눌려야 한다**(2026-08-14). 예전에는 게임오버면 막았는데,
          지금 회복은 **턴을 넘겨야 끝난다** — 여기서 막으면 유일한 탈출구가 사라져
          로직이 멀쩡해도 화면에서 갇힌다. 자동 진행 중에만 막는다(그쪽이 이미 넘기고 있다). */}
      <button
        className="cal-skip"
        onClick={doSkip}
        disabled={autoRunning || lagging}
        title={
          lagging
            ? '결과 창을 확인하면 시간이 넘어갑니다'
            : state.recovery
              ? '주저앉은 동안에는 이것만 할 수 있습니다. 넘길수록 회복이 가까워집니다'
              : '이 슬롯을 아무것도 하지 않고 넘깁니다'
        }
      >
        <AppIcon name={HUD_ICONS.skipTurn} size={14} />
        {isMorning ? '오전' : '오후'} 건너뛰기
      </button>

      {/* 자동 진행 ↔ 멈추기. **같은 자리에서 상태만 바뀐다** — 두 버튼을 나란히 두면
          달리지 않는 동안 아무 일도 하지 않는 버튼이 하나 늘 떠 있게 된다.
          멈추기는 파괴적 행동이 아니므로 확인을 받지 않는다(누르면 그 자리에서 서고,
          다시 누르면 이어서 간다). */}
      <button
        className={`cal-skip cal-auto${autoRunning ? ' cal-auto-on' : ''}`}
        onClick={autoRunning ? stopAuto : startAuto}
        /* 자동 진행은 회복 중에 막는다 — 모르는 사이 회복이 지나가면 무슨 일이
           있었는지 못 본다(`autoAdvance.ts`의 첫 정지 규칙과 같은 판단). */
        disabled={state.recovery !== null || lagging}
        title={
          lagging
            ? '결과 창을 확인하면 시간이 넘어갑니다'
            : autoRunning
              ? '지금 슬롯까지만 진행하고 멈춥니다'
              : '예약해 둔 계획을 따라 계속 진행합니다. 결정이 필요한 일이 생기면 스스로 멈춥니다'
        }
      >
        <AppIcon name={autoRunning ? HUD_ICONS.autoStop : HUD_ICONS.autoRun} size={14} />
        {autoRunning ? '멈추기' : '자동 진행'}
      </button>

      {/*
       * 달리는 동안은 **어디까지 왔는가**(ux `Progress Indicators`: 다단계 과정은 진행을
       * 보여 준다), 멈춘 뒤에는 **왜 멈췄는가**를 같은 자리에 적는다.
       *
       * ⚠️ 진행 표시에는 `role="status"`를 붙이지 않는다 — 120ms마다 바뀌는 값을
       * 스크린 리더에 읽히면 소음이다. 확정된 결과에만 붙인다.
       */}
      {autoRunning ? (
        <p className="cal-auto-note">
          {day}일차 {isMorning ? '오전' : '오후'} · {autoSlots}슬롯 진행 중
        </p>
      ) : (
        autoRun?.stop && (
          <p className="cal-auto-note cal-auto-done" role="status">
            {autoRun.stop.text}
          </p>
        )
      )}
    </HudPanel>
  )
}
