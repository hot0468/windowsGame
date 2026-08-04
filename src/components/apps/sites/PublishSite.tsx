import { useState } from 'react'
import { findActivity } from '../../../data/activities'
import { WRITING_PROMPTS } from '../../../data/media'
import type { Site } from '../../../data/sites'
import { ActivityCommit } from './ActivityCommit'
import './PublishSite.css'

/**
 * 아점 — 창작자 발행 플랫폼. 확정 버튼이 `writing`(글쓰기) 활동을 실행한다.
 *
 * 다른 두 사이트가 **남이 만든 것을 고르는** 곳이라면 여기는 **플레이어 자신의 자리**다.
 * 그래서 목록의 이름도 상품이 아니라 "글감"이고, 버튼도 소비가 아니라 [발행하기]다.
 *
 * ⚠️ **본문 입력창은 없다.** 실제로 글을 받으면 그 글이 게임 어디에도 쓰이지 않아
 * 순수한 장식이 되고(포털 검색창과 같은 문제), 무엇보다 "확정 행동만 턴을 쓴다"는
 * 규칙 위에서 입력은 아무 값도 만들지 않는다. 고르는 것은 **무엇에 대해 쓸지**까지다.
 *
 * 시각 언어: style `Editorial Grid / Magazine`(고대비 활자·구역 구분선·여백) +
 * `Bento Grids`(회색 판 위 큰 모서리 카드). 미디북스(흰 종이 + 헤어라인 목록)와
 * 시집이(어두운 판)와는 판의 밝기·모서리·배치로 갈린다 — **새 색을 만들지 않는다.**
 */
export function PublishSite({ site }: { site: Site }) {
  const activity = site.activityId ? findActivity(site.activityId) : undefined
  const [pickedId, setPickedId] = useState<string | null>(null)
  /** 방금 발행한 글의 제목. */
  const [published, setPublished] = useState<string | null>(null)

  if (!activity) return null
  const picked = WRITING_PROMPTS.find((p) => p.id === pickedId)

  return (
    <div className="pub">
      <header className="pub-head">
        <h1 className="pub-logo">아점</h1>
        <p className="pub-sub">아침도 점심도 아닌 시간에 씁니다. 읽히는 것은 그다음 문제입니다.</p>
      </header>

      {published && (
        <p className="pub-receipt" role="status">
          「{published}」 발행 완료. 첫 독자가 들어오기까지는 보통 하루쯤 걸립니다.
        </p>
      )}

      <h2 className="pub-section">오늘의 글감</h2>
      <div className="pub-grid" role="radiogroup" aria-label="글감 고르기">
        {WRITING_PROMPTS.map((prompt) => {
          const on = prompt.id === pickedId
          return (
            <button
              key={prompt.id}
              type="button"
              role="radio"
              aria-checked={on}
              className={`pub-card${on ? ' pub-card-on' : ''}`}
              onClick={() => setPickedId(on ? null : prompt.id)}
            >
              <span className="pub-theme">{prompt.theme}</span>
              <span className="pub-hint">{prompt.hint}</span>
              {/* 고른 상태를 색만으로 알리지 않는다(ux `color-not-only`). */}
              <span className="pub-mark">{on ? '이 글감으로 씁니다' : '고르기'}</span>
            </button>
          )
        })}
      </div>

      <ActivityCommit
        activity={activity}
        actionLabel="발행하기"
        selection={picked ? `「${picked.theme}」` : undefined}
        selectionHint="무엇에 대해 쓸지 고르세요."
        onCommitted={() => {
          setPublished(picked?.theme ?? null)
          setPickedId(null)
        }}
      />
    </div>
  )
}
