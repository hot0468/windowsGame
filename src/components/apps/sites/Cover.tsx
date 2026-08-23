import { useState } from 'react'

/**
 * 사진 한 장 — **없으면 원래 있던 것이 그대로 남는다**.
 *
 * 사진은 `npm run photos`가 받아 `public/img/<갈래>/<id>.webp`에 넣는 정적 파일이다
 * (런타임 CDN 금지 — 오프라인으로 돌아야 한다). 그래서 **한 칸이 비어 있을 수 있다**:
 * 아직 안 받았거나, 그 질의만 결과가 없었거나, 새 항목에 질의를 안 적었거나.
 *
 * ⚠️ 그 자리에 깨진 이미지 아이콘을 남기지 않는다. 사진을 들이기 전에 이 게임이 쓰던
 * 대체물(매체 머리글자 타일·아이콘 판·그라데이션)이 `children`이고, **파일이 없으면 그것이
 * 다시 나온다** — 사진은 얹는 것이지 갈아 끼우는 것이 아니다.
 *
 * 대체물이 필요 없는 자리(블로그 본문 사진처럼 없으면 그냥 없어도 되는 곳)는
 * `children`을 주지 않으면 통째로 사라진다.
 */
export function Cover({
  src,
  className,
  children,
}: {
  src: string
  className?: string
  children?: React.ReactNode
}) {
  const [ok, setOk] = useState(true)
  if (!ok) return <>{children}</>
  /* alt=""인 이유: 전부 장식이다. 무엇이 있는지는 옆의 글자(제목·상품명)가 이미 말한다 —
     사진에 설명을 붙이면 스크린 리더가 같은 말을 두 번 읽는다. */
  return <img className={className} src={src} alt="" loading="lazy" onError={() => setOk(false)} />
}
