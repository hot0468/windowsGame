import { useState } from 'react'
import { CERTS } from '../../../data/certs'
import { findActivity, activitiesUnlockedBy } from '../../../data/activities'
import { careersRequiring } from '../../../data/careers'
import { formatGameDate } from '../../../data/calendar'
import { AppIcon } from '../../../icons/AppIcon'
import { useGameStore } from '../../../store/gameStore'
import {
  blockReason,
  examsOf,
  findCert,
  hasCert,
  pendingExam,
} from '../../../systems/certification'
import { shortfalls } from '../../../systems/employment'
import { STAT_NAMES } from '../../../types/game'
import type { Cert } from '../../../data/certs'
import type { Site } from '../../../data/sites'
import type { GameState, Stats } from '../../../types/game'
import { ActivityCommit } from './ActivityCommit'
import './CertSite.css'

/**
 * O넷 — **자격증 시험**. 벼룩장터(정규직) 옆에 서서 그쪽의 지원 자격을 만들어 준다.
 *
 * **둘러보기는 무료다.** 종목을 넘기고 요건을 확인하는 동안 게임 상태는 **읽기만** 한다 —
 * 턴을 쓰는 자리는 화면 아래 확정 패널(`ActivityCommit`) 하나뿐이고, 응시료는 그 패널이
 * 아니라 고른 종목(`Cert.fee`)이 갖는다.
 *
 * ⚠️ **합격은 응시 즉시가 아니라 발표일에 확정된다**(설계자 지시). 그래서 이 화면에는
 * "지금 접수해 둔 것"과 "발표가 난 것"을 함께 적는 응시 현황 표가 있다 — 며칠 뒤의 일을
 * 기억해 주는 자리가 없으면 플레이어는 자기가 뭘 걸어 뒀는지 잊는다.
 *
 * ## 시각 언어 (ui-ux-pro-max 근거)
 * - style `Accessible & Ethical`(Best For: government, education): 높은 대비 · 또렷한
 *   포커스 링 · 장식 없는 표. 공공 자격 포털의 인상이 곧 이 스타일이다.
 * - style `Data-Dense Dashboard`: 응시 현황은 낮은 패딩의 표 한 장이다(칸 높이 36px 계열).
 * - color `Flashcard & Study Tool`(primary #7C3AED · bg #FAF5FF · border #EFE7FC ·
 *   accent #059669 "correct green"): **공부하고 시험 보는 제품의 팔레트**다. 보라를 고른
 *   이유는 의미보다 **구분**이다 — 벼룩장터 #2563EB · 알바몬 #0369A1 · 은행 navy로 파란
 *   사이트가 이미 셋이라, 자격증까지 파랑이면 지원하러 온 건지 응시하러 온 건지 알 수 없다.
 *   ⚠️ DB 값 중 글자로 쓰는 것은 대비를 재서 낮췄다(#7C3AED 5.7:1 → #6D28D9 7.1:1,
 *   #059669 3.8:1 → #047857 5.5:1). AA 미달인 값을 그대로 쓰지 않는다.
 * - ux `error-clarity` / `color-not-only`: 미달은 무엇이 얼마나 모자란지 **글자로** 적는다.
 * - ux `empty-states`: 응시 이력이 없으면 빈 표 대신 무엇을 하면 되는지 적는다.
 * - 토큰은 `.cert` 안에 `--qn-*`로 가둔다(다른 사이트와 같은 규칙).
 */
export function CertSite({ site }: { site: Site }) {
  const state = useGameStore((s) => s.state)
  const takeExam = useGameStore((s) => s.takeExam)
  const [pickedId, setPickedId] = useState<string | null>(null)
  /** 방금 접수한 종목. 확정 후 목록이 그대로라 무슨 일이 있었는지 글자로 남긴다. */
  const [receipt, setReceipt] = useState<string | null>(null)

  if (!state) return null

  const picked = pickedId ? findCert(pickedId) : undefined
  const examActivity = findActivity(site.activityId ?? '')
  /** 못 보는 이유. 화면은 이 문장을 그대로 쓴다(판정을 두 번 하지 않는다). */
  const blocked = picked ? blockReason(state, picked) : null
  const history = [...examsOf(state)].reverse()

  return (
    <div className="cert">
      {/* 공지 띠. 실제 자격 포털의 그 자리이고, 이 게임에서 가장 중요한 규칙을 적는다. */}
      <p className="qn-strip">
        <AppIcon name="mdi:bullhorn-outline" size={15} />
        합격 여부는 <strong>발표일의 실력</strong>으로 정해집니다. 접수한 뒤에도 늦지 않았습니다.
      </p>

      <header className="qn-head">
        <div className="qn-head-in">
          <h1 className="qn-logo">
            O<span className="qn-logo-mark">넷</span>
          </h1>
          <p className="qn-tagline">자격 종목 안내 · 원서접수 · 합격자 발표</p>
          <span className="qn-today">{formatGameDate(state.day)}</span>
        </div>
      </header>

      <div className="qn-body">
        {/* ── 응시 현황 (레퍼런스의 "시험 일정" 자리) ───────────────── */}
        <section className="qn-sec" aria-label="내 응시 현황">
          <h2 className="qn-sec-head">
            내 원서접수 현황
            <span className="qn-sec-count">{history.length}건</span>
          </h2>

          {history.length === 0 ? (
            /* ux `empty-states`: 빈 표 대신 다음 행동을 적는다. */
            <p className="qn-empty">
              접수한 시험이 없습니다. 아래에서 종목을 고르면 응시료를 내고 접수할 수 있습니다.
              요건이 모자라도 접수는 됩니다 — 발표일까지 채우면 합격입니다.
            </p>
          ) : (
            <table className="qn-table">
              <thead>
                <tr>
                  <th scope="col">종목</th>
                  <th scope="col">응시일</th>
                  <th scope="col">발표일</th>
                  <th scope="col">결과</th>
                </tr>
              </thead>
              <tbody>
                {history.map((e) => {
                  const cert = findCert(e.certId)
                  return (
                    <tr key={`${e.certId}-${e.takenDay}`}>
                      <th scope="row">{cert?.name ?? e.certId}</th>
                      <td>{formatGameDate(e.takenDay)}</td>
                      <td>
                        {formatGameDate(e.resultDay)}
                        {e.passed === undefined && (
                          <span className="qn-dim"> (D-{Math.max(0, e.resultDay - state.day)})</span>
                        )}
                      </td>
                      {/* 색만으로 알리지 않는다(ux `color-not-only`) — 상태를 글자로 적고
                          떨어졌으면 무엇이 모자랐는지까지 적는다(ux `error-clarity`). */}
                      <td>
                        {e.passed === undefined ? (
                          <span className="qn-wait">발표 대기</span>
                        ) : e.passed ? (
                          <span className="qn-pass">
                            <AppIcon name="mdi:check-circle-outline" size={13} />
                            합격
                          </span>
                        ) : (
                          <span className="qn-fail">
                            <AppIcon name="mdi:alert-circle-outline" size={13} />
                            불합격 — {e.reason}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {receipt && (
            <p className="qn-receipt" role="status">
              {receipt}
            </p>
          )}
        </section>

        {/* ── 종목 목록 ───────────────────────────────────────────── */}
        <section className="qn-sec">
          <h2 className="qn-sec-head">
            자격 종목
            <span className="qn-sec-count">{CERTS.length}종목</span>
          </h2>
          <ul className="qn-grid" role="radiogroup" aria-label="응시할 종목 고르기">
            {CERTS.map((c) => (
              <li key={c.id}>
                <CertCard
                  cert={c}
                  state={state}
                  on={c.id === pickedId}
                  onPick={() => setPickedId(c.id === pickedId ? null : c.id)}
                />
              </li>
            ))}
          </ul>
        </section>

        {picked && examActivity && (
          <section className="qn-sec">
            <div className="qn-receipt-box">
              <div className="qn-receipt-row">
                <span className="qn-receipt-label">원서접수</span>
                <strong>{picked.name}</strong>
              </div>
              <div className="qn-receipt-row">
                <span className="qn-receipt-label">응시료</span>
                <strong className="qn-fee">{picked.fee.toLocaleString('ko-KR')}원</strong>
              </div>
              <div className="qn-receipt-row">
                <span className="qn-receipt-label">합격자 발표</span>
                <span>
                  {formatGameDate(state.day + picked.resultDays)} (응시일 +{picked.resultDays}일)
                </span>
              </div>
              {/* ⚠️ 응시료는 활동의 비용이 아니므로 ActivityCommit의 미리보기에 안 잡힌다.
                  여기서 따로 알린다 — 누르기 전에 비용을 다 알 수 있어야 한다. */}
              {blocked && <p className="qn-blocked">{blocked}</p>}
            </div>

            <ActivityCommit
              activity={examActivity}
              actionLabel={`${picked.fee.toLocaleString('ko-KR')}원 결제하고 접수하기`}
              selection={blocked ? undefined : picked.name}
              selectionHint={blocked ?? '응시할 종목을 고르세요.'}
              onCommit={() => takeExam(picked)}
              onCommitted={() => {
                setReceipt(
                  `${picked.name} 원서를 접수했습니다. 합격자 발표는 ${picked.resultDays}일 뒤이며 결과는 메일로 옵니다.`,
                )
                setPickedId(null)
              }}
            />
          </section>
        )}
      </div>

      <footer className="qn-foot">
        <p className="qn-foot-logo">O넷</p>
        <p>국가자격 · 민간자격 · 원서접수 · 합격자 발표 · 자격증 발급</p>
        <p>응시료는 접수 즉시 결제되며 불합격 시 환불되지 않습니다.</p>
        <p>{site.url}</p>
      </footer>
    </div>
  )
}

/**
 * 종목 카드 하나.
 *
 * ⚠️ **요건 미달이어도 접수할 수 있다**(정규직 지원과 같은 규칙). 발표일까지 채우면
 * 붙기 때문이다. 대신 **무엇이 모자란지는 감추지 않고 글자로 적는다**(ux `error-clarity`).
 * 판정은 `shortfalls` 하나가 하고 화면은 사유만 파생한다.
 *
 * ⚠️ **이 종목이 무엇을 여는지는 뒤집어 찾는다**(`careersRequiring`·`activitiesUnlockedBy`) —
 * 관계를 여기 다시 적으면 공고나 활동을 고쳤을 때 이 카드만 조용히 거짓말을 한다.
 */
function CertCard({
  cert,
  state,
  on,
  onPick,
}: {
  cert: Cert
  state: GameState
  on: boolean
  onPick: () => void
}) {
  const owned = hasCert(state, cert)
  const waiting = pendingExam(state, cert.id)
  const missing = shortfalls(state, cert.requires)
  const needText = Object.entries(cert.requires)
    .map(([key, min]) => `${STAT_NAMES[key as keyof Stats]} ${min}`)
    .join(' · ')
  const opens = [
    ...careersRequiring(cert.itemId).map((c) => `${c.company} 지원 자격`),
    ...activitiesUnlockedBy(cert.itemId).map((a) => `${a.label} 해금`),
  ]

  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      className={`qn-card${on ? ' qn-card-on' : ''}${owned ? ' qn-card-done' : ''}`}
      title={cert.summary}
      onClick={onPick}
    >
      <span className="qn-card-top">
        <span className="qn-card-icon">
          <AppIcon name={cert.icon} size={26} />
        </span>
        <span className="qn-card-heads">
          <span className="qn-field">{cert.field}</span>
          <span className="qn-name">{cert.name}</span>
        </span>
        {/* 상태는 색이 아니라 글자가 전한다(ux `color-not-only`). */}
        {owned ? (
          <span className="qn-state qn-state-done">취득</span>
        ) : waiting ? (
          <span className="qn-state qn-state-wait">접수 중</span>
        ) : (
          <span className="qn-state">접수 가능</span>
        )}
      </span>

      <span className="qn-summary">{cert.summary}</span>

      <span className="qn-facts">
        <span className="qn-fact">
          <span className="qn-fact-label">응시료</span>
          <span className="qn-fact-value qn-fee">{cert.fee.toLocaleString('ko-KR')}원</span>
        </span>
        <span className="qn-fact">
          <span className="qn-fact-label">발표</span>
          <span className="qn-fact-value">{cert.resultDays}일 뒤</span>
        </span>
      </span>

      <span className="qn-need">
        <b>합격 기준</b> {needText}
      </span>
      {missing.length === 0 ? (
        <span className="qn-ok">
          <AppIcon name="mdi:check-circle-outline" size={13} />
          지금 기준을 모두 채웠습니다
        </span>
      ) : (
        missing.map((m) => (
          <span key={m} className="qn-short">
            <AppIcon name="mdi:alert-circle-outline" size={13} />
            {m}
          </span>
        ))
      )}

      <span className="qn-opens">
        {opens.map((o) => (
          <span key={o} className="qn-open">
            {o}
          </span>
        ))}
      </span>
      {waiting && (
        <span className="qn-waiting-note">{formatGameDate(waiting.resultDay)} 발표 예정</span>
      )}
      {on && <span className="qn-picked">선택함</span>}
    </button>
  )
}
