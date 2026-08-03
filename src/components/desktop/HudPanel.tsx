import type { ReactNode } from 'react'
import { AppIcon } from '../../icons/AppIcon'
import type { IconName } from '../../types/game'
import './HudPanel.css'

interface HudPanelProps {
  /** 접근성 라벨용 식별자. 헤더 제목 요소의 id가 된다. */
  id: string
  /**
   * 패널의 접근성 이름.
   * 헤더가 있으면 제목으로 그려지고, 없으면 `aria-label`로만 쓰인다 —
   * 제목을 지웠다고 스크린 리더에서 이름 없는 영역이 되면 안 된다.
   */
  label: string
  /**
   * 헤더에 그릴 단색 글리프.
   * **넘기면 헤더(아이콘 + 제목 줄)가 그려지고, 생략하면 헤더 영역 자체가 없다.**
   * 날짜 패널은 생략한다 — 설계자 요구로 타이틀 영역을 통째로 삭제했다.
   * 스탯창은 제목이 플레이어 이름(= 실제 정보)이라 헤더를 유지한다.
   */
  headerIcon?: IconName
  x: number
  y: number
  width: number
  zIndex: number
  /** 눌렀을 때 이 패널을 앞으로 가져온다 (desktopPanelStore.raise). */
  onActivate: () => void
  children: ReactNode
}

/**
 * 게임 HUD 패널 컨테이너 — 스탯창·날짜칸 전용.
 *
 * **공용 `Window` 크롬을 쓰지 않는 유일한 창이다.** 설계자 요구가 "스탯창·날짜칸은
 * OS 창이 아니라 게임 오버레이로 읽혀야 한다"이고, 윈도우 11 크롬(밝은 타이틀 바 +
 * 캡션 버튼 자리)을 유지하면서 그 인상을 만들 방법이 없다.
 *
 * 시각 언어는 **밝은 모던 시스템 카드**다(2026-08-03 방향 전환. 다크 판타지 폐기):
 * 니어 화이트 아크릴 표면, 잉크 글자, 액센트는 윈도우 11 시스템 블루 하나.
 * 세리프 영문 부제·✳ 오너먼트·금테는 "테마 장식"이라 전부 걷어냈고,
 * 절제·tabular 숫자·구역 구조처럼 장식이 아니라 좋은 설계인 부분만 남겼다.
 * 근거(ui-ux-pro-max): style `Executive Dashboard`("clean layout with white space"),
 * style `Swiss Modernism 2.0`("single vibrant accent only", "minimal decoration"),
 * ux `visual-hierarchy`("hierarchy via size, spacing, contrast — not color alone").
 *
 * `Window`와 달라지는 것은 **외형뿐**이다. 다음은 그대로 유지한다:
 *  - 고정 위치(드래그 핸들러 자체를 붙이지 않는다)
 *  - 캡션 버튼 없음(최소화되면 되돌릴 수단이 없으므로 애초에 만들지 않는다)
 *  - windowStore에 등록하지 않음 → 작업 표시줄 창 목록·closeAll 대상이 아님
 *  - z는 desktopPanelStore가 소유하고, 패널 **본문 어디를 눌러도** raise() —
 *    핸들러가 section에 붙어 있어 헤더가 없는 날짜칸도 눌러서 앞으로 올 수 있다
 */
export function HudPanel({
  id,
  label,
  headerIcon,
  x,
  y,
  width,
  zIndex,
  onActivate,
  children,
}: HudPanelProps) {
  return (
    <section
      className="hud"
      style={{ left: x, top: y, width, zIndex }}
      // 고정 패널이라 드래그 핸들러를 붙이지 않는다. 누르면 앞으로만 온다.
      onPointerDown={onActivate}
      // 헤더가 있으면 그 제목이 이름이 되고, 없으면 label을 직접 이름으로 쓴다.
      aria-labelledby={headerIcon ? `${id}-hud-title` : undefined}
      aria-label={headerIcon ? undefined : label}
    >
      {headerIcon && (
        <header className="hud-head">
          <AppIcon name={headerIcon} size={16} className="hud-head-icon" />
          <h2 className="hud-head-title" id={`${id}-hud-title`}>
            {label}
          </h2>
        </header>
      )}
      <div className="hud-body">{children}</div>
    </section>
  )
}

/**
 * 구역 라벨. 위쪽 헤어라인 + 작고 흐린 한국어 라벨 하나뿐이다.
 * 예전의 "✳ 능력치 Status"(글리프 + 이중 언어 + 세리프)는 다크 판타지 테마 장식이라
 * 폐기했다 — 모던 대시보드의 구역 라벨은 색이 아니라 크기·간격·무게로 구분된다
 * (ux `visual-hierarchy`). 컴포넌트로 고정해 두 패널이 같은 모양을 쓰게 한다.
 */
export function HudSection({ label }: { label: string }) {
  return <div className="hud-section">{label}</div>
}
