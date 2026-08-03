import { formatGameDate } from '../../data/calendar'
import { UI_ICONS } from '../../data/icons'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import { useDesktopPanelStore } from '../../store/desktopPanelStore'
import { useWindowStore } from '../../store/windowStore'
import type { DesktopPanelId } from '../../store/desktopPanelStore'
import type { IconName } from '../../types/game'

/**
 * 바탕화면 상시 패널을 다시 앞으로 가져오는 버튼 목록.
 * 이 패널들은 일반 창에 가려지므로(바탕화면 요소이므로 정상), 이 버튼이 되찾는 수단이다.
 *
 * 아이콘은 `mdi-light` **라인 글리프**다 — 여기는 시스템 트레이 자리이고,
 * 실제 윈도우 11의 트레이 글리프도 전부 가는 단색 선이다. (사유는 data/icons.ts 참조)
 */
const PANEL_BUTTONS: { id: DesktopPanelId; label: string; icon: IconName }[] = [
  { id: 'calendar', label: '날짜', icon: UI_ICONS.calendarPanel },
  { id: 'stats', label: '스탯', icon: UI_ICONS.statPanel },
]

export function Taskbar() {
  const state = useGameStore((s) => s.state)
  const windows = useWindowStore((s) => s.windows)
  /** 실제 윈도우처럼 최소화된 창이면 복원하고, 아니면 앞으로 가져온다. */
  const activate = useWindowStore((s) => s.activate)
  const raise = useDesktopPanelStore((s) => s.raise)

  if (!state) return null

  const isMorning = state.slot === 'morning'

  return (
    <div className="taskbar">
      {/* 윈도우 11처럼 시작 버튼+창 목록을 가운데 정렬한다.
          패널 버튼·시계는 윈도우에서도 우측 트레이에 고정되는 요소라 가운데로 끌고 오지 않는다.
          이 스페이서가 오른쪽 트레이와 같은 폭을 차지해 가운데 묶음을 광학적 중심에 맞춘다. */}
      <div className="taskbar-spacer" aria-hidden="true" />

      {/* 시작 버튼도 트레이와 같은 mdi-light 라인 글리프다 — 사유는 data/icons.ts 참조
          (다색 격자는 아크릴 위에서 1.03:1로 사실상 보이지 않았다). */}
      <button className="taskbar-start" aria-label="시작">
        <AppIcon name={UI_ICONS.start} size={22} />
      </button>

      <div className="taskbar-items">
        {windows.map((w) => (
          <button
            key={w.id}
            // 최소화된 창은 실제 윈도우처럼 밑줄 표시를 흐리게 해 화면에 없음을 알린다.
            className={w.minimized ? 'taskbar-item taskbar-item-min' : 'taskbar-item'}
            onClick={() => activate(w.id)}
            title={w.minimized ? `${w.title} — 복원` : w.title}
          >
            <AppIcon name={w.icon} size={16} />
            {w.title}
          </button>
        ))}
      </div>

      {/* 우측 트레이: 패널 버튼 + 시계. 윈도우의 시스템 트레이 위치와 같다. */}
      <div className="taskbar-tray">
        {/* 시계 왼쪽: 바탕화면 패널 되돌리기 버튼. 열린 창 목록과는 성격이 달라 구역을 나눈다. */}
        <div className="taskbar-panels">
          {PANEL_BUTTONS.map((panel) => (
            <button
              key={panel.id}
              className="taskbar-panel"
              onClick={() => raise(panel.id)}
              title={`${panel.label}창을 맨 앞으로 가져옵니다`}
              aria-label={`${panel.label}창을 맨 앞으로`}
            >
              {/* mdi-light는 획이 아주 가늘어 16px에서는 흐릿하다 — 트레이 글리프의
                  표준 크기(20px)로 그려 형태와 대비를 살린다. */}
              <AppIcon name={panel.icon} size={20} />
            </button>
          ))}
        </div>

        {/* 실제 윈도우처럼 작업 표시줄에는 시계만 남긴다. 넘기기는 날짜칸으로 옮겼다.
            해·달 글리프는 제거했다 — 바로 옆 글자가 이미 "오전/오후"라 정보가 중복이고,
            트레이가 mdi-light 라인 글리프로 통일된 마당에 다색 이모지 하나만 남으면
            그 자리가 가장 먼저 눈에 띈다(`icon-style-consistent`).
            실제 윈도우 11 시계도 글리프 없는 텍스트다. */}
        <div className="taskbar-clock">
          {formatGameDate(state.day)}
          <br />
          <span className="taskbar-slot">
            {state.day}일차 {isMorning ? '오전' : '오후'}
          </span>
        </div>
      </div>
    </div>
  )
}
