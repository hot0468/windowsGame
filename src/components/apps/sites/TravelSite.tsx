import { useState } from 'react'
import { findActivity } from '../../../data/activities'
import { HERO_TRIP, TRIPS, TRIP_REGIONS, findTrip, tripsOf } from '../../../data/trips'
import { AppIcon } from '../../../icons/AppIcon'
import { useGameStore } from '../../../store/gameStore'
import { canRun } from '../../../systems/turn'
import type { Site } from '../../../data/sites'
import type { Trip, TripRegion } from '../../../data/trips'
import type { GameState } from '../../../types/game'
import { previewActivity } from '../activityPreview'
import { ActivityConfirm } from '../ActivityConfirm'
import './TravelSite.css'

const won = (v: number) => `${Math.abs(v).toLocaleString('ko-KR')}원`

/** 이 상품의 값. ⚠️ **활동에서 파생한다** — 상품에 가격을 적으면 두 번째 출처가 된다. */
function priceOf(state: GameState, trip: Trip): number {
  const activity = findActivity(trip.activityId)
  if (!activity) return 0
  return Math.abs(previewActivity(state, activity).rows.find((r) => r.key === 'money')?.value ?? 0)
}

/** 지금 갈 수 있는가. 판정은 `canRun` 하나가 한다(화면이 두 번째 판정을 만들지 않는다). */
function affordable(state: GameState, trip: Trip): boolean {
  const activity = findActivity(trip.activityId)
  return activity ? canRun(state, activity) : false
}

/**
 * 먼바다투어 — 여행 예약. **레퍼런스(실제 여행사 홈)가 스펙이다.**
 *
 * ## 판형
 * 헤더(로고 + 지역 네비) → **연보라 히어로**(왼쪽 "어떤 여행을 꿈꾸시나요?" 지역 고르기 +
 * 오른쪽 큰 상품 판) → **지금 갈 수 있는 곳** / **모아야 갈 수 있는 곳** 카드 줄 →
 * **국내 구석구석** 원형 카드 → 고객센터 번호가 큰 푸터.
 *
 * ## 레퍼런스에서 **덜어낸 것**과 그 이유
 * ⚠️ **동작하지 않는 컨트롤은 그리지 않는다**(이 프로젝트의 규칙).
 * - **예약 검색 폼**(목적지·날짜·인원): 이 게임에 날짜 선택도 인원도 없다. 그 자리에는
 *   레퍼런스의 형태만 빌리고 **실제로 목록을 거르는 지역 고르기**를 앉혔다
 *   (알바몬 네비 줄과 같은 방식).
 * - **쿠폰 배너·카드사 혜택·유튜브 콘텐츠**: 이 게임에 쿠폰도 카드도 영상도 없다.
 * - **"가격이 내려갔어요"**: 값은 활동이 정하므로 내려간 적이 없다. 대신 그 자리에
 *   **지금 소지금으로 갈 수 있는가**라는 진짜 사실을 놓았다(알바몬 히어로와 같은 방식).
 *
 * ⚠️ **고르는 것은 어디로 가는가뿐이고 값은 활동이 갖는다**(`data/trips.ts`).
 */
export function TravelSite({ site }: { site: Site }) {
  const state = useGameStore((s) => s.state)
  const [region, setRegion] = useState<TripRegion | null>(null)
  const [pickedId, setPickedId] = useState<string | null>(null)
  /** 방금 예약한 상품. 목록이 그대로라 결과를 글자로 남긴다. */
  const [booked, setBooked] = useState<string | null>(null)

  if (!state) return null
  const picked = pickedId ? findTrip(pickedId) : undefined
  const pickedActivity = picked ? findActivity(picked.activityId) : undefined
  /* 지금 갈 수 있는 곳 / 모아야 갈 수 있는 곳. **판정은 `canRun` 하나**가 한다. */
  const ready = TRIPS.filter((t) => affordable(state, t))
  const later = TRIPS.filter((t) => !affordable(state, t))

  return (
    <div className="tv">
      <header className="tv-top">
        <h1 className="tv-logo">
          <AppIcon name={site.icon} size={22} />
          먼바다투어
        </h1>
        <nav className="tv-nav" aria-label="지역">
          <button
            type="button"
            className={`tv-nav-item${region === null ? ' tv-nav-on' : ''}`}
            aria-current={region === null ? 'true' : undefined}
            onClick={() => setRegion(null)}
          >
            홈
          </button>
          {TRIP_REGIONS.map((r) => (
            <button
              key={r}
              type="button"
              className={`tv-nav-item${region === r ? ' tv-nav-on' : ''}`}
              aria-current={region === r ? 'true' : undefined}
              onClick={() => setRegion(r)}
            >
              {r}
            </button>
          ))}
        </nav>
        <span className="tv-money">
          소지금 <strong>{won(state.stats.money)}</strong>
        </span>
      </header>

      {booked && (
        <p className="tv-receipt" role="status">
          「{booked}」 예약이 확정됐습니다. 잘 다녀오셨습니다.
        </p>
      )}

      {region === null ? (
        <>
          {/* ── 히어로: 지역 고르기 + 대표 상품 ─────────────── */}
          <section className="tv-hero" aria-label="추천">
            <div className="tv-ask">
              <p className="tv-ask-head">
                {state.playerName}님,
                <br />
                어떤 여행을 꿈꾸시나요?
              </p>
              {/* 레퍼런스의 검색 폼 자리 — 형태만 빌리고 **진짜 필터**를 앉혔다. */}
              <div className="tv-ask-chips">
                {TRIP_REGIONS.map((r) => (
                  <button key={r} type="button" className="tv-chip" onClick={() => setRegion(r)}>
                    {r}
                    <span className="tv-chip-n">{tripsOf(r).length}</span>
                  </button>
                ))}
              </div>
              <p className="tv-ask-note">
                전 상품 왕복 교통 포함 · 출발일 변경 1회 무료 · 잔여석 실시간
              </p>
            </div>

            <button
              type="button"
              className="tv-feature"
              style={{ background: HERO_TRIP.cover }}
              onClick={() => setPickedId(HERO_TRIP.id)}
            >
              <span className="tv-feature-tag">이 달의 상품</span>
              <span className="tv-feature-title">{HERO_TRIP.title}</span>
              <span className="tv-feature-meta">
                {HERO_TRIP.destination} · {HERO_TRIP.schedule}
              </span>
              <span className="tv-feature-price">{won(priceOf(state, HERO_TRIP))}~</span>
            </button>
          </section>

          {/*
            레퍼런스의 "가격이 내려갔어요" 자리. ⚠️ **값이 내려간 적은 없으므로**
            그 자리에 진짜 사실을 놓는다: 지금 소지금으로 갈 수 있는가.
          */}
          {ready.length > 0 && (
            <TripSection
              title="지금 갈 수 있는 곳"
              desc={`소지금 ${won(state.stats.money)} 기준`}
              trips={ready}
              state={state}
              onPick={setPickedId}
            />
          )}
          {later.length > 0 && (
            <TripSection
              title="모아야 갈 수 있는 곳"
              desc="조금 더 벌면 열립니다"
              trips={later}
              state={state}
              onPick={setPickedId}
            />
          )}

          {/* 레퍼런스의 "내나라 구석구석" 원형 줄. */}
          <section className="tv-sec" aria-labelledby="tv-home-trips">
            <h2 className="tv-sec-head" id="tv-home-trips">
              국내 구석구석
            </h2>
            <ul className="tv-circles">
              {tripsOf('국내').map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className="tv-circle"
                    onClick={() => setPickedId(t.id)}
                    title={t.blurb}
                  >
                    <span className="tv-circle-photo" style={{ background: t.cover }} />
                    <span className="tv-circle-title">{t.title}</span>
                    <span className="tv-circle-meta">{t.destination}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <TripSection
          title={region}
          desc={`${tripsOf(region).length}건 · 전체 ${TRIPS.length}건`}
          trips={tripsOf(region)}
          state={state}
          onPick={setPickedId}
        />
      )}

      <footer className="tv-foot">
        <p className="tv-foot-tel">1577-0088</p>
        <p>먼바다투어 고객센터 · 평일 09:00~18:00</p>
        <p>항공 스케줄과 잔여석은 현지 사정으로 변경될 수 있습니다.</p>
        <p>{site.url}</p>
      </footer>

      {/* 상품을 누르면 곧바로 확인창이 뜬다(사이트 공통 규칙). */}
      {picked && pickedActivity && (
        <ActivityConfirm
          activity={pickedActivity}
          kicker="먼바다투어 예약"
          title={`「${picked.title}」을(를) 예약하시겠습니까?`}
          actionLabel="예약하기"
          notes={[
            { label: '목적지', value: picked.destination },
            { label: '일정', value: picked.schedule },
            { label: '포함', value: picked.includes.join(' · ') },
          ]}
          onCommitted={() => setBooked(picked.title)}
          onClose={() => setPickedId(null)}
        />
      )}
    </div>
  )
}

/** 상품 줄 하나. 레퍼런스의 카드 4장 줄과 같은 자리다. */
function TripSection({
  title,
  desc,
  trips,
  state,
  onPick,
}: {
  title: string
  desc: string
  trips: Trip[]
  state: GameState
  onPick: (id: string) => void
}) {
  const headId = `tv-sec-${title}`
  return (
    <section className="tv-sec" aria-labelledby={headId}>
      <h2 className="tv-sec-head" id={headId}>
        {title}
        <span className="tv-sec-desc">{desc}</span>
      </h2>
      <ul className="tv-grid">
        {trips.map((t) => (
          <li key={t.id}>
            <TripCard trip={t} state={state} onPick={() => onPick(t.id)} />
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * 여행 상품 카드. 레퍼런스처럼 **세로 카드**다(사진 → 지역 태그 → 제목 → 값).
 * ⚠️ 사진 자리는 그라데이션 + 목적지 글자다(오프라인 규칙 — 외부 이미지 금지).
 */
function TripCard({ trip, state, onPick }: { trip: Trip; state: GameState; onPick: () => void }) {
  const ok = affordable(state, trip)
  return (
    <button type="button" className="tv-card" onClick={onPick} title={trip.blurb}>
      <span className="tv-photo" style={{ background: trip.cover }}>
        <span className="tv-photo-place">{trip.destination}</span>
      </span>
      <span className="tv-body">
        <span className="tv-region">{trip.region}</span>
        <span className="tv-title">{trip.title}</span>
        <span className="tv-schedule">{trip.schedule}</span>
        <span className="tv-includes">
          {trip.includes.slice(0, 2).map((x) => (
            <span key={x} className="tv-include">
              {x}
            </span>
          ))}
        </span>
        <span className="tv-price">
          {won(priceOf(state, trip))}
          {/* ux `color-not-only`: 색이 아니라 글자가 갈 수 있는지 말한다. */}
          {!ok && <span className="tv-short">지금은 예약할 수 없습니다</span>}
        </span>
      </span>
    </button>
  )
}
