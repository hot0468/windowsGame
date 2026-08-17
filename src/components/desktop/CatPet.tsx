import type { CSSProperties } from 'react'
import { LAYERS } from '../../data/layers'
import { catAdopted, catCanPet, catName } from '../../systems/cat'
import { useGameStore } from '../../store/gameStore'
import './CatPet.css'

/**
 * 데스크톱 펫 — 입양한 길고양이가 바탕화면 하단(작업 표시줄 위)을 이따금 걸어간다.
 * 옛 윈도우 Neko 오마주(가짜 OS 컨셉의 연장).
 *
 * ## 결정성
 * ⚠️ **걷는 방향·멈추는 자리를 무작위로 고르지 않는다** — 턴(날짜×2+슬롯)에서 파생한다.
 * 같은 상태면 같은 화면이라야 실측·테스트가 성립한다(날씨·시세와 같은 규칙).
 * `key`에 턴을 넣어 슬롯이 넘어갈 때마다 걷기가 한 번 다시 돈다("이따금"의 전부다).
 *
 * ## 쓰다듬기
 * 클릭 = 하루 한 번 멘탈 +1, 턴 소모 없음(포털 배너 보상과 같은 판형 — 커서는
 * `CatState.lastPetDay`). 이미 쓰다듬은 날은 버튼이 아니라 **disabled + 사유**다
 * (죽은 컨트롤 금지). 판정·증감은 전부 `systems/cat.ts`가 갖는다.
 */
export function CatPet() {
  const state = useGameStore((s) => s.state)
  const petCat = useGameStore((s) => s.petCat)
  if (!state || !catAdopted(state)) return null

  const name = catName(state)
  const canPet = catCanPet(state)
  const turn = state.day * 2 + (state.slot === 'afternoon' ? 1 : 0)
  /* 방향은 턴 홀짝, 멈추는 자리는 턴의 나머지 — 전부 결정적이다. */
  const rtl = turn % 2 === 1
  const rest = 16 + (turn % 5) * 15

  return (
    <div
      key={turn}
      className={`catpet${rtl ? ' catpet-rtl' : ''}`}
      style={{ zIndex: LAYERS.CAT_PET, '--catpet-rest': `${rest}vw` } as CSSProperties}
    >
      <button
        type="button"
        className="catpet-body"
        disabled={!canPet}
        onClick={petCat}
        aria-label={canPet ? `${name} 쓰다듬기` : `${name} — 오늘은 이미 쓰다듬었다`}
        title={canPet ? `${name} 쓰다듬기` : `${name} — 오늘은 이미 쓰다듬었다`}
      >
        {/* 검은 고양이 실루엣 + 눈. 색은 CatPet.css가 가둔다(전역 토큰에 없는 색이다). */}
        <svg className="catpet-art" viewBox="0 0 64 40" aria-hidden="true">
          {/* 꼬리 */}
          <path className="catpet-ink" d="M10 30 C 2 28, 2 16, 9 15 C 5 18, 6 26, 13 27 Z" />
          {/* 몸통 */}
          <ellipse className="catpet-ink" cx="27" cy="29" rx="17" ry="10" />
          {/* 머리 + 귀 */}
          <circle className="catpet-ink" cx="47" cy="17" r="10" />
          <polygon className="catpet-ink" points="39,10 41,1 46,8" />
          <polygon className="catpet-ink" points="55,10 53,1 48,8" />
          {/* 눈 — 어둠 속에서 이쪽을 본다 */}
          <circle className="catpet-eye" cx="44" cy="16" r="1.6" />
          <circle className="catpet-eye" cx="51" cy="16" r="1.6" />
        </svg>
      </button>
    </div>
  )
}
