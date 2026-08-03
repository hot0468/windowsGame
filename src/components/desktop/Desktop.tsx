import { DESKTOP_ACTIVITIES } from '../../data/activities'
import { useWindowStore } from '../../store/windowStore'
import { WindowManager } from '../window/WindowManager'
import { EndingModal } from '../apps/EndingModal'
import { StatPanel } from './StatPanel'
import { Taskbar } from './Taskbar'
import './Desktop.css'

export function Desktop() {
  const open = useWindowStore((s) => s.open)

  return (
    <div className="desktop">
      <div className="desktop-icons">
        {DESKTOP_ACTIVITIES.map((activity, i) => {
          const Icon = activity.icon
          return (
            <button
              key={activity.id}
              className="desktop-icon"
              onDoubleClick={() =>
                open({
                  id: `exe-${activity.id}`,
                  title: activity.label,
                  icon: activity.icon,
                  // 창이 서로 겹치지 않도록 순번만큼 어긋나게 배치한다.
                  x: 120 + i * 28,
                  y: 80 + i * 28,
                  width: 340,
                  kind: 'exe',
                  activityId: activity.id,
                })
              }
            >
              <Icon size={32} className="desktop-icon-glyph" />
              {activity.label}
            </button>
          )
        })}
      </div>

      <StatPanel />
      <WindowManager />
      <Taskbar />
      <EndingModal />
    </div>
  )
}
