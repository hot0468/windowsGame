import { useState } from 'react'
import { findActivity } from '../../../data/activities'
import { MIN_BOOK_PAGES, WON_PER_PAGE } from '../../../data/contests'
import { AppIcon } from '../../../icons/AppIcon'
import { useGameStore } from '../../../store/gameStore'
import { artFileName } from '../../../systems/artwork'
import {
  bookRevenue,
  openProjects,
  pagesOf,
  projectScore,
  projectsOf,
  qualityTier,
  sellableProjects,
} from '../../../systems/projects'
import type { Site } from '../../../data/sites'
import type { GameState, Project } from '../../../types/game'
import { ActivityConfirm } from '../ActivityConfirm'
import './ComiconSite.css'

/**
 * 코미콘 — 작품집을 회지로 묶어 부스에서 파는 곳.
 *
 * ## ⚠️ 여기서 파는 것은 그림이 아니라 **권**이다
 * 트위터는 그림 한 장을 고르지만 여기는 작품집(`Project`)을 고른다. 그래서 목록의 단위가
 * `sellableProjects`이고 **장수가 곧 매출**이다(`WON_PER_PAGE × 장수 × 완성도 배율`).
 *
 * ## ⚠️ 값을 여기서 다시 계산하지 않는다
 * 카드에 적는 예상 매출은 `bookRevenue` 하나에서 나오고 **실제 지급도 같은 함수**다
 * (`previewActivity`와 같은 규칙 — 두 곳에서 계산하면 미리보기가 거짓말을 한다).
 * 완성도 문구도 `qualityTier(projectScore(...))`가 정한다.
 *
 * ## ⚠️ 판매는 1턴을 쓴다 → 확인창을 반드시 지난다
 * 부스에 앉아 있는 일이라 `comicon` 활동이 비용을 갖는다. 그래서 카드를 누르면 곧바로
 * `ActivityConfirm`이 뜨고, **`onCommit`으로 `sellAtComicon`을 부른다** — 기본
 * `doActivity`로는 턴만 가고 매출도 `usedFor`도 안 붙는다.
 *
 * ⚠️ **못 파는 권을 감추지 않는다** — 흐리게 두고 "몇 장이 모자란지"를 글자로 적는다
 * (알바몬·그몽의 잠금 사유와 같은 규칙).
 */
export function ComiconSite({ site }: { site: Site }) {
  const state = useGameStore((s) => s.state)
  const sellAtComicon = useGameStore((s) => s.sellAtComicon)
  const [pickedId, setPickedId] = useState<string | null>(null)

  const activity = findActivity('comicon')
  if (!state || !activity) return null

  const book = projectsOf(state)
  const soldCount = book.projects.filter((p) => p.usedFor === 'comicon').length
  const open = openProjects(state)
  const sellable = sellableProjects(state)
  /** 아직 책이 안 되는 권. **감추지 않는다** — 몇 장 더 그리면 되는지가 동기다. */
  const shortOfPages = open.filter((p) => p.pageIds.length < MIN_BOOK_PAGES)
  const picked = sellable.find((p) => p.id === pickedId)

  return (
    <div className="cmc">
      <header className="cmc-head">
        <div className="cmc-head-in">
          <h1 className="cmc-logo">
            <AppIcon name={site.icon} size={26} />
            코미콘
          </h1>
          <p className="cmc-lede">
            직접 묶은 회지를 부스에서 파는 창작 행사. 장수가 많고 잘 그린 회지일수록 많이
            나갑니다.
          </p>
        </div>
      </header>

      {/* 내 부스 현황. 지금까지의 성적이 목록보다 먼저 읽혀야 "또 낼 이유"가 생긴다. */}
      <section className="cmc-booth" aria-label="내 부스 현황">
        <div className="cmc-stat">
          <span className="cmc-stat-label">지금까지 낸 회지</span>
          <span className="cmc-stat-value">{soldCount}권</span>
        </div>
        <div className="cmc-stat">
          <span className="cmc-stat-label">누적 매출</span>
          <span className="cmc-stat-value">{book.soldEarned.toLocaleString('ko-KR')}원</span>
        </div>
        <div className="cmc-stat">
          <span className="cmc-stat-label">낼 수 있는 회지</span>
          <span className="cmc-stat-value">{sellable.length}권</span>
        </div>
      </section>

      <section className="cmc-sec" aria-label="낼 수 있는 회지">
        <h2 className="cmc-sec-head">
          낼 수 있는 회지
          <span className="cmc-sec-count">{sellable.length}권</span>
        </h2>

        {open.length === 0 ? (
          /* ux `empty-states`: 빈 줄만 남기지 않고 무엇을 하면 되는지 알린다. */
          <p className="cmc-empty">
            아직 작품집이 없습니다. 클립스튜디오에서 작품집을 만들어 그림을 채워 보세요.
          </p>
        ) : (
          <>
            {sellable.length === 0 ? (
              <p className="cmc-empty">
                {MIN_BOOK_PAGES}장을 넘긴 작품집이 아직 없습니다. 클립스튜디오에서 몇 장 더
                그리면 회지가 됩니다.
              </p>
            ) : (
              <ul className="cmc-list">
                {sellable.map((p) => (
                  <li key={p.id}>
                    <BookCard state={state} project={p} onPick={() => setPickedId(p.id)} />
                  </li>
                ))}
              </ul>
            )}

            {/* ⚠️ 못 파는 권도 같은 판에 둔다 — 다른 화면으로 보내면 왜 안 보이는지 모른다. */}
            {shortOfPages.length > 0 && (
              <>
                <h2 className="cmc-sec-head cmc-sec-head-sub">
                  아직 회지가 안 되는 작품집
                  <span className="cmc-sec-count">{shortOfPages.length}권</span>
                </h2>
                <ul className="cmc-list">
                  {shortOfPages.map((p) => (
                    <li key={p.id}>
                      <BookCard state={state} project={p} />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </section>

      {/*
        판매는 1턴을 쓴다 — 그래서 목록에서 바로 팔리지 않고 반드시 이 창을 지난다.
        ⚠️ `onCommit` 없이 두면 기본 `doActivity`가 돌아 턴만 가고 매출이 안 들어온다.
      */}
      {picked && (
        <ActivityConfirm
          activity={activity}
          kicker="코미콘"
          title={`「${picked.name}」을 회지로 내시겠습니까?`}
          actionLabel="부스 열기"
          notes={[
            {
              label: '예상 매출',
              value: `${bookRevenue(state, picked).toLocaleString('ko-KR')}원`,
            },
            { label: '장수', value: `${picked.pageIds.length}장` },
          ]}
          onCommit={() => sellAtComicon(picked.id)}
          onClose={() => setPickedId(null)}
        />
      )}

      <footer className="cmc-foot">
        <p>
          한 권은 한 번만 씁니다. 회지로 낸 작품집은 공모전에 다시 낼 수 없습니다.
        </p>
        <p>{site.url}</p>
      </footer>
    </div>
  )
}

/**
 * 회지 카드. 팔 수 있으면 **버튼**(누르면 확인창), 아니면 비활성 판 + 사유다.
 * ⚠️ 매출도 등급도 여기서 만들지 않는다 — `bookRevenue`·`qualityTier`가 단일 출처다.
 */
function BookCard({
  state,
  project,
  onPick,
}: {
  state: GameState
  project: Project
  onPick?: () => void
}) {
  const pages = project.pageIds.length
  const tier = qualityTier(projectScore(state, project))
  const revenue = bookRevenue(state, project)
  const sellable = pages >= MIN_BOOK_PAGES

  const body = (
    <>
      <span className="cmc-mark" aria-hidden="true">
        <AppIcon name="mdi:book-open-page-variant" size={22} />
      </span>

      <span className="cmc-body">
        <span className="cmc-name">{project.name}</span>
        {/* 등급을 색이 아니라 문장으로 적는다(ux `color-not-only`). */}
        <span className="cmc-terms">
          <b>{pages}장</b> · {tier.label} (배율 {tier.multiplier.toFixed(1)}배)
        </span>
        {/* "장수가 많을수록 더 번다"를 계산식 그대로 적는다 — 미리보기가 곧 지급액이다. */}
        <span className="cmc-formula">
          {pages}장 × {WON_PER_PAGE.toLocaleString('ko-KR')}원 × {tier.multiplier.toFixed(1)}배
        </span>
        <span className="cmc-pages">
          {pagesOf(state, project).map((w) => (
            <span key={w.id} className="cmc-page">
              {artFileName(w)}
            </span>
          ))}
        </span>
        {!sellable && (
          <span className="cmc-lock">
            <AppIcon name="mdi:lock-outline" size={13} />
            {MIN_BOOK_PAGES}장 이상이어야 회지가 됩니다 — 현재 {pages}장
          </span>
        )}
      </span>

      <span className="cmc-money">
        <span className="cmc-money-label">{sellable ? '예상 매출' : '지금 내면'}</span>
        <span className="cmc-money-value">{revenue.toLocaleString('ko-KR')}원</span>
        {sellable && <span className="cmc-cta">부스 열기</span>}
      </span>
    </>
  )

  if (!sellable) {
    /* ux `disabled-states`: 감추지 않고 흐리게 두되 **버튼이 아니다**(눌러도 갈 데가 없다). */
    return <div className="cmc-card cmc-card-locked">{body}</div>
  }

  return (
    <button type="button" className="cmc-card" onClick={onPick}>
      {body}
    </button>
  )
}
