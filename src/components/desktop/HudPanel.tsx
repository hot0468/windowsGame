import { useEffect, useRef, type ReactNode } from 'react'
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
   * true면 헤더(제목 줄)를 그린다. 생략하면 헤더 영역 자체가 없다.
   * 날짜 패널은 끈다 — 설계자 요구로 타이틀 영역을 통째로 삭제했다.
   * 스탯창은 제목이 플레이어 이름(= 실제 정보)이라 헤더를 유지한다.
   *
   * ⚠️ 예전에는 `headerIcon`(글리프 이름)이 이 역할을 겸했다. 설계자가 사람 모양 글리프를
   * 빼면서 헤더까지 함께 사라지지 않도록 "무엇을 그리나"와 "그리나 마나"를 분리했다.
   */
  header?: boolean
  x: number
  y: number
  width: number
  zIndex: number
  /** 눌렀을 때 이 패널을 앞으로 가져온다 (desktopPanelStore.raise). */
  onActivate: () => void
  /**
   * 렌더된 높이가 바뀔 때마다 알린다. **아래에 다른 패널이 붙는 패널만** 넘긴다
   * (지금은 날짜칸 하나 — 지갑칸이 그 아래에 선다).
   *
   * ⚠️ 마운트 한 번이 아니라 `ResizeObserver`인 이유: 날짜칸은 자동 진행 문구가
   * 붙었다 떨어졌다 하며 **런타임에 키가 변한다**. 마운트 때만 재면 그 순간부터 어긋난다.
   */
  onHeight?: (height: number) => void
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
 * ⚠️ **테두리 장식(PanelOrnament)은 걷어냈다**(설계자 지시). 파란 액자선과 모서리 갈고리가
 * HUD를 무겁게 만들었다 — 구역을 가르는 회색 헤어라인(`.hud-section`)만 남긴다.
 * 활동창·엔딩 모달의 장식은 그대로다.
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
  header = false,
  x,
  y,
  width,
  zIndex,
  onActivate,
  onHeight,
  children,
}: HudPanelProps) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !onHeight) return
    /* 첫 값은 즉시 준다 — 관찰자만 걸면 아래 패널이 한 프레임 동안 겹쳐 보인다. */
    onHeight(el.offsetHeight)
    const observer = new ResizeObserver(() => onHeight(el.offsetHeight))
    observer.observe(el)
    return () => observer.disconnect()
  }, [onHeight])

  return (
    <section
      ref={ref}
      className="hud"
      // 첫 실행 안내 투어가 가리키는 표식. 패널 id(`calendar`·`wallet`·`stats`)가
      // 그대로 온다 — `data/tour.ts`가 그 이름으로 대상을 고른다.
      data-tour={id}
      style={{ left: x, top: y, width, zIndex }}
      // 고정 패널이라 드래그 핸들러를 붙이지 않는다. 누르면 앞으로만 온다.
      onPointerDown={onActivate}
      // 헤더가 있으면 그 제목이 이름이 되고, 없으면 label을 직접 이름으로 쓴다.
      aria-labelledby={header ? `${id}-hud-title` : undefined}
      aria-label={header ? undefined : label}
    >
      {header && (
        <header className="hud-head">
          {/* 글리프 없이 제목만. 사람 모양 아이콘은 설계자가 걷어냈다 —
              바로 옆이 플레이어 이름이라 아이콘이 같은 말을 한 번 더 하는 자리였다. */}
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
export function HudSection({ label }: { label?: string }) {
  // 라벨을 생략하면 구분선만 남는다(설계자 요구: 스탯창 "생계" 구역은 제목 없이).
  // 구분선까지 지우지 않는 이유는 그 위 구역과 붙어 한 덩어리로 읽히기 때문이다.
  // 글자가 없으니 스크린 리더에는 아무것도 알리지 않는다 — 순수한 장식선이다.
  if (!label) return <div className="hud-section hud-section-bare" aria-hidden="true" />
  return <div className="hud-section">{label}</div>
}
