import { useWindowStore } from '../../store/windowStore'
import { Window } from './Window'
import { appForWindow, windowChrome } from './appForWindow'

/**
 * 열린 창 목록을 종류에 따라 렌더링한다. **데스크톱 셸 전용이다.**
 *
 * ⚠️ kind → 컴포넌트 분기는 여기 없다 — `appForWindow`에 있다.
 * 모바일 셸의 전체화면 앱 뷰가 같은 함수를 부르기 때문이다(사유는 그 파일 주석 참조).
 * 여기 남은 것은 **데스크톱 창 크롬**(타이틀 바·캡션 버튼·좌표·최대화)뿐이다.
 */
export function WindowManager() {
  const windows = useWindowStore((s) => s.windows)
  const close = useWindowStore((s) => s.close)
  const minimize = useWindowStore((s) => s.minimize)
  const toggleMaximize = useWindowStore((s) => s.toggleMaximize)

  return (
    <>
      {/* 최소화된 창은 그리지 않는다. 목록에서 지우지는 않으므로
          작업 표시줄 항목은 남고 거기서 복원할 수 있다. */}
      {windows.filter((w) => !w.minimized).map((w) => {
        const chrome = windowChrome(w.kind)
        return (
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
            ornament={chrome.ornament}
            bareTitle={chrome.bareTitle}
            dark={chrome.dark}
            onClose={() => close(w.id)}
            onMinimize={() => minimize(w.id)}
            onToggleMaximize={() => toggleMaximize(w.id)}
          >
            {appForWindow(w, { onClose: () => close(w.id) })}
          </Window>
        )
      })}
    </>
  )
}
