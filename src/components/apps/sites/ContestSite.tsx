import { useState } from 'react'
import { CONTEST_CATEGORIES, CONTEST_POSTER, findContest } from '../../../data/contests'
import { AppIcon } from '../../../icons/AppIcon'
import { useGameStore } from '../../../store/gameStore'
import { artFileName, artGrade, artRatio, artworksOf } from '../../../systems/artwork'
import {
  canEnter,
  contestsStateOf,
  entryBlockers,
  openContests,
  pendingEntries,
  prizeFor,
  statScore,
} from '../../../systems/contests'
import { findProject, openProjects, projectScore } from '../../../systems/projects'
import type { Contest, ContestCategory } from '../../../data/contests'
import type { Site } from '../../../data/sites'
import { STAT_NAMES } from '../../../types/game'
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
  /** 분야 칩. `null`이면 전체다(레퍼런스의 [전체] 칩). */
  const [category, setCategory] = useState<ContestCategory | null>(null)
  const [sort, setSort] = useState<SortKey>('default')
  /** 지금 출품 창이 열린 공모전. 한 번에 하나만 연다(판이 카드로 뒤덮이지 않게). */
  const [openId, setOpenId] = useState<string | null>(null)

  if (!state) return null

  const book = contestsStateOf(state)
  const open = openContests(state)
  const filtered = category ? open.filter((c) => c.category === category) : open
  /* ⚠️ 원본을 정렬하지 않는다(`[...]`) — `openContests`가 돌려주는 배열을 뒤집으면
     다른 화면이 보는 순서까지 바뀐다. */
  const list = [...filtered].sort((a, b) =>
    sort === 'prize' ? topPrize(b) - topPrize(a) : sort === 'fast' ? a.judgeDays - b.judgeDays : 0,
  )
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

      {/*
        분야 칩 줄. 레퍼런스(실제 공모전 모음 사이트)의 카테고리 줄이고, **칩 목록은
        대회 데이터에서 파생한다**(`CONTEST_CATEGORIES`) — 따로 적으면 대회를 더할 때
        누르면 빈 목록이 나오는 칩이 생긴다.
        ⚠️ 건수를 함께 적는 이유는 그것 하나로 "눌러도 되는가"가 읽히기 때문이다.
      */}
      <nav className="ct-chips" aria-label="분야">
        <button
          type="button"
          className={`ct-chip${category === null ? ' ct-chip-on' : ''}`}
          aria-current={category === null ? 'true' : undefined}
          onClick={() => {
            setCategory(null)
            setOpenId(null)
          }}
        >
          전체 <span className="ct-chip-count">{open.length}</span>
        </button>
        {CONTEST_CATEGORIES.map((c) => {
          const n = open.filter((x) => x.category === c).length
          return (
            <button
              key={c}
              type="button"
              className={`ct-chip${category === c ? ' ct-chip-on' : ''}`}
              aria-current={category === c ? 'true' : undefined}
              onClick={() => {
                setCategory(category === c ? null : c)
                setOpenId(null)
              }}
            >
              {c} <span className="ct-chip-count">{n}</span>
            </button>
          )
        })}
      </nav>

      <div className="ct-sortbar">
        <label className="ct-sort">
          <span className="ct-sort-label">정렬</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            {SORTS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

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

/**
 * 정렬. **전부 실제로 목록을 바꾼다** — 레퍼런스의 [최신순] 드롭다운 자리이고,
 * 갈 데 없는 선택지를 만들지 않으려 이 게임이 실제로 아는 값만 둔다.
 */
const SORTS = [
  { key: 'default', label: '기본순' },
  { key: 'prize', label: '상금 높은 순' },
  { key: 'fast', label: '발표 빠른 순' },
] as const
type SortKey = (typeof SORTS)[number]['key']

const KIND_LABEL: Record<Contest['kind'], string> = {
  comic: '작품집 출품',
  single: '그림 한 장',
  /* ⚠️ 낼 물건이 없다 — 그래서 "무엇을 내는가"가 아니라 **무엇으로 겨루는가**를 적는다. */
  stat: '실력으로 겨룸',
}

/** 그 공모전의 최고 상금. 카드가 한 줄로 요약할 때 쓴다. */
function topPrize(c: Contest): number {
  return Math.max(...c.prizes.map((p) => p.money))
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
      {/*
        포스터 자리. ⚠️ **이미지가 아니라 그라데이션 + 글자다**(배너·썸네일과 같은 규칙).
        레퍼런스 카드의 큰 포스터 사진 자리이고, 분야마다 색이 달라 훑을 때 갈래가 보인다.
        ⚠️ 배지 둘은 **실제 값**이다: 왼쪽은 발표까지 며칠(D-표기), 오른쪽은 최고 상금.
        레퍼런스의 [AD] 배지는 안 그린다 — 이 게임에 광고주가 없다.
      */}
      <div className="ct-poster" style={{ background: CONTEST_POSTER[contest.category] }}>
        <span className="ct-poster-dday">D-{contest.judgeDays}</span>
        <span className="ct-poster-prize">최고 {(topPrize(contest) / 10000).toFixed(0)}만원</span>
        {/* ⚠️ **제목은 포스터가 진다** — 아래에 또 적으면 카드마다 같은 문장이 두 번
            나온다(실측에서 그렇게 보였다). 아래는 분야·조건·상금만 남는다. */}
        <h3 className="ct-poster-title">{contest.title}</h3>
        <span className="ct-poster-host">
          {contest.host}
          {contest.badge && <span className="ct-poster-badge">{contest.badge}</span>}
        </span>
      </div>

      <p className="ct-cat">{contest.category}</p>

      <p className="ct-terms">
        {KIND_LABEL[contest.kind]}
        {contest.kind === 'comic' && ` · ${contest.minPages}~${contest.maxPages}장`}
        {contest.kind === 'stat' &&
          ` · ${(contest.judgedBy ?? []).map((k) => STAT_NAMES[k]).join('·')}`} · 발표까지{' '}
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
  /*
   * ⚠️ **스탯 대회는 고를 것이 없다** — 낼 물건이 아니라 지금의 실력으로 나간다.
   * 대신 **지금 점수와 어느 상까지 닿는지**를 미리 적는다: 고르는 화면이 없으니
   * 여기서 아무 말도 안 하면 버튼 하나만 덩그러니 남는다.
   */
  if (contest.kind === 'stat') {
    const score = statScore(state, contest)
    const prize = prizeFor(contest, score)
    return (
      <div className="ct-pick">
        <p className="ct-stat-now">
          지금 점수 <b>{pct(score)}</b>
          <span className="ct-stat-keys">
            {(contest.judgedBy ?? [])
              .map((k) => `${STAT_NAMES[k]} ${state.stats[k]}`)
              .join(' · ')}
          </span>
        </p>
        {/* 색만으로 알리지 않는다 — 지금 내면 어떻게 되는지를 글자가 그대로 말한다. */}
        <p className="ct-stat-verdict">
          {prize
            ? `지금 내면 「${prize.label}」입니다.`
            : '지금 내면 낙선입니다. 더 올리고 내도 됩니다 — 다만 한 번뿐입니다.'}
        </p>
        <button
          type="button"
          className="ct-submit"
          disabled={!canEnter(state, contest, {})}
          onClick={() => onEnter({})}
        >
          출품하기
        </button>
        <span className="ct-submit-note">
          출품에는 시간이 들지 않습니다. 낸 시점의 점수로 발표일에 확정됩니다.
        </span>
      </div>
    )
  }

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
