import { DESKTOP_ITEMS } from '../../data/desktopItems'
import { AppIcon } from '../../icons/AppIcon'
import { useWindowStore } from '../../store/windowStore'
import { WindowManager } from '../window/WindowManager'
import { EndingModal } from '../apps/EndingModal'
import { CalendarPanel } from './CalendarPanel'
import { StatPanel } from './StatPanel'
import { Taskbar } from './Taskbar'
import './Desktop.css'

export function Desktop() {
  const open = useWindowStore((s) => s.open)

  return (
    <div className="desktop">
      <div className="desktop-icons">
        {DESKTOP_ITEMS.map((item, i) => (
          <button
            key={item.id}
            className="desktop-icon"
            onDoubleClick={() =>
              open({
                id: `${item.kind}-${item.id}`,
                title: item.label,
                icon: item.icon,
                // 창이 서로 겹치지 않도록 순번만큼 어긋나게 배치한다.
                x: 120 + i * 28,
                y: 80 + i * 28,
                width: item.width,
                kind: item.kind,
                activityId: item.activityId,
                message: item.stubMessage,
              })
            }
          >
            <AppIcon name={item.icon} size={38} className="desktop-icon-glyph" />
            {item.label}
          </button>
        ))}
      </div>

      {/* 스탯창·날짜칸은 바탕화면 요소다 — 일반 창에 가려지는 것이 정상이며,
          작업 표시줄의 패널 버튼으로 다시 앞으로 가져온다. */}
      <CalendarPanel />
      <StatPanel />
      <WindowManager />
      <Taskbar />
      <EndingModal />
    </div>
  )
}
