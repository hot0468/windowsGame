import { useWindowStore } from '../../store/windowStore'
import { Window } from './Window'
import { ExeApp } from '../apps/ExeApp'
import { StubApp } from '../apps/StubApp'

/** 열린 창 목록을 종류에 따라 렌더링한다. */
export function WindowManager() {
  const windows = useWindowStore((s) => s.windows)
  const close = useWindowStore((s) => s.close)
  const minimize = useWindowStore((s) => s.minimize)
  const toggleMaximize = useWindowStore((s) => s.toggleMaximize)

  return (
    <>
      {/* 최소화된 창은 그리지 않는다. 목록에서 지우지는 않으므로
          작업 표시줄 항목은 남고 거기서 복원할 수 있다. */}
      {windows.filter((w) => !w.minimized).map((w) => (
        <Window
          key={w.id}
          id={w.id}
          title={w.title}
          icon={w.icon}
          x={w.x}
          y={w.y}
          width={w.width}
          zIndex={w.zIndex}
          maximized={w.maximized}
          onClose={() => close(w.id)}
          onMinimize={() => minimize(w.id)}
          onToggleMaximize={() => toggleMaximize(w.id)}
        >
          {w.kind === 'exe' && w.activityId && (
            <ExeApp activityId={w.activityId} onDone={() => close(w.id)} />
          )}
          {w.kind === 'stub' && w.message && <StubApp message={w.message} />}
        </Window>
      ))}
    </>
  )
}
