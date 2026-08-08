import { useState } from 'react'
import { findContest } from '../../../data/contests'
import { AppIcon } from '../../../icons/AppIcon'
import { useGameStore } from '../../../store/gameStore'
import { artFileName, artGrade, artRatio, artworksOf } from '../../../systems/artwork'
import {
  canEnter,
  contestsStateOf,
  entryBlockers,
  openContests,
  pendingEntries,
} from '../../../systems/contests'
import { findProject, openProjects, projectScore } from '../../../systems/projects'
import type { Contest } from '../../../data/contests'
import type { Site } from '../../../data/sites'
import type { ContestEntry, GameState } from '../../../types/game'
import './ContestSite.css'

/**
 * 콘테스트하다 — 공모전 접수처.
 *
 * ## ⚠️ 출품은 턴을 쓰지 않는다
 * 그몽 수주·은행 거래와 같은 부류다(봉투에 넣어 부치는 일이지 그리는 일이 아니다).
 * 그래서 이 화면에는 **확인창(`ActivityConfirm`)이 없고** 그냥 버튼 하나다. 시간의 비용은
 * **발표까지의 기다림**이 진다 — 그래서 심사 중 현황이 목록보다 위에 선다.
 *
 * ## ⚠️ 화면은 판정을 만들지 않는다
 * 낼 수 있는지는 `canEnter`, 못 내는 사유는 `entryBlockers`가 만든다. 조건 미달 작품집은
 * **감추지 않고 비활성 + 사유**로 둔다(알바몬·그몽과 같은 규칙).
 *
 * ## ⚠️ 탭이 곧 진짜 필터다
 * 만화 공모는 작품집을, 단일 공모는 그림 한 장을 받는다 — 고르는 것이 실제로 달라지므로
 * 탭이 장식이 아니다(갈 데 없는 메뉴 금지).
 */
export function ContestSite({ site }: { site: Site }) {
  const state = useGameStore((s) => s.state)
  const enter = useGameStore((s) => s.enterContest)
  const [tab, setTab] = useState<'all' | Contest['kind']>('all')
  /** 지금 출품 창이 열린 공모전. 한 번에 하나만 연다(판이 카드로 뒤덮이지 않게). */
  const [openId, setOpenId] = useState<string | null>(null)

  if (!state) return null

  const book = contestsStateOf(state)
  const open = openContests(state)
  const list = tab === 'all' ? open : open.filter((c) => c.kind === tab)
  const pending = pendingEntries(state)
  const decided = book.entries.filter((e) => e.prize !== undefined)

  return (
    <div className="ct">
      <header className="ct-head">
        <h1 className="ct-logo">
          <AppIcon name={site.icon} size={24} />
          콘테스트하다
        </h1>
        <p className="ct-lede">
          그린 것을 내고 발표를 기다립니다. 출품에는 시간이 들지 않습니다 — 대신 결과가
          나올 때까지 며칠이 걸립니다.
          {book.entries.length > 0 && ` · 출품 ${book.entries.length}건`}
          {book.wins > 0 && ` · 입상 ${book.wins}회`}
          {book.earned > 0 && ` · 누적 상금 ${book.earned.toLocaleString('ko-KR')}원`}
        </p>
      </header>

      {/* 심사 중. ⚠️ 목록보다 위에 둔다 — 지금 무엇을 기다리는 중인지가 먼저 읽혀야 한다. */}
      {pending.length > 0 && (
        <section className="ct-sec" aria-label="심사 중인 출품">
          <h2 className="ct-sec-head">
            심사 중<span className="ct-sec-count">{pending.length}건</span>
          </h2>
          <ul className="ct-pending">
            {pending.map((e) => (
              <li key={entryKey(e)} className="ct-pending-row">
                <span className="ct-pending-name">{contestName(e)}</span>
                <span className="ct-pending-what">{entryLabel(state, e)}</span>
                <span className="ct-pending-when">
                  {e.enteredDay}일차 출품 · <b>{e.resultDay}일차 발표</b>
                  {waitText(e.resultDay - state.day)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 발표된 결과. 낙선도 결과라 함께 적는다(아무 말도 안 하는 상태를 만들지 않는다). */}
      {decided.length > 0 && (
        <section className="ct-sec" aria-label="발표된 결과">
          <h2 className="ct-sec-head">
            발표된 결과<span className="ct-sec-count">{decided.length}건</span>
          </h2>
          <ul className="ct-pending">
            {decided.map((e) => (
              <li key={entryKey(e)} className="ct-pending-row">
                <span className="ct-pending-name">{contestName(e)}</span>
                <span className="ct-pending-what">{entryLabel(state, e)}</span>
                {/* 색만으로 알리지 않는다 — 글자가 상 이름 또는 "낙선"을 그대로 말한다. */}
                <span className={`ct-result${e.prize ? ' ct-result-won' : ''}`}>
                  {e.prize ? `${e.prize} · ${(e.money ?? 0).toLocaleString('ko-KR')}원` : '낙선'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 탭이 곧 필터다. 눌러도 갈 데 없는 항목을 만들지 않으려 건수를 함께 적는다. */}
      <nav className="ct-tabs" aria-label="공모전 종류">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`ct-tab${tab === t.key ? ' ct-tab-on' : ''}`}
            aria-current={tab === t.key ? 'true' : undefined}
            onClick={() => {
              setTab(t.key)
              setOpenId(null)
            }}
          >
            {t.label}
            <span className="ct-tab-count">
              {(t.key === 'all' ? open : open.filter((c) => c.kind === t.key)).length}
            </span>
          </button>
        ))}
      </nav>

      <section className="ct-sec" aria-label="접수 중인 공모전">
        {list.length === 0 ? (
          /* ux `empty-states`: 빈 줄만 남기지 않고 무엇이 일어났는지 알린다. */
          <p className="ct-empty">
            {open.length === 0
              ? '접수 중인 공모전에 전부 출품했습니다. 결과를 기다려 보세요.'
              : '이 종류의 공모전은 남아 있지 않습니다. 다른 탭을 눌러 보세요.'}
          </p>
        ) : (
          <ul className="ct-grid">
            {list.map((contest) => (
              <li key={contest.id}>
                <ContestCard
                  contest={contest}
                  state={state}
                  open={openId === contest.id}
                  onToggle={() => setOpenId(openId === contest.id ? null : contest.id)}
                  onEnter={(pick) => {
                    enter(contest.id, pick)
                    setOpenId(null)
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="ct-foot">
        <p>
          한 공모전에는 한 번만 낼 수 있고, 낸 작품집은 다시 쓸 수 없습니다. 심사에 운은 없고
          <b> 낸 시점의 완성도</b>만 봅니다.
        </p>
        <p>{site.url}</p>
      </footer>
    </div>
  )
}

const TABS: { key: 'all' | Contest['kind']; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'comic', label: '만화 공모' },
  { key: 'single', label: '단일 그림' },
]

const KIND_LABEL: Record<Contest['kind'], string> = {
  comic: '작품집 출품',
  single: '그림 한 장',
}

function entryKey(e: ContestEntry): string {
  return `${e.contestId}-${e.enteredDay}`
}

function contestName(e: ContestEntry): string {
  const contest = findContest(e.contestId)
  return contest ? `${contest.host} · ${contest.title}` : e.contestId
}

/** 무엇을 냈는가. 낸 뒤에도 되짚을 수 있어야 "언제 낼지"가 판단이 된다. */
function entryLabel(state: GameState, e: ContestEntry): string {
  if (e.projectId) {
    const project = findProject(state, e.projectId)
    return `${project?.name ?? '작품집'} · ${e.pages}장 · 완성도 ${pct(e.score)}`
  }
  const work = artworksOf(state).find((a) => a.id === e.artworkId)
  return `${work ? artFileName(work) : '그림'} · 완성도 ${pct(e.score)}`
}

function pct(score: number): string {
  return `${Math.round(score * 100)}%`
}

/** 남은 날. 오늘이 발표일이면 그 사실을 말한다(숫자만으로는 오늘인 줄 모른다). */
function waitText(left: number): string {
  if (left > 1) return ` (${left}일 남음)`
  if (left === 1) return ' (내일)'
  return ' (오늘 밤)'
}

/**
 * 공모전 카드. 누르면 **낼 것을 고르는 칸**이 카드 안에서 열린다 —
 * 출품은 턴을 안 쓰므로 확인창을 띄우지 않는다.
 */
function ContestCard({
  contest,
  state,
  open,
  onToggle,
  onEnter,
}: {
  contest: Contest
  state: GameState
  open: boolean
  onToggle: () => void
  onEnter: (pick: { projectId?: string; artworkId?: string }) => void
}) {
  return (
    <article className={`ct-card${open ? ' ct-card-open' : ''}`}>
      <p className="ct-host">{contest.host}</p>
      <h3 className="ct-title">
        {contest.title}
        {contest.badge && <span className="ct-badge">{contest.badge}</span>}
      </h3>

      <p className="ct-terms">
        {KIND_LABEL[contest.kind]}
        {contest.kind === 'comic' && ` · ${contest.minPages}~${contest.maxPages}장`} · 발표까지{' '}
        <b>{contest.judgeDays}일</b>
      </p>

      <ul className="ct-tags">
        {contest.tags.map((t) => (
          <li key={t} className="ct-tag">
            {t}
          </li>
        ))}
      </ul>

      <table className="ct-prize">
        <thead>
          <tr>
            <th scope="col">상</th>
            <th scope="col">상금</th>
            <th scope="col">평판</th>
          </tr>
        </thead>
        <tbody>
          {contest.prizes.map((p, i) => (
            <tr key={p.label} className={i === 0 ? 'ct-prize-top' : undefined}>
              <th scope="row">{p.label}</th>
              <td>{p.money.toLocaleString('ko-KR')}원</td>
              <td>+{p.reputation}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button type="button" className="ct-open" aria-expanded={open} onClick={onToggle}>
        {open ? '접기' : '출품하기'}
      </button>

      {open && <EntryPicker key={contest.id} contest={contest} state={state} onEnter={onEnter} />}
    </article>
  )
}

/**
 * 낼 것을 고른다. **조건 미달 후보를 감추지 않는다** — 비활성으로 두고 사유를 적는다.
 * ⚠️ 사유는 `entryBlockers` 하나에서 나온다(화면이 두 번째 판정을 만들지 않는다).
 */
function EntryPicker({
  contest,
  state,
  onEnter,
}: {
  contest: Contest
  state: GameState
  onEnter: (pick: { projectId?: string; artworkId?: string }) => void
}) {
  const [pick, setPick] = useState<{ projectId?: string; artworkId?: string }>({})
  const comic = contest.kind === 'comic'
  const projects = comic ? openProjects(state) : []
  const works = comic ? [] : artworksOf(state)
  const empty = comic ? projects.length === 0 : works.length === 0
  const blockers = entryBlockers(state, contest, pick)

  return (
    <div className="ct-pick">
      {empty ? (
        /* ux `empty-states`: 왜 비었는지 + 무엇을 하면 되는지를 함께 적는다. */
        <p className="ct-empty ct-empty-sm">
          {comic
            ? '아직 쓸 수 있는 작품집이 없습니다. 클립스튜디오에서 작품집을 만들고 그림을 채워 보세요.'
            : '아직 그린 그림이 없습니다. 클립스튜디오에서 한 장 그려 보세요.'}
        </p>
      ) : (
        <fieldset className="ct-pick-set">
          <legend className="ct-pick-legend">{comic ? '낼 작품집' : '낼 그림'}</legend>
          {comic
            ? projects.map((p) => {
                const reasons = entryBlockers(state, contest, { projectId: p.id })
                return (
                  <label
                    key={p.id}
                    className={`ct-opt${reasons.length > 0 ? ' ct-opt-locked' : ''}`}
                  >
                    <input
                      type="radio"
                      name={`pick-${contest.id}`}
                      disabled={reasons.length > 0}
                      checked={pick.projectId === p.id}
                      onChange={() => setPick({ projectId: p.id })}
                    />
                    <span className="ct-opt-body">
                      <span className="ct-opt-name">{p.name}</span>
                      <span className="ct-opt-meta">
                        {p.pageIds.length}장 · 완성도 {pct(projectScore(state, p))}
                      </span>
                      {reasons.map((r) => (
                        <span key={r} className="ct-lock">
                          <AppIcon name="mdi:lock-outline" size={13} />
                          {r}
                        </span>
                      ))}
                    </span>
                  </label>
                )
              })
            : works.map((w) => (
                <label key={w.id} className="ct-opt">
                  <input
                    type="radio"
                    name={`pick-${contest.id}`}
                    checked={pick.artworkId === w.id}
                    onChange={() => setPick({ artworkId: w.id })}
                  />
                  <span className="ct-opt-body">
                    <span className="ct-opt-name">{artFileName(w)}</span>
                    <span className="ct-opt-meta">
                      {artGrade(w)}등급 · 완성도 {pct(artRatio(w))} · {w.day}일차
                    </span>
                  </span>
                </label>
              ))}
        </fieldset>
      )}

      {/* 못 내는 사유는 버튼 옆이 아니라 버튼 위에 둔다(ux `error-placement`). */}
      {!empty &&
        blockers.map((r) => (
          <p key={r} className="ct-lock">
            <AppIcon name="mdi:lock-outline" size={13} />
            {r}
          </p>
        ))}

      <button
        type="button"
        className="ct-submit"
        disabled={!canEnter(state, contest, pick)}
        onClick={() => onEnter(pick)}
      >
        출품하기
      </button>
      <span className="ct-submit-note">
        출품에는 시간이 들지 않습니다. 낸 뒤에는 고칠 수 없습니다.
      </span>
    </div>
  )
}
