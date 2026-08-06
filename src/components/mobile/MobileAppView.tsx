import { useEffect } from 'react'
import { MOBILE_ICONS } from '../../data/icons'
import { AppIcon } from '../../icons/AppIcon'
import { useWindowStore } from '../../store/windowStore'
import type { OpenWindow } from '../../store/windowStore'
import { appForWindow } from '../window/appForWindow'

/**
 * 전체화면 앱 뷰 — 모바일에서 창을 대신한다.
 *
 * ⚠️ **kind 분기를 여기서 다시 적지 않는다.** `appForWindow`가 데스크톱
 * `WindowManager`와 공유하는 단일 분기다(그 파일 주석 참조). 여기가 정하는 것은
 * **크롬뿐**이다: 타이틀 바 대신 앱 바 하나, 캡션 버튼 대신 뒤로 화살표.
 *
 * ⚠️ 닫기는 데스크톱과 **같은 `close()`**다. 모바일 전용 스택을 만들지 않는다 —
 * 셸을 데스크톱으로 되돌리면 열려 있던 앱이 그대로 창으로 보여야 한다.
 *
 * ux 규칙:
 *  - `back-behavior`: 뒤로 가는 길이 **앱 상단에 항상 보인다**(하단바에도 하나 더 있다).
 *  - `escape-routes`: Esc로도 닫힌다.
 *  - `fixed-element-offset`: 상태바·하단바가 고정이므로 본문이 그만큼 비운다(CSS).
 *  - `horizontal-scroll`: 앱 내용물이 넘쳐도 **셸은 안 밀린다** — 본문 안쪽에 가둔다.
 */
export function MobileAppView({ win }: { win: OpenWindow }) {
  const close = useWindowStore((s) => s.close)

  /* ux `escape-routes`: 키보드가 붙은 기기(태블릿·좁힌 데스크톱 창)에서도 빠져나온다. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(win.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close, win.id])

  return (
    <section className="mo-app-view" aria-label={win.title}>
      <header className="mo-app-bar">
        <button
          type="button"
          className="mo-app-back"
          onClick={() => close(win.id)}
          aria-label={`${win.title} 닫고 홈으로`}
        >
          <AppIcon name={MOBILE_ICONS.back} size={22} />
        </button>
        {/* ⚠️ 다색 앱 아이콘 — 색을 입히지 않는다. */}
        <AppIcon name={win.icon} size={20} />
        <h1 className="mo-app-title">{win.title}</h1>
      </header>

      {/* 앱 내용물은 창 안에 있다는 전제로 만들어졌다(사이트 내부 반응형은 이번 범위 밖).
          넘치는 부분은 **이 상자 안에서만** 스크롤시켜 셸이 가로로 밀리지 않게 한다. */}
      <div className="mo-app-body">
        {appForWindow(win, { onClose: () => close(win.id) })}
      </div>
    </section>
  )
}
