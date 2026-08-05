import './PanelOrnament.css'

/**
 * 네 모서리에 걸리는 테두리 장식.
 *
 * **왜 이미지가 아니라 인라인 SVG인가:** 코너 장식은 창 크기·DPI에 따라 또렷해야 하고
 * 문맥에 따라 색이 달라져야 한다(밝은 카드 vs 어두운 배경). 래스터 이미지는 둘 다 못 한다.
 * 게다가 이 프로젝트는 아이콘조차 CDN을 금지하고 오프라인 서브셋으로 굽는다 —
 * 외부에서 받아 온 코너 PNG 넉 장은 그 규칙을 깬다.
 *
 * **왜 CSS 도형이 아닌가:** 테두리 의사 요소는 `::before`/`::after` 둘뿐이라 네 모서리를
 * 덮지 못하고, 마스크로 잘라내는 기법은 새벽 세 시에 해독해야 하는 종류의 영리함이다.
 *
 * 같은 도형을 네 번 그리고 CSS `transform`으로 뒤집는다 — 회전 각도를 네 벌 관리하는 대신
 * 좌상단 하나만 그려 두면 나머지는 거울상이다.
 */

/** 좌상단 기준 도형. 나머지 세 모서리는 CSS transform이 뒤집어 만든다. */
function CornerMark() {
  return (
    <svg className="ornament-corner" viewBox="0 0 30 30" aria-hidden="true" focusable="false">
      {/* 갈고리 한 겹만. 액자선 위에 겹쳐 그려 모서리를 "여민" 느낌을 만든다.
          예전에는 안쪽 갈고리와 팔꿈치 마름모가 한 겹 더 있었으나 설계자가 걷어냈다 —
          겹이 늘수록 모서리가 뭉치고, 액자선 + 갈고리 둘이면 테두리로 충분히 읽힌다. */}
      <path d="M29 1.5H7.5A6 6 0 0 0 1.5 7.5V29" />
    </svg>
  )
}

/**
 * 부모에 `position: relative`(또는 absolute)가 있어야 한다.
 * 클릭을 먹지 않고(`pointer-events: none`) 스크린 리더에도 잡히지 않는다 — 순수 장식이다.
 */
export function PanelOrnament() {
  return (
    <div className="panel-ornament" aria-hidden="true">
      <span className="ornament-slot ornament-tl">
        <CornerMark />
      </span>
      <span className="ornament-slot ornament-tr">
        <CornerMark />
      </span>
      <span className="ornament-slot ornament-bl">
        <CornerMark />
      </span>
      <span className="ornament-slot ornament-br">
        <CornerMark />
      </span>
    </div>
  )
}
