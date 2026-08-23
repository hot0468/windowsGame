import { useState } from 'react'
import { MISS_REPUTATION_PENALTY, TOOL_NAMES, findGig } from '../../../data/gigs'
import { AppIcon } from '../../../icons/AppIcon'
import { rankOfWork } from '../../../systems/works'
import { useGameStore } from '../../../store/gameStore'
import {
  activeContract,
  canTake,
  daysLeft,
  gigsOf,
  isDone,
  openGigs,
  takeBlockers,
  canDeliver,
  deliverBlockers,
  gigProgress,
} from '../../../systems/gigs'
import type { Gig } from '../../../data/gigs'
import type { Site } from '../../../data/sites'
import type { GameState } from '../../../types/game'
import './GmongSite.css'

/**
 * 그몽 — 부업(외주) 중개.
 *
 * ## ⚠️ 알바몬과 구조가 다르다(2026-08-08 재설계)
 * 알바몬은 공고를 누르면 **그 자리에서 1턴을 쓰고 일당을 받는다**. 여기는 셋으로 나뉜다:
 * **수주**(턴 없음, 기한이 걸린다) → **작업**(도구 앱을 켠다, 한 번이 1턴) → **납품**
 * (업무량을 다 채우는 순간 보수가 들어온다).
 *
 * 그래서 이 화면에는 **확인창(`ActivityConfirm`)이 없다** — 여기서 누르는 것은 활동이
 * 아니라 계약이고, 턴도 스탯도 움직이지 않기 때문이다(은행 거래와 같은 부류).
 * 실제로 시간을 쓰는 자리는 **바탕화면의 도구 앱**이다.
 *
 * ⚠️ **한 번에 하나만 받는다**(`GigContract`가 단수다). 그래서 받아 둔 일이 있으면
 * 화면 맨 위에 진행 카드가 서고 나머지 일감은 "이미 받아 둔 일이 있습니다"로 잠긴다.
 *
 * ⚠️ **조건 미달 일감을 감추지 않는다** — 판정은 `canTake`, 사유는 `takeBlockers`가
 * 만든다(화면이 두 번째 판정을 만들지 않는다).
 */
export function GmongSite({ site }: { site: Site }) {
  const state = useGameStore((s) => s.state)
  const takeGig = useGameStore((s) => s.takeGig)
  const abandonGig = useGameStore((s) => s.abandonGig)
  /** 포기 확인 중인가. ⚠️ 되돌릴 수 없고 평판이 깎이므로 한 번 묻는다. */
  const [confirmAbandon, setConfirmAbandon] = useState(false)

  if (!state) return null
  const book = gigsOf(state)
  const contract = activeContract(state)
  const progress = gigProgress(state)
  const deliver = useGameStore((s) => s.deliverGig)
  const current = contract ? findGig(contract.gigId) : undefined
  const list = openGigs(state)

  return (
    <div className="gm">
      <header className="gm-head">
        <h1 className="gm-logo">
          <AppIcon name={site.icon} size={24} />
          그몽
        </h1>
        <p className="gm-lede">
          건별로 받는 일. 받으면 <b>기한 안에</b> 도구로 업무량을 채워야 합니다.
          {book.done.length > 0 && ` · 납품 ${book.done.length}건`}
          {book.missed > 0 && ` · 놓친 마감 ${book.missed}건`}
          {book.earned > 0 && ` · 받은 보수 ${book.earned.toLocaleString('ko-KR')}원`}
        </p>
      </header>

      {/* 받아 둔 일. ⚠️ 목록보다 위에 둔다 — 지금 무엇을 해야 하는지가 먼저 읽혀야 한다. */}
      {contract && current && (
        <section className="gm-active" aria-label="진행 중인 일">
          <p className="gm-active-kicker">진행 중</p>
          <h2 className="gm-active-title">
            {current.client} · {current.title}
          </h2>

          {/* 진행 = **요구 등급에 닿은 작업물 개수**(2026-08-22). 계약이 아니라 작업물이
              진척을 갖는다 — 도구 창의 게이지와 같은 사실을 여기서는 개수로 읽는다. */}
          <div className="gm-progress">
            <div
              className="gm-bar"
              role="img"
              aria-label={`${current.wants.rank}등급 ${progress.done} / ${progress.total}`}
            >
              <span
                className="gm-bar-fill"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
            {/* 색만으로 알리지 않는다 — 숫자가 같은 사실을 말한다(ux `color-not-only`). */}
            <p className="gm-progress-text">
              <b>{current.wants.rank}등급</b> 작업물 <b>{progress.done}</b> / {progress.total} ·{' '}
              <b>{TOOL_NAMES[current.tool]}</b>
              {objectParticle(TOOL_NAMES[current.tool])} 켜서 만들고 보강하세요
            </p>
            {progress.works.length > 0 && (
              <ul className="gm-works">
                {progress.works.map((w) => (
                  <li key={w.id} className="gm-work">
                    <span className="gm-work-name">{w.title}</span>
                    <span
                      className={`gm-work-rank${
                        rankOfWork(w) === 'S' || rankOfWork(w) === 'SS' ? ' gm-work-rank-top' : ''
                      }`}
                    >
                      {rankOfWork(w)}
                    </span>
                    <span className="gm-work-pct">{Math.round(w.progress * 100)}%</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ⚠️ 남은 날을 색만으로 알리지 않는다 — 문장 자체가 급한지 아닌지를 말한다. */}
          <p className={`gm-due${(daysLeft(state) ?? 0) <= 1 ? ' gm-due-soon' : ''}`}>
            {dueText(daysLeft(state) ?? 0, contract.dueDay)}
          </p>

          <p className="gm-active-pay">
            회신하면 <b>{current.pay.toLocaleString('ko-KR')}원</b>
          </p>

          {/* ⚠️ **회신은 자동이 아니다**(설계자 지시) — 다 채워도 누르기 전에는 돈이 안 들어온다.
              더 올려 두고 낼지 지금 낼지 고르는 자리가 여기다. 턴은 안 쓴다(메일 한 통). */}
          <button
            type="button"
            className="gm-deliver"
            onClick={deliver}
            disabled={!canDeliver(state)}
          >
            클라이언트에게 회신하기
          </button>
          {!canDeliver(state) && (
            <p className="gm-deliver-why">{deliverBlockers(state)[0]}</p>
          )}

          {/*
            ⚠️ **한 번 묻는다**(ux `confirmation-dialogs`). 스케줄러의 예약 취소도 확인을
            받는데, 포기는 그보다 무겁다 — 되돌릴 수 없고 평판까지 깎인다.
            ⚠️ `window.confirm`은 쓰지 않는다(가짜 OS 위의 진짜 대화상자는 컨셉을 깬다).
            기본 초점은 **덜 위험한 쪽**([그대로 두기])이다.
          */}
          {confirmAbandon ? (
            <div className="gm-confirm" role="alertdialog" aria-label="일감 포기 확인">
              <p className="gm-confirm-text">
                포기하면 평판이 {MISS_REPUTATION_PENALTY} 깎입니다. 마감을 놓친 것과 같습니다.
              </p>
              <button
                type="button"
                className="gm-abandon"
                autoFocus
                onClick={() => setConfirmAbandon(false)}
              >
                그대로 두기
              </button>
              <button
                type="button"
                className="gm-abandon gm-abandon-yes"
                onClick={() => {
                  abandonGig()
                  setConfirmAbandon(false)
                }}
              >
                포기합니다
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="gm-abandon"
                onClick={() => setConfirmAbandon(true)}
              >
                포기하기
              </button>
              <span className="gm-abandon-note">
                포기해도 평판은 마감을 놓친 것과 똑같이 깎입니다.
              </span>
            </>
          )}
        </section>
      )}

      <section className="gm-sec" aria-label="일감">
        <h2 className="gm-sec-head">
          받을 수 있는 일
          <span className="gm-sec-count">{list.length}건</span>
        </h2>
        {list.length === 0 ? (
          /* ux `empty-states`: 빈 줄만 남기지 않고 무엇이 일어났는지 알린다. */
          <p className="gm-empty">올라온 일감을 전부 납품했습니다.</p>
        ) : (
          <ul className="gm-list">
            {list.map((gig) => (
              <li key={gig.id}>
                <GigCard gig={gig} state={state} onTake={() => takeGig(gig.id)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="gm-foot">
        <p>
          보수는 업무량을 다 채운 그 자리에서 지급됩니다. 기한을 넘기면 계약이 깨지고 평판이
          깎입니다.
        </p>
        <p>{site.url}</p>
      </footer>
    </div>
  )
}

/**
 * 한국어 조사. ⚠️ **도구 이름이 변수라 "을(를)"로 뭉갤 수 없다** — 카드마다 세 번씩
 * 나오는 문구라 어색함이 바로 눈에 띈다(실측에서 "포토샵로"가 나왔다).
 * 마지막 글자의 받침 유무만 보면 되고, 'VS 코드'처럼 영문이 섞여도 끝 글자가 한글이면
 * 정확히 판정된다(한글 음절은 유니코드 배치상 `(코드-0xAC00) % 28`이 종성이다).
 */
function hasFinalConsonant(word: string): boolean {
  const last = word.trim().charCodeAt(word.trim().length - 1)
  if (last < 0xac00 || last > 0xd7a3) return false
  return (last - 0xac00) % 28 !== 0
}

/** 목적격 조사(을/를). */
function objectParticle(word: string): string {
  return hasFinalConsonant(word) ? '을' : '를'
}

/** 도구격 조사(으로/로). */
function instrumentParticle(word: string): string {
  return hasFinalConsonant(word) ? '으로' : '로'
}

/** 마감 문구. 오늘이 마지막 날이면 그 사실을 명시한다(숫자만으로는 급한 줄 모른다). */
function dueText(left: number, dueDay: number): string {
  if (left > 1) return `마감까지 ${left}일 남았습니다 (${dueDay}일차)`
  if (left === 1) return `마감이 내일입니다 (${dueDay}일차)`
  return `오늘이 마감입니다 (${dueDay}일차) — 넘기면 계약이 깨집니다`
}

/**
 * 일감 카드. 못 받으면 **감추지 않고 비활성**으로 그리고 사유를 적는다.
 * ⚠️ 사유는 `takeBlockers` 하나에서 나온다 — 화면이 문구를 새로 만들지 않는다.
 */
function GigCard({ gig, state, onTake }: { gig: Gig; state: GameState; onTake: () => void }) {
  const allowed = canTake(state, gig)
  const reasons = allowed ? [] : takeBlockers(state, gig)

  return (
    <article className={`gm-card${allowed ? '' : ' gm-card-locked'}`}>
      <span className="gm-mark" aria-hidden="true">
        <AppIcon name={TOOL_ICONS[gig.tool]} size={22} />
      </span>

      <span className="gm-body">
        <span className="gm-client">{gig.client}</span>
        <span className="gm-title">
          {gig.title}
          {gig.badge && <span className="gm-badge">{gig.badge}</span>}
        </span>
        {/* 계약 조건을 카드에 그대로 적는다 — 받기 전에 알아야 하는 것 셋이다. */}
        <span className="gm-terms">
          {TOOL_NAMES[gig.tool]}
          {instrumentParticle(TOOL_NAMES[gig.tool])} <b>{gig.wants.rank}등급 {gig.wants.count}개</b> · 기한{' '}
          <b>{gig.days}</b>일 ·{' '}
          {isDone(state, gig.id) ? '납품 완료' : `보수 ${gig.pay.toLocaleString('ko-KR')}원`}
        </span>
        <span className="gm-tags">
          {gig.tags.map((t) => (
            <span key={t} className="gm-tag">
              {t}
            </span>
          ))}
        </span>
        {reasons.map((r) => (
          <span key={r} className="gm-lock">
            <AppIcon name="mdi:lock-outline" size={13} />
            {r}
          </span>
        ))}
      </span>

      <span className="gm-pay">
        <span className="gm-pay-label">보수</span>
        <span className="gm-pay-value">{gig.pay.toLocaleString('ko-KR')}원</span>
        <button type="button" className="gm-take" onClick={onTake} disabled={!allowed}>
          받기
        </button>
      </span>
    </article>
  )
}

/**
 * 도구별 아이콘. ⚠️ **바탕화면 항목과 같은 로고를 쓴다**(devicon) — 카드에서 본 그림과
 * 켜야 할 아이콘이 같아야 "무엇을 켜라는 것인지"가 설명 없이 전해진다.
 */
const TOOL_ICONS: Record<string, string> = {
  photoshop: 'devicon:photoshop',
  premiere: 'devicon:premierepro',
  vscode: 'devicon:vscode',
}
