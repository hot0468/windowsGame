import { useCallback, useState } from 'react'
import { HudPanel } from './HudPanel'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import { useDesktopPanelStore } from '../../store/desktopPanelStore'
import { useShownTime } from './shownTime'
import { HUD_ICONS } from '../../data/icons'
import {
  BED_TIMES,
  DAY_END,
  DEFAULT_ACTIVITY_MIN,
  formatClock,
  formatSpan,
  sleepBonusFor,
} from '../../data/clock'
import { seasonOf } from '../../data/season'
import { daysLeftInSeason } from '../../systems/season'
import {
  CALENDAR_PANEL_LAYOUT,
  WEEKDAY_LABELS,
  dateOf,
  formatGameDate,
  monthGrid,
} from '../../data/calendar'
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
/** 격자 한 칸의 요일 색. 일요일만 붉고 토요일만 파랗다(한국 달력 관례). */
function weekendClass(weekday: number): string {
  return weekday === 0 ? ' cal-sun' : weekday === 6 ? ' cal-sat' : ''
}

export function CalendarPanel() {
  const state = useGameStore((s) => s.state)
  const doSkip = useGameStore((s) => s.doSkip)
  const sleep = useGameStore((s) => s.doSleep)
  /* 고른 취침 시각. **게임 상태가 아니다** — 판마다 남을 값이 아니고 창을 닫으면 잊어도 된다. */
  const [bed, setBed] = useState<number>(DAY_END)
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
  const { day: shownDay, minute: shownMinute, slot: shownSlot, lagging } = useShownTime()

  const { width, gap, top } = CALENDAR_PANEL_LAYOUT
  /** 스탯창 바로 왼쪽에 고정한다. 드래그로 옮길 수 없으므로 상태로 들고 있지 않는다. */
  const pos = {
    x: Math.max(8, window.innerWidth - CALENDAR_PANEL_LAYOUT.statPanelReserve - width - gap),
    y: top,
  }

  if (!state || !visible) return null

  const season = seasonOf(state.day)
  const seasonLeft = daysLeftInSeason(state.day)

  /* 판이 선 뒤에는 `useShownTime`이 늘 값을 주지만, 타입상 옵셔널이라 실값으로 받친다. */
  const day = shownDay ?? state.day
  const isMorning = (shownSlot ?? state.slot) === 'morning'
  const minute = shownMinute ?? state.minute
  const slotIcon = isMorning ? HUD_ICONS.slotMorning : HUD_ICONS.slotAfternoon
  const weather = weatherOf(day)
  const cells = monthGrid(day)

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
      {/* 날짜는 이 패널의 주인공이고 **오전/오후가 그 옆에 같은 크기로 붙는다**(설계자 지시).
          하루가 두 칸뿐이라 지금이 어느 칸인지가 날짜만큼 중요한 사실인데, 예전에는 아래
          줄의 작은 칩이라 날짜에 눈이 가면 놓쳤다. n일차만 한 단계 아래로 물러난다. */}
      <div className="cal-date">
        {formatGameDate(day)}
        {/* ⚠️ **시각이 곧 남은 하루다**(2026-08-22 분 단위 전환) — 오전/오후만으로는
            "오늘 뭘 더 할 수 있는가"를 알 수 없다. 글리프는 오전·오후를 그대로 진다. */}
        <span className="cal-slot">
          <AppIcon name={slotIcon} size={18} />
          {formatClock(minute)}
        </span>
      </div>
      <div className="cal-meta">
        <span className="cal-day">{day}일차</span>
        {/* ⚠️ **계절이 날짜칸에 있는 이유는 날씨와 같다** — 날짜의 순수 함수이고
            (`data/season.ts`), 저장되지 않는 파생값이라 스탯창에 두면 스탯처럼 읽힌다.
            남은 날을 함께 적는 것이 요점이다: "이번 계절이 끝나간다"가 곧 리듬이다. */}
        <span className="cal-season">
          <AppIcon name={season.icon} size={13} />
          {season.label}
          <span className="cal-season-left">{seasonLeft}일 남음</span>
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

      {/*
       * **이번 달 격자.** 지나온 날은 칠해지고 남은 날은 비어 있다.
       *
       * ⚠️ **날짜칸의 다른 줄과 하는 일이 다르다.** 위의 날짜·슬롯·날씨는 전부 "지금이
       * 언제인가"만 적어서, 3일차 화면과 40일차 화면이 똑같이 생겼다 — 시간이 가는 감각은
       * 지금을 읽는 데서가 아니라 **되돌아오지 않는 것이 쌓이는 걸 볼 때** 온다.
       * 여기가 그 누적을 지는 유일한 자리다. 숫자를 하나 더 적는 것으로 대신하지 말 것.
       *
       * 주말이 색으로 갈라지는 것도 같은 이유다(일=붉게, 토=파랗게). 요일은 `formatGameDate`가
       * 글자로 이미 적지만, 글자로는 **일주일이 흘렀다**가 안 읽힌다.
       *
       * ⚠️ **스크린 리더에서는 감춘다.** 42칸을 읽히면 소음이고, 이 격자가 나르는 사실
       * (오늘이 며칠·몇 일차)은 바로 위 두 줄이 이미 글자로 말한다.
       */}
      <div className="cal-grid" aria-hidden="true">
        {WEEKDAY_LABELS.map((label, w) => (
          <span key={label} className={`cal-cell cal-head${weekendClass(w)}`}>
            {label}
          </span>
        ))}
        {cells.map((cellDay, i) => (
          <span
            key={i}
            className={
              cellDay === null
                ? 'cal-cell'
                : `cal-cell${weekendClass(i % 7)}` +
                  (cellDay < day ? ' cal-past' : cellDay === day ? ' cal-today' : '')
            }
          >
            {cellDay === null ? '' : dateOf(cellDay).getDate()}
          </span>
        ))}
      </div>

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
        {formatSpan(DEFAULT_ACTIVITY_MIN)} 건너뛰기
      </button>

      {/* ⚠️ **자러 가기가 하루를 끝내는 유일한 통로다**(2026-08-22 분 단위 전환) —
          밤 11시에 2시간씩 눌러 하루를 마감하게 두면 그건 조작이 아니라 노동이다.
          회복 중에도 눌러야 한다(회복은 하루가 끝날 때만 줄어든다).

          ⚠️ **몇 시에 눕는지 고른다**(2026-08-22 설계자 지시). 일찍 누우면 남은 시간을
          버리는 대신 더 회복한다 — 고르기 판은 **네이티브 `<select>`**다(커스텀 토글을
          안 만들어야 키보드·스크린 리더가 공짜로 붙는다, O넷 라디오와 같은 판단).
          ⚠️ **이미 지난 시각은 목록에서 뺀다** — 누를 수 있는데 아무 일도 안 하는 항목이
          제일 나쁘다. 그래서 자정은 언제나 남는다(늘 고를 수 있는 하나). */}
      <div className="cal-bed">
        <label className="cal-bed-label" htmlFor="cal-bed-time">
          취침
        </label>
        <select
          id="cal-bed-time"
          className="cal-bed-select"
          value={bed}
          onChange={(e) => setBed(Number(e.target.value))}
          disabled={autoRunning || lagging}
        >
          {BED_TIMES.filter((t) => t >= minute || t === DAY_END).map((t) => (
            <option key={t} value={t}>
              {t === DAY_END ? '자정' : formatClock(t)} · 회복 {Math.round(sleepBonusFor(t) * 100)}%
            </option>
          ))}
        </select>
      </div>
      <button
        className="cal-skip"
        onClick={() => sleep(bed)}
        disabled={autoRunning || lagging}
        title="고른 시각에 눕고 하루를 끝냅니다"
      >
        <AppIcon name={HUD_ICONS.skipTurn} size={14} />
        자러 가기
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
