import { Fragment } from 'react'
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
  const resize = useWindowStore((s) => s.resize)

  return (
    <>
      {/* 최소화된 창은 그리지 않는다. 목록에서 지우지는 않으므로
          작업 표시줄 항목은 남고 거기서 복원할 수 있다. */}
      {windows.filter((w) => !w.minimized).map((w) => {
        const chrome = windowChrome(w)
        return (
          <Fragment key={w.id}>
          {/* ⚠️ **딤은 팝업 바로 아래 층에 깐다**(`zIndex - 1`) — 화면 맨 위에 고정하면
              팝업보다 나중에 열린 창까지 가리고, 팝업 자신도 흐려진다. */}
          {w.popup && <div className="win-scrim" style={{ zIndex: w.zIndex - 1 }} />}
          <Window
            id={w.id}
            title={w.title}
            icon={w.icon}
            x={w.x}
            y={w.y}
            width={w.width}
            height={w.height}
            zIndex={w.zIndex}
            /* 크기 조절(2026-08-22). 최소 크기는 스토어가 지킨다(`MIN_WINDOW`). */
            onResize={(width, height) => resize(w.id, width, height)}
            maximized={w.maximized}
            ornament={chrome.ornament}
            bareTitle={chrome.bareTitle}
            dark={chrome.dark}
            popup={w.popup}
            /* ⚠️ 팝업은 타이틀 바 자체가 없어 캡션 버튼도 안 그려지지만, 핸들러까지 끊어
               둔다 — 나중에 팝업에 타이틀 바를 되살리더라도 "치울 수 없다"가 유지된다.
               아래 `appForWindow`에는 `onClose`를 그대로 넘기므로 팝업 안의
               [확인]·[건너뛰기]·Esc는 여전히 닫는다. */
            onClose={w.popup ? undefined : () => close(w.id)}
            onMinimize={w.popup ? undefined : () => minimize(w.id)}
            onToggleMaximize={w.popup ? undefined : () => toggleMaximize(w.id)}
          >
            {appForWindow(w, { onClose: () => close(w.id) })}
          </Window>
          </Fragment>
        )
      })}
    </>
  )
}
