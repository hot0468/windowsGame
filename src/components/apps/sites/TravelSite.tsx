import { useState } from 'react'
import { findActivity } from '../../../data/activities'
import { TRIPS, findTrip } from '../../../data/trips'
import { AppIcon } from '../../../icons/AppIcon'
import type { Site } from '../../../data/sites'
import type { Trip } from '../../../data/trips'
import { ActivityConfirm } from '../ActivityConfirm'
import './TravelSite.css'

/**
 * 먼바다투어 — 여행 예약.
 *
 * ⚠️ **노24(공연 예매)와 같은 구조다.** 고르는 것은 **어디로 가는가**뿐이고, 실행되는
 * 활동(`travel`)과 경비는 활동 하나가 갖는다(`data/trips.ts` 주석). 상품마다 값을 달면
 * 밸런스 테스트가 못 보는 두 번째 출처가 생긴다.
 *
 * ⚠️ **이 사이트의 입구는 포털 가로 띠의 배너 하나다**(설계자 지시). 그래서 배너의
 * 그라데이션을 사이트 색으로 그대로 이어받았다 — 누르고 들어온 자리가 같은 곳으로 읽힌다.
 *
 * ⚠️ **여행이 며칠짜리가 아니다.** 상품에 적힌 "3박 5일"은 표시 전용이고 게임에서는 1턴이다
 * (여러 턴짜리 활동은 예약·정산·번아웃에 전부 새 규칙을 요구한다 — `activities.ts` 주석).
 */
export function TravelSite({ site }: { site: Site }) {
  const activity = site.activityId ? findActivity(site.activityId) : undefined
  const [pickedId, setPickedId] = useState<string | null>(null)
  /** 방금 예약한 상품. 목록이 그대로라 결과를 글자로 남긴다. */
  const [booked, setBooked] = useState<string | null>(null)

  if (!activity) return null
  const picked = pickedId ? findTrip(pickedId) : undefined

  return (
    <div className="tv">
      <p className="tv-strip">전 상품 왕복 항공 포함 · 출발일 변경 1회 무료 · 잔여석 실시간</p>

      <header className="tv-head">
        <AppIcon name={site.icon} size={34} />
        <div className="tv-head-text">
          <h1 className="tv-logo">먼바다투어</h1>
          <p className="tv-sub">멀리 갈수록 싸게 — 라고 적혀 있다</p>
        </div>
      </header>

      {booked && (
        <p className="tv-receipt" role="status">
          「{booked}」 예약이 확정됐습니다. 잘 다녀오셨습니다.
        </p>
      )}

      <ul className="tv-list">
        {TRIPS.map((trip) => (
          <li key={trip.id}>
            <TripCard trip={trip} onPick={() => setPickedId(trip.id)} />
          </li>
        ))}
      </ul>

      <footer className="tv-foot">
        <p className="tv-foot-logo">먼바다투어</p>
        <p>항공 스케줄과 잔여석은 현지 사정으로 변경될 수 있습니다.</p>
        <p>{site.url}</p>
      </footer>

      {/* 상품을 누르면 곧바로 확인창이 뜬다(사이트 공통 규칙). */}
      {picked && (
        <ActivityConfirm
          activity={activity}
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

/**
 * 여행 상품 카드. 실제 여행사 카드처럼 **가로로 눕는다**(왼쪽 사진 자리 + 오른쪽 조건).
 * ⚠️ 사진 자리는 그라데이션 + 목적지 글자다(오프라인 규칙 — 외부 이미지 금지).
 */
function TripCard({ trip, onPick }: { trip: Trip; onPick: () => void }) {
  return (
    <button type="button" className="tv-card" onClick={onPick} title={trip.blurb}>
      <span className="tv-photo" style={{ background: trip.cover }}>
        <span className="tv-photo-place">{trip.destination}</span>
      </span>
      <span className="tv-body">
        <span className="tv-title">{trip.title}</span>
        <span className="tv-schedule">{trip.schedule}</span>
        <span className="tv-blurb">{trip.blurb}</span>
        <span className="tv-includes">
          {trip.includes.map((x) => (
            <span key={x} className="tv-include">
              {x}
            </span>
          ))}
        </span>
      </span>
    </button>
  )
}
