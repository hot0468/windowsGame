import { useState } from 'react'
import { formatGameDate } from '../../data/calendar'
import { UI_ICONS } from '../../data/icons'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import { useDesktopIconStore } from '../../store/desktopIconStore'
import { useDesktopPanelStore } from '../../store/desktopPanelStore'
import { useWindowStore } from '../../store/windowStore'
import type { DesktopPanelId } from '../../store/desktopPanelStore'
import type { IconName } from '../../types/game'
import { StartMenu } from './StartMenu'

/**
 * 바탕화면 상시 패널을 다시 앞으로 가져오는 버튼 목록.
 * 이 패널들은 일반 창에 가려지므로(바탕화면 요소이므로 정상), 이 버튼이 되찾는 수단이다.
 *
 * 아이콘은 `mdi-light` **라인 글리프**다 — 여기는 시스템 트레이 자리이고,
 * 실제 윈도우 11의 트레이 글리프도 전부 가는 단색 선이다. (사유는 data/icons.ts 참조)
 */
const PANEL_BUTTONS: { id: DesktopPanelId; label: string; icon: IconName }[] = [
  { id: 'calendar', label: '날짜', icon: UI_ICONS.calendarPanel },
  /* 지갑칸은 날짜칸 아래에 붙는 같은 열이라 버튼도 그 옆이다(화면 배치와 같은 순서). */
  { id: 'wallet', label: '지갑', icon: UI_ICONS.walletPanel },
  { id: 'stats', label: '스탯', icon: UI_ICONS.statPanel },
]

export function Taskbar() {
  /** 시작 메뉴 열림 상태. 화면 장식이라 스토어에 올리지 않는다. */
  const [startOpen, setStartOpen] = useState(false)
  const state = useGameStore((s) => s.state)
  const windows = useWindowStore((s) => s.windows)
  /** 실제 윈도우처럼 최소화된 창이면 복원하고, 아니면 앞으로 가져온다. */
  const activate = useWindowStore((s) => s.activate)
  const toggle = useDesktopPanelStore((s) => s.toggle)
  const panelVisible = useDesktopPanelStore((s) => s.visible)
  /** 옮긴 아이콘이 하나라도 있는가 — 되돌리기 버튼은 그때만 나타난다. */
  const hasMovedIcons = useDesktopIconStore((s) => Object.keys(s.cells).length > 0)
  const resetIconLayout = useDesktopIconStore((s) => s.resetLayout)

  if (!state) return null

  const isMorning = state.slot === 'morning'

  return (
    <div className="taskbar">
      {/* 왼쪽 끝 묶음. 윈도우 11처럼 시작 버튼+창 목록을 가운데 정렬하는데,
          패널 버튼·시계는 윈도우에서도 우측 트레이에 고정되는 요소라 가운데로 끌고 오지 않는다.
          이 칸이 오른쪽 트레이와 **같은 폭**을 차지해 가운데 묶음을 광학적 중심에 맞춘다 —
          그래서 여기에 버튼이 있든 없든 시작 버튼은 제자리에 있다. */}
      <div className="taskbar-spacer">
        {/*
         * 아이콘 배치 되돌리기. **옮긴 적이 있을 때만** 나타난다.
         *
         * ux `gesture-alternative`+`undo-support`: 흩뜨려 놓고 나면 localStorage를
         * 비우는 것 말고는 돌아올 길이 없다는 게 드래그 기능의 유일한 막다른 길이다.
         *
         * ⚠️ **바탕화면 위로 되돌리지 말 것.** 예전에는 왼쪽 아래에 떠 있었는데,
         * 프로그램 열이 바닥까지 차자 마지막 아이콘의 이름을 덮었다(사용자 지적).
         * 아이콘은 위에서부터 채워지고 바로 가기까지 아래로 자라므로 아이콘 판 안에는
         * 안전한 고정 자리가 없다. 작업 표시줄 **왼쪽 끝**이 그 자리다(설계자 지시).
         * 토글이 아니므로 `aria-pressed`도 `-on` 상태도 갖지 않는다.
         */}
        {hasMovedIcons && (
          <button
            className="taskbar-panel"
            onClick={resetIconLayout}
            title="아이콘 위치 초기화"
            aria-label="아이콘 위치 초기화"
          >
            <AppIcon name={UI_ICONS.resetIcons} size={20} />
          </button>
        )}
      </div>

      {/* 시작 버튼도 트레이와 같은 mdi-light 라인 글리프다 — 사유는 data/icons.ts 참조
          (다색 격자는 아크릴 위에서 1.03:1로 사실상 보이지 않았다). */}
      <button
        className={`taskbar-start${startOpen ? ' taskbar-start-on' : ''}`}
        // 첫 실행 안내 투어의 마지막 단계가 이 버튼을 가리킨다(`data/tour.ts`).
        data-tour="start"
        aria-label="시작"
        aria-expanded={startOpen}
        aria-haspopup="menu"
        onClick={() => setStartOpen((v) => !v)}
      >
        <AppIcon name={UI_ICONS.start} size={22} />
      </button>
      {startOpen && <StartMenu onClose={() => setStartOpen(false)} />}

      <div className="taskbar-items">
        {windows.map((w) => (
          <button
            key={w.id}
            // 최소화된 창은 실제 윈도우처럼 밑줄 표시를 흐리게 해 화면에 없음을 알린다.
            className={w.minimized ? 'taskbar-item taskbar-item-min' : 'taskbar-item'}
            onClick={() => activate(w.id)}
            title={w.minimized ? `${w.title} — 복원` : w.title}
            /* 글자를 뺐으므로(설계자 지시) 접근성 이름은 aria-label이 진다 —
               아이콘만 남은 버튼은 스크린 리더에 이름이 없다. */
            aria-label={w.minimized ? `${w.title} — 복원` : w.title}
          >
            <AppIcon name={w.icon} size={20} />
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
              /* 토글이므로 켜진 상태가 눈에 보여야 한다 — 실제 윈도우 트레이 토글과 같다. */
              className={
                panelVisible[panel.id] ? 'taskbar-panel taskbar-panel-on' : 'taskbar-panel'
              }
              onClick={() => toggle(panel.id)}
              /* 색만으로 상태를 알리지 않는다: aria-pressed와 문구가 함께 바뀐다. */
              aria-pressed={panelVisible[panel.id]}
              title={
                panelVisible[panel.id] ? `${panel.label}창 숨기기` : `${panel.label}창 보이기`
              }
              aria-label={
                panelVisible[panel.id] ? `${panel.label}창 숨기기` : `${panel.label}창 보이기`
              }
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
