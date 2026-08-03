import { useWindowStore } from '../../store/windowStore'
import { Window } from './Window'
import { ExeApp } from '../apps/ExeApp'

/** 열린 창 목록을 종류에 따라 렌더링한다. */
export function WindowManager() {
  const windows = useWindowStore((s) => s.windows)
  const close = useWindowStore((s) => s.close)

  return (
    <>
      {windows.map((w) => (
        <Window
          key={w.id}
          id={w.id}
          title={w.title}
          icon={w.icon}
          x={w.x}
          y={w.y}
          width={w.width}
          zIndex={w.zIndex}
          onClose={() => close(w.id)}
        >
          {w.kind === 'exe' && w.activityId && (
            <ExeApp activityId={w.activityId} onDone={() => close(w.id)} />
          )}
        </Window>
      ))}
    </>
  )
}
