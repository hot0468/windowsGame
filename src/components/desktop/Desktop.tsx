import { DESKTOP_ITEMS } from '../../data/desktopItems'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import { useWindowStore } from '../../store/windowStore'
import { WindowManager } from '../window/WindowManager'
import { EndingModal } from '../apps/EndingModal'
import { CalendarPanel } from './CalendarPanel'
import { StatPanel } from './StatPanel'
import { Taskbar } from './Taskbar'
import { ToastHost } from './ToastHost'
import './Desktop.css'

/** 왼쪽 열은 프로그램, 오른쪽 열은 폴더. 순서는 `DESKTOP_ITEMS`가 정한다. */
const ICON_COLUMNS = [
  DESKTOP_ITEMS.filter((i) => i.kind !== 'folder'),
  DESKTOP_ITEMS.filter((i) => i.kind === 'folder'),
]

export function Desktop() {
  const open = useWindowStore((s) => s.open)
  /**
   * 바탕화면 풍경은 슬롯을 따라간다(설계자 지시).
   * 오전은 낮 하늘, 오후는 해 질 녘 — 게임에서 밤은 자동 취침이라 화면에 없으므로
   * "하루가 저물어 간다"는 신호를 오후 배경이 대신 진다. 색은 CSS가 정하고
   * 여기서는 어느 쪽인지만 알린다.
   */
  const slot = useGameStore((s) => s.state?.slot)

  return (
    <div className={`desktop ${slot === 'afternoon' ? 'desktop-dusk' : 'desktop-day'}`}>
      {/* 아이콘은 **열 단위로 나눈다**(설계자 지시: 폴더는 아웃룩 옆). 한 덩어리를
          flex-wrap에 맡기면 라벨이 두 줄인 항목 하나가 열 용량을 바꿔 배치가 흔들린다. */}
      <div className="desktop-icons">
        {ICON_COLUMNS.map((column, c) => (
          <div className="desktop-column" key={c}>
        {column.map((item) => {
          const i = DESKTOP_ITEMS.indexOf(item)
          return (
          <button
            key={item.id}
            className="desktop-icon"
            onDoubleClick={() =>
              open({
                id: `${item.kind}-${item.id}`,
                title: item.label,
                icon: item.icon,
                // 창끼리 겹치지 않게 순번만큼 어긋나게 배치한다.
                // 최대화 상태로 열리는 창도 이 좌표를 그대로 받는다 —
                // 최대화 중에는 무시되지만 복원하면 여기로 돌아오므로 0,0을 주면 안 된다.
                x: 120 + i * 28,
                y: 80 + i * 28,
                width: item.width,
                maximized: item.openMaximized,
                kind: item.kind,
                activityId: item.activityId,
                message: item.stubMessage,
                appId: item.appId,
                folderId: item.folderId,
              })
            }
          >
            <AppIcon name={item.icon} size={38} className="desktop-icon-glyph" />
            {item.label}
          </button>
          )
        })}
          </div>
        ))}
      </div>

      {/* 스탯창·날짜칸은 바탕화면 요소다 — 일반 창에 가려지는 것이 정상이며,
          작업 표시줄의 패널 버튼으로 다시 앞으로 가져온다. */}
      <CalendarPanel />
      <StatPanel />
      <WindowManager />
      <Taskbar />
      {/* 알림은 작업 표시줄 위·엔딩 모달 아래에 뜬다. 턴이 넘어갈 때만 나타난다. */}
      <ToastHost />
      <EndingModal />
    </div>
  )
}
