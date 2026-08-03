import type { ReactNode } from 'react'
import { AppIcon } from '../../icons/AppIcon'
import type { IconName } from '../../types/game'
import './HudPanel.css'

interface HudPanelProps {
  /** 접근성 라벨용 식별자. 헤더 제목 요소의 id가 된다. */
  id: string
  title: string
  /** 헤더 아이콘 이름 (Iconify `"세트:이름"`). */
  icon: IconName
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
 * 근거(ui-ux-pro-max): style `Glassmorphism`(backdrop blur 10–20px + 반투명 + 1px 밝은
 * 테두리) + style `Modern Dark (Cinema)`(어두운 표면·rgba 테두리·액센트 글로우).
 *
 * `Window`와 달라지는 것은 **외형뿐**이다. 다음은 그대로 유지한다:
 *  - 고정 위치(드래그 핸들러 자체를 붙이지 않는다)
 *  - 캡션 버튼 없음(최소화되면 되돌릴 수단이 없으므로 애초에 만들지 않는다)
 *  - windowStore에 등록하지 않음 → 작업 표시줄 창 목록·closeAll 대상이 아님
 *  - z는 desktopPanelStore가 소유하고, 패널을 누르거나 작업 표시줄 패널 버튼을 누르면 raise()
 */
export function HudPanel({
  id,
  title,
  icon,
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
      aria-labelledby={`${id}-hud-title`}
    >
      <header className="hud-head">
        <AppIcon name={icon} size={16} className="hud-head-icon" />
        <h2 className="hud-head-title" id={`${id}-hud-title`}>
          {title}
        </h2>
      </header>
      <div className="hud-body">{children}</div>
    </section>
  )
}
