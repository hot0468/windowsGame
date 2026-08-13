import { useState } from 'react'
import type { DragEvent } from 'react'
import {
  canMove,
  deal,
  draw,
  isRed,
  isWon,
  move,
  rankLabel,
  sendToFoundation,
  SUIT_NAMES,
  SUIT_SYMBOLS,
  SUITS,
} from '../../systems/solitaire'
import type { Card, PileId, SolitaireState } from '../../systems/solitaire'
import './SolitaireApp.css'

/**
 * 솔리테어(클론다이크).
 *
 * ⚠️ **판은 이 컴포넌트 안에서만 산다.** store에도 세이브에도 넣지 않는다 —
 * 시작 메뉴 항목은 "게임 바깥의 도구"이고(`data/startMenu.ts`), 육성 게임의 상태를
 * 한 톨도 건드리지 않기 때문이다(규칙은 `systems/solitaire.ts` 머리말 참조).
 * 창을 닫으면 판이 끝난다 — 실제 윈도우 솔리테어와 같다.
 *
 * ⚠️ **옮기는 길이 둘이고, 둘 다 남긴다**(사용자 지적으로 끌어다 놓기를 나중에 얹었다):
 *   ① 끌어다 놓기(HTML5 drag) — 카드 게임에서 기대되는 손놀림
 *   ② 카드를 누르고 → 놓을 자리를 누르기
 * ②를 지우지 않는 이유가 규칙이다(ux `gesture-alternative`): HTML5 드래그는 **터치에서
 * 동작하지 않고 키보드로는 아예 불가능하다**. 카드가 전부 `<button>`이라 ②만으로도
 * 끝까지 둘 수 있다. 두 길은 `applyMove` 하나를 지나므로 규칙이 갈릴 수 없다.
 */

/** 지금 집어 든 카드. `pile`의 `index`번째부터 그 아래 전부가 함께 움직인다. */
interface Held {
  pile: PileId
  index: number
}

/** 새 판의 시드. 화면이 정한다 — `systems`는 시드를 받기만 한다(Math.random 금지 규칙). */
const newSeed = () => Date.now()

function CardFace({ card }: { card: Card }) {
  const symbol = SUIT_SYMBOLS[card.suit]
  return (
    <span className={`sol-face${isRed(card) ? ' sol-red' : ''}`}>
      <span className="sol-corner">
        {rankLabel(card.rank)}
        <span className="sol-corner-suit">{symbol}</span>
      </span>
      <span className="sol-pip" aria-hidden="true">
        {symbol}
      </span>
    </span>
  )
}

/** 카드 한 장의 접근성 이름. 기호(♠)는 스크린 리더가 제대로 읽지 못한다. */
const cardName = (card: Card) =>
  card.faceUp ? `${SUIT_NAMES[card.suit]} ${rankLabel(card.rank)}` : '뒤집힌 카드'

/**
 * 산·뽑은 자리·기초 더미의 한 칸. 작업 더미는 쌓임이 달라 따로 그린다.
 *
 * ⚠️ **`SolitaireApp` 안에 정의하지 말 것**(2026-08-13 버그). 안에 두면 렌더마다 **새
 * 컴포넌트 타입**이 되어 React가 이 버튼의 DOM 노드를 통째로 갈아 끼운다. 그런데 창은
 * `pointerdown`에 `focus`로 z를 올리므로 **누르는 순간 리렌더가 난다** — mousedown과
 * mouseup이 서로 다른 노드에 떨어져 브라우저가 **click을 아예 만들지 않는다**.
 * 그래서 손으로는 패산이 죽어 있는데 `el.click()`으로는 멀쩡해 보였다(작업 더미 카드는
 * JSX에 직접 있어 살아 있었던 것이 단서였다). 재현은 `measure.mjs --mouse`.
 */
function Slot({
  cards,
  label,
  held = false,
  /** 지금 끌고 있는 묶음을 받아 줄 수 있는 자리인가(테두리로 알린다). */
  highlight = false,
  onClick,
  onDoubleClick,
  /** 끌기·놓기 핸들러. 자리마다 달라서 부르는 쪽이 만들어 넘긴다. */
  handlers,
}: {
  cards: Card[]
  label: string
  held?: boolean
  highlight?: boolean
  onClick: () => void
  onDoubleClick?: () => void
  handlers?: Record<string, unknown>
}) {
  const top = cards[cards.length - 1]
  return (
    <button
      type="button"
      className={`sol-slot${top ? '' : ' sol-slot-empty'}${highlight ? ' sol-drop' : ''}`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      {...handlers}
      aria-pressed={top ? held : undefined}
      aria-label={top ? `${label}, ${cardName(top)}` : `${label}, 비어 있음`}
    >
      {top ? (
        top.faceUp ? (
          <span className={`sol-card${held ? ' sol-card-held' : ''}`}>
            <CardFace card={top} />
          </span>
        ) : (
          <span className="sol-card sol-card-back" />
        )
      ) : null}
    </button>
  )
}

/** 지금 이 카드 묶음을 받아 줄 수 있는 더미 전부. 끌기 시작할 때 한 번만 센다. */
function dropTargetsFor(state: SolitaireState, from: Held): Set<string> {
  const all: PileId[] = [
    ...state.foundations.map((_, i) => `f${i}` as PileId),
    ...state.tableau.map((_, i) => `t${i}` as PileId),
  ]
  return new Set(all.filter((to) => canMove(state, from.pile, from.index, to)))
}

export function SolitaireApp() {
  const [state, setState] = useState<SolitaireState>(() => deal(newSeed()))
  const [held, setHeld] = useState<Held | null>(null)
  /** 지금 끌고 있는 카드. 눌러서 집는 것(`held`)과 달리 놓는 순간 사라진다. */
  const [drag, setDrag] = useState<Held | null>(null)
  const won = isWon(state)
  /** 끌고 있을 때만 계산한다 — 놓을 수 있는 자리를 미리 밝혀 준다. */
  const targets = drag ? dropTargetsFor(state, drag) : null

  const restart = () => {
    setState(deal(newSeed()))
    setHeld(null)
  }

  /** 옮기기의 단일 통로. 누르기·끌기 둘 다 여기로 들어온다. */
  const applyMove = (from: Held, to: PileId): boolean => {
    const next = move(state, from.pile, from.index, to)
    if (next) setState(next)
    return !!next
  }

  /** 놓을 자리를 눌렀다. 규칙에 맞으면 옮기고, 아니면 집은 것을 놓아 준다. */
  const dropOn = (pile: PileId) => {
    if (!held) return
    applyMove(held, pile)
    setHeld(null)
  }

  /**
   * 끌어다 놓기(HTML5 drag). 눌러서 옮기기를 **대체하지 않고 얹는다** —
   * ux `gesture-alternative`: 끌기는 터치에서 동작하지 않고 키보드로는 아예 불가능하다.
   * 두 길이 같은 `applyMove`를 지나므로 규칙이 갈릴 수 없다.
   */
  const dragProps = (pile: PileId, index: number) => ({
    draggable: true,
    onDragStart: (e: DragEvent) => {
      // 파이어폭스는 데이터가 없으면 끌기 자체를 시작하지 않는다.
      e.dataTransfer.setData('text/plain', `${pile}:${index}`)
      e.dataTransfer.effectAllowed = 'move'
      setDrag({ pile, index })
      setHeld(null)
    },
    onDragEnd: () => setDrag(null),
  })

  /** 놓을 수 있는 자리에만 붙는다. 못 받는 자리는 `preventDefault`를 안 해 커서가 거절을 알린다. */
  const dropProps = (pile: PileId) => ({
    onDragOver: (e: DragEvent) => {
      if (targets?.has(pile)) e.preventDefault()
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault()
      if (drag) applyMove(drag, pile)
      setDrag(null)
    },
  })

  /** 카드를 눌렀다. 집은 게 없으면 집고, 있으면 그 자리로 옮겨 본다. */
  const clickCard = (pile: PileId, index: number, card: Card) => {
    if (!card.faceUp) return
    if (held && (held.pile !== pile || held.index !== index)) {
      // 옮길 수 없는 자리를 눌렀으면 **그 카드를 새로 집는다** — 아무 일도 안 일어나는
      // 클릭은 "왜 안 되지"만 남긴다. 기초 더미 위 카드는 다시 집지 않는다.
      const next = move(state, held.pile, held.index, pile)
      if (next) {
        setState(next)
        setHeld(null)
        return
      }
    }
    setHeld((h) => (h && h.pile === pile && h.index === index ? null : { pile, index }))
  }

  /** 더블클릭 = 기초 더미로 보내기. 갈 곳이 없으면 아무 일도 없다. */
  const autoSend = (pile: PileId) => {
    const next = sendToFoundation(state, pile)
    if (next) {
      setState(next)
      setHeld(null)
    }
  }

  /** 집힌 표시. 눌러서 집은 것과 끌고 있는 것을 **같은 모양**으로 알린다(같은 뜻이다). */
  const isHeld = (pile: PileId, index: number) =>
    [held, drag].some((h) => !!h && h.pile === pile && h.index === index)

  return (
    <div className="sol">
      <div className="sol-bar">
        <button type="button" className="sol-btn" onClick={restart}>
          새 게임
        </button>
        {/* ux `color-not-only`: 이겼다는 사실을 색이 아니라 문장으로 말한다.
            role="status"라 스크린 리더에도 알려진다. */}
        <p className="sol-status" role="status">
          {won ? '완성했습니다. 축하합니다!' : `남은 카드 ${state.stock.length}장`}
        </p>
      </div>

      <div className="sol-top">
        <Slot cards={state.stock} label="산" onClick={() => setState(draw(state))} />
        <Slot
          cards={state.waste}
          label="뽑은 카드"
          held={isHeld('waste', state.waste.length - 1)}
          onClick={() => {
            const top = state.waste.length - 1
            if (top >= 0) clickCard('waste', top, state.waste[top])
          }}
          onDoubleClick={() => autoSend('waste')}
          handlers={
            state.waste[state.waste.length - 1]?.faceUp
              ? dragProps('waste', state.waste.length - 1)
              : undefined
          }
        />
        {/* ⚠️ 기초 더미는 3열이 아니라 **4열부터** 시작한다(CSS가 격자 칸을 건너뛴다) —
            산 묶음과 갈라 놓는 빈 칸이 실제 솔리테어의 배치다. 빈 span으로 자리를
            채우지 않는다: 그러면 격자 칸 하나가 눌리지 않는 장식으로 남는다. */}
        {SUITS.map((suit, i) => (
          <Slot
            key={suit}
            cards={state.foundations[i]}
            label={`${SUIT_NAMES[suit]} 기초 더미`}
            highlight={!!targets?.has(`f${i}`)}
            onClick={() => dropOn(`f${i}`)}
            handlers={dropProps(`f${i}`)}
          />
        ))}
      </div>

      <div className="sol-table">
        {state.tableau.map((pile, col) => (
          /* 놓는 자리는 **열 전체**다 — 쌓인 카드 위 어디에 떨어뜨려도 같은 더미로 간다
             (맨 위 카드만 받으면 긴 더미에서 조준이 필요해진다: ux `no-precision-required`). */
          <div
            className={`sol-col${targets?.has(`t${col}`) ? ' sol-drop' : ''}`}
            key={col}
            {...dropProps(`t${col}`)}
          >
            {/* 빈 더미에도 놓을 자리가 있어야 K를 옮길 수 있다. 카드가 있으면
                맨 아래 카드가 그 자리를 덮으므로 이 버튼은 배경으로만 남는다. */}
            <button
              type="button"
              className="sol-slot sol-slot-empty sol-col-base"
              onClick={() => dropOn(`t${col}`)}
              aria-label={`작업 더미 ${col + 1}${pile.length ? '' : ', 비어 있음'}`}
            />
            {pile.map((card, i) => (
              <button
                type="button"
                key={card.id}
                className={`sol-stacked${isHeld(`t${col}`, i) ? ' sol-stacked-held' : ''}`}
                {...(card.faceUp ? dragProps(`t${col}`, i) : {})}
                /* 쌓임은 흐름이 아니라 좌표다 — 뒤집힌 카드는 좁게, 앞면은 넓게 겹친다
                   (앞면은 숫자와 무늬가 보여야 한다). */
                style={{ top: stackOffset(pile, i) }}
                onClick={() => (card.faceUp ? clickCard(`t${col}`, i, card) : undefined)}
                onDoubleClick={() => card.faceUp && autoSend(`t${col}`)}
                aria-pressed={card.faceUp ? isHeld(`t${col}`, i) : undefined}
                aria-label={`작업 더미 ${col + 1}, ${cardName(card)}`}
              >
                <span
                  className={`sol-card${card.faceUp ? '' : ' sol-card-back'}${
                    isHeld(`t${col}`, i) ? ' sol-card-held' : ''
                  }`}
                >
                  {card.faceUp ? <CardFace card={card} /> : null}
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** 쌓인 카드의 세로 위치. 뒤집힌 카드는 8px, 앞면은 22px씩 내려 겹친다. */
function stackOffset(pile: Card[], index: number): number {
  let y = 0
  for (let i = 0; i < index; i++) y += pile[i].faceUp ? 22 : 8
  return y
}
