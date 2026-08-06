import { MOBILE_ICONS } from '../../data/icons'
import { AppIcon } from '../../icons/AppIcon'
import { useShellStore } from '../../store/shellStore'
import { useWindowStore } from '../../store/windowStore'

/**
 * 하단 내비게이션 바.
 *
 * ux 규칙(전부 지킨다):
 *  - `bottom-nav-limit`: 항목 **4개**(상한 5).
 *  - `nav-label-icon`: 아이콘만 두지 않는다 — 전부 글자 라벨이 붙는다.
 *  - `nav-state-active`: 현재 위치를 **색만으로** 알리지 않는다(`color-not-only`) —
 *    액센트 색 + **굵은 글자** + **위쪽 표식 막대** 셋이 함께 움직이고
 *    `aria-current`/`aria-pressed`가 보조기술에 같은 말을 한다.
 *  - `touch-target-size`: 각 항목이 최소 44×44(CSS의 `MOBILE_SHELL.TOUCH_TARGET` 중복값).
 *  - `back-behavior`: 앱이 열려 있으면 **뒤로**가 여기에도 있다(앱 바에 이어 두 번째 길).
 *
 * ⚠️ **데스크톱 전환이 여기 있는 이유:** override는 persist라 폰 모드로 바꾼 뒤
 * 새로 고쳐도 유지된다. 되돌리는 길이 모바일 쪽에 없으면 넓은 화면에서 폰 모드를
 * 켠 사람은 localStorage를 비우기 전엔 돌아올 수 없다.
 */
export function MobileNavBar({
  appOpen,
  sheetOpen,
  onToggleSheet,
}: {
  appOpen: boolean
  sheetOpen: boolean
  onToggleSheet: () => void
}) {
  const windows = useWindowStore((s) => s.windows)
  const close = useWindowStore((s) => s.close)
  const setOverride = useShellStore((s) => s.setOverride)

  /** 열려 있는 앱 중 맨 위 하나를 닫는다(= 한 걸음 뒤로). */
  const closeTop = () => {
    const visible = windows.filter((w) => !w.minimized)
    if (!visible.length) return
    close(visible.reduce((a, b) => (b.zIndex > a.zIndex ? b : a)).id)
  }

  /**
   * 홈으로 돌아간다.
   *
   * ⚠️ **앱만 닫는 것으로는 부족하다** — 시트만 열린 상태에서는 닫을 창이 없어
   * 버튼이 활성인 채 아무 일도 하지 않는다. 홈이라고 적힌 버튼은 화면에 무엇이
   * 덮여 있든 홈을 보여 줘야 하므로, 앱과 시트를 **함께** 걷는다.
   */
  const goHome = () => {
    if (sheetOpen) onToggleSheet()
    closeTop()
  }

  /** 홈이 "현재 위치"인 것은 앱도 시트도 안 열렸을 때다. */
  const atHome = !appOpen && !sheetOpen

  return (
    <nav className="mo-nav" aria-label="주 메뉴">
      <button
        type="button"
        className={`mo-nav-item${atHome ? ' mo-nav-on' : ''}`}
        aria-current={atHome ? 'page' : undefined}
        onClick={goHome}
        disabled={atHome}
      >
        <AppIcon name={MOBILE_ICONS.home} size={22} />
        <span className="mo-nav-label">홈</span>
      </button>

      <button
        type="button"
        className="mo-nav-item"
        onClick={closeTop}
        disabled={!appOpen}
      >
        <AppIcon name={MOBILE_ICONS.back} size={22} />
        <span className="mo-nav-label">뒤로</span>
      </button>

      <button
        type="button"
        className={`mo-nav-item${sheetOpen ? ' mo-nav-on' : ''}`}
        aria-pressed={sheetOpen}
        onClick={onToggleSheet}
      >
        <AppIcon name={MOBILE_ICONS.stats} size={22} />
        <span className="mo-nav-label">{sheetOpen ? '닫기' : '스탯'}</span>
      </button>

      <button
        type="button"
        className="mo-nav-item"
        onClick={() => setOverride('desktop')}
        title="가짜 윈도우 바탕화면으로 돌아갑니다"
      >
        <AppIcon name={MOBILE_ICONS.desktop} size={22} />
        <span className="mo-nav-label">PC 모드</span>
      </button>
    </nav>
  )
}
