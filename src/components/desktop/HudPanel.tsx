import type { ReactNode } from 'react'
import { AppIcon } from '../../icons/AppIcon'
import { HUD_ICONS } from '../../data/icons'
import type { IconName } from '../../types/game'
import './HudPanel.css'

interface HudPanelProps {
  /** 접근성 라벨용 식별자. 헤더 제목 요소의 id가 된다. */
  id: string
  title: string
  /**
   * 제목 옆에 흐리게 붙는 **영문 부제**. 레퍼런스의 시그니처 디테일인
   * "한국어 라벨 + 바랜 영문" 이중 언어 표기를 패널 머리에서도 반복한다.
   * ASCII만 넣는다(세리프를 쓰므로 — HudPanel.css 참조).
   */
  subtitle: string
  /** 헤더 아이콘 이름. HUD 안이므로 반드시 단색 글리프(`HUD_ICONS`/`STAT_META.hudIcon`)를 넘긴다. */
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
 *
 * 시각 언어는 **AAA 다크 판타지 RPG 상태창** 레퍼런스를 따른다: 온기 도는 근검정 표면,
 * 아이보리 글자, 액센트는 샴페인 골드 하나. 네온·글로우 없음. 우아함은 효과가 아니라
 * 타이포그래피·간격·절제에서 나온다.
 * 근거(ui-ux-pro-max): style `Dark Mode (OLED)`("Minimal glow effects", 고대비),
 * style `Modern Dark (Cinema)`(rgba 헤어라인, 순검정 회피),
 * ux `visual-hierarchy`("hierarchy via size, spacing, contrast — not color alone").
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
  subtitle,
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
        <AppIcon name={icon} size={15} className="hud-head-icon" />
        <h2 className="hud-head-title" id={`${id}-hud-title`}>
          {title}
        </h2>
        <span className="hud-head-sub">{subtitle}</span>
      </header>
      <div className="hud-body">{children}</div>
    </section>
  )
}

/**
 * 구역 라벨 — "✳ 능력치 Status" 형태의 이중 언어 헤더.
 * 레퍼런스의 시그니처 디테일이라 컴포넌트로 고정해 두 패널이 같은 모양을 쓰게 한다
 * (라벨 마크업을 두 곳에 적으면 한쪽만 바뀌어 어긋난다).
 */
export function HudSection({ label, en }: { label: string; en: string }) {
  return (
    <div className="hud-section">
      <AppIcon name={HUD_ICONS.sectionOrnament} size={9} className="hud-section-mark" />
      <span className="hud-section-ko">{label}</span>
      <span className="hud-section-en">{en}</span>
    </div>
  )
}
