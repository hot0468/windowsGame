import { useState } from 'react'
import {
  BANK_NAME,
  DEPOSIT_MIN,
  DEPOSIT_RATE,
  DEPOSIT_TERM_DAYS,
  LOAN_MIN,
  LOAN_RATE,
  SAVINGS_RATE,
} from '../../../data/bank'
import { findCareer } from '../../../data/careers'
import { AppIcon } from '../../../icons/AppIcon'
import { useGameStore } from '../../../store/gameStore'
import {
  LEDGER_LABELS,
  bankOf,
  canBorrow,
  canDeposit,
  canOpenDeposit,
  canRepay,
  canWithdraw,
  daysToMature,
  isInflow,
  loanDanger,
  loanLimit,
  loanRoom,
  lockedTotal,
  maturityValue,
} from '../../../systems/bank'
import { getLivingCost } from '../../../systems/economy'
import type { Site } from '../../../data/sites'
import './BankSite.css'

/**
 * 네이놈은행 — 예금(자유·정기)과 대출.
 *
 * ## 이 사이트가 다른 사이트와 다른 점
 * ⚠️ **활동을 실행하지 않는 유일한 사이트다.** 미디북스·시집이·아점·알바몬·벼룩장터는
 * 전부 확정 패널(`ActivityCommit`)로 **1턴을 쓰는데**, 은행 거래는 **턴을 쓰지 않는다**
 * (쇼핑 주문과 같은 규칙 — "탐색은 무료"). 그래서 `ActivityCommit`도 `activityId`도 없다.
 *
 * 대신 이 사이트가 지는 약속은 **"누르기 전에 대가를 전부 보여 준다"**로 같다:
 *  - 예금에 넣으면 그 돈이 **오늘 밤 생활비로 안 쓰인다**는 사실을 적는다.
 *  - 정기예금은 **만기일과 만기 원리금**을 미리 적는다(이자에 굴림이 없어 거짓이 아니다).
 *  - 대출은 **한도의 근거(고용 상태)**와 **하루에 얼마씩 불어나는지**를 적는다.
 *
 * ## 상태를 바꾸는 통로
 * ⚠️ **이 사이트도 스탯을 직접 계산하지 않는다.** 규칙·판정은 전부 `systems/bank.ts`가
 * 갖고 여기서는 `canXxx`를 묻고 스토어 액션을 부르기만 한다(광고 배너·쇼핑과 같은 규칙).
 * 두 번째 판정을 화면에 적으면 규칙이 갈라진다.
 *
 * ## 시각 언어 (ui-ux-pro-max 근거)
 * - color `Banking/Traditional Finance`: primary #0F172A · secondary #1E3A8A ·
 *   accent #A16207("Trust navy + premium gold") · destructive #DC2626.
 *   ⚠️ 벼룩장터(#2563EB)·알바몬(#0369A1)과 계열을 갈라 뒀다 — 자세한 이유는 CSS 상단.
 * - style `Financial Dashboard`: 잔액 KPI 줄 · 통화 서식 · 손익 색 구분 · 거래 내역 표.
 * - style `Data-Dense Dashboard`: 내역 표는 낮은 패딩의 촘촘한 줄.
 * - ux `number-tabular`·`Number Formatting`: 금액은 `tabular-nums` + 천 단위 구분.
 * - ux `input-labels`: 금액 입력마다 보이는 라벨(placeholder 라벨 금지).
 * - ux `disabled-states`·`error-clarity`: 못 하는 거래는 **비활성 + 사유를 글자로**.
 * - ux `confirmation-dialogs`·`destructive-emphasis`: 대출은 확인을 거치고 구역을 분리한다.
 * - ux `empty-states`: 내역이 없으면 무엇을 하면 되는지 적는다.
 */

/** 금액 서식. 화면 전체가 이 함수 하나만 쓴다(자리마다 다르게 적으면 표가 어긋난다). */
function won(v: number): string {
  return `${Math.round(v).toLocaleString('ko-KR')}원`
}

/** 일 이율을 백분율로. 소수 둘째 자리까지 — 0.4%와 0.9%가 구분돼야 한다. */
function pct(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`
}

/** 입력 문자열 → 금액. 숫자가 아니면 0(버튼이 비활성되고 사유가 뜬다). */
function parseAmount(raw: string): number {
  const n = Number(raw.replace(/[^\d]/g, ''))
  return Number.isFinite(n) ? n : 0
}

/**
 * 금액 입력 한 벌(라벨 + 입력칸 + 빠른 금액 칩).
 *
 * ⚠️ 칩이 있는 이유: 여섯 자리를 손으로 치는 것이 이 화면의 유일한 마찰이다.
 * 칩은 **입력값을 채우기만** 하고 실행하지 않는다 — 누르는 순간 돈이 움직이면
 * 되돌릴 수 없는 조작이 실수 한 번에 일어난다.
 */
function AmountField({
  id,
  label,
  value,
  onChange,
  chips,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  chips: { label: string; amount: number }[]
}) {
  return (
    <div className="bank-field">
      {/* ux input-labels — 보이는 라벨. */}
      <label htmlFor={id}>{label}</label>
      <div className="bank-input-row">
        <input
          id={id}
          className="bank-input"
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="bank-unit">원</span>
      </div>
      <div className="bank-chips">
        {chips.map((c) => (
          <button
            key={c.label}
            type="button"
            className="bank-chip"
            onClick={() => onChange(String(c.amount))}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function BankSite({ site }: { site: Site }) {
  const state = useGameStore((s) => s.state)
  const bankDeposit = useGameStore((s) => s.bankDeposit)
  const bankWithdraw = useGameStore((s) => s.bankWithdraw)
  const bankOpenDeposit = useGameStore((s) => s.bankOpenDeposit)
  const bankBorrow = useGameStore((s) => s.bankBorrow)
  const bankRepay = useGameStore((s) => s.bankRepay)

  const [savingsInput, setSavingsInput] = useState('100000')
  const [termInput, setTermInput] = useState(String(DEPOSIT_MIN))
  const [loanInput, setLoanInput] = useState(String(LOAN_MIN))
  /** 대출 확인 단계. ux `confirmation-dialogs` — 되돌릴 수 없는 조작은 두 번 묻는다. */
  const [confirmLoan, setConfirmLoan] = useState(false)

  if (!state) return null

  const bank = bankOf(state)
  const money = state.stats.money
  const living = getLivingCost(state)
  const locked = lockedTotal(state)
  const limit = loanLimit(state)
  const room = loanRoom(state)
  const career = state.employment ? findCareer(state.employment.careerId) : undefined

  const savingsAmount = parseAmount(savingsInput)
  const termAmount = parseAmount(termInput)
  const loanAmount = parseAmount(loanInput)

  const termPreview = termAmount >= DEPOSIT_MIN
    ? maturityValue({
        id: 'preview',
        principal: termAmount,
        openedDay: state.day,
        matureDay: state.day + DEPOSIT_TERM_DAYS,
        rate: DEPOSIT_RATE,
      })
    : 0

  /** 이 금액을 빌리면 하루에 얼마씩 불어나는가. 대출의 진짜 가격이다. */
  const loanDailyCost = Math.round((bank.debt + loanAmount) * LOAN_RATE)

  return (
    <div className="bank">
      <p className="bank-strip">
        {BANK_NAME} · 거래는 시간을 쓰지 않습니다 · 이자는 매일 밤 정산됩니다
      </p>

      <header className="bank-head">
        <h1 className="bank-logo">
          <AppIcon name={site.icon} size={28} />
          {BANK_NAME}
        </h1>
        <p className="bank-tagline">
          맡기면 하루 {pct(SAVINGS_RATE)}, 묶으면 하루 {pct(DEPOSIT_RATE)}, 빌리면 하루{' '}
          {pct(LOAN_RATE)}
        </p>
      </header>

      {/* ── 잔액 요약 (style Financial Dashboard의 KPI 줄) ── */}
      <section className="bank-sec" aria-label="잔액 요약">
        <div className="bank-kpis">
          <div className="bank-kpi">
            <span className="bank-kpi-label">소지금</span>
            <strong className="bank-kpi-value">{won(money)}</strong>
            <span className="bank-kpi-note">오늘 생활비 {won(living)}</span>
          </div>
          <div className="bank-kpi">
            <span className="bank-kpi-label">자유예금</span>
            <strong className="bank-kpi-value">{won(bank.savings)}</strong>
            <span className="bank-kpi-note">언제든 출금 가능</span>
          </div>
          <div className="bank-kpi bank-kpi-gold">
            <span className="bank-kpi-label">정기예금</span>
            <strong className="bank-kpi-value">{won(locked)}</strong>
            <span className="bank-kpi-note">
              {bank.deposits.length ? `${bank.deposits.length}건 · 만기까지 출금 불가` : '가입 없음'}
            </span>
          </div>
          <div className="bank-kpi bank-kpi-debt">
            <span className="bank-kpi-label">대출 잔액</span>
            <strong className="bank-kpi-value">{bank.debt ? `-${won(bank.debt)}` : won(0)}</strong>
            <span className="bank-kpi-note">한도 {won(limit)}</span>
          </div>
        </div>

        {/*
          ⚠️ 예금은 **소지금이 아니다**. 이 한 줄이 없으면 "통장에 300만 원이 있는데
          파산했습니다"가 뜰 때 플레이어가 버그로 읽는다.
        */}
        <p className="bank-why">
          예금은 소지금과 별개입니다. 생활비는 <strong>소지금에서만</strong> 빠져나가므로,
          맡긴 돈이 아무리 많아도 소지금이 0이 되면 파산합니다.
        </p>
      </section>

      {/* ── 예금 ─────────────────────────────────────── */}
      <section className="bank-sec" aria-label="예금">
        <h2 className="bank-sec-head">
          예금
          <span className="bank-sec-note">맡긴 돈에는 매일 밤 이자가 붙습니다</span>
        </h2>

        <div className="bank-cards">
          {/* 자유예금 */}
          <div className="bank-card">
            <h3 className="bank-card-title">
              자유예금
              <span className="bank-rate">일 {pct(SAVINGS_RATE)}</span>
            </h3>
            <p className="bank-card-desc">
              언제든 넣고 뺄 수 있습니다. 이율은 낮지만 급할 때 되찾을 수 있어, 남는 돈을
              그냥 두는 것보다 낫습니다.
            </p>
            <AmountField
              id="bank-savings-amount"
              label="금액"
              value={savingsInput}
              onChange={setSavingsInput}
              chips={[
                { label: '10만', amount: 100_000 },
                { label: '50만', amount: 500_000 },
                { label: '전액', amount: money },
              ]}
            />
            <div className="bank-actions">
              <button
                type="button"
                className="bank-btn"
                disabled={!canDeposit(state, savingsAmount)}
                onClick={() => bankDeposit(savingsAmount)}
              >
                입금
              </button>
              <button
                type="button"
                className="bank-btn bank-btn-ghost"
                disabled={!canWithdraw(state, savingsAmount)}
                onClick={() => bankWithdraw(savingsAmount)}
              >
                출금
              </button>
            </div>
            {/* ux error-clarity — 왜 못 하는지 글자로 적는다(감추지 않는다). */}
            {!canDeposit(state, savingsAmount) && (
              <p className="bank-why">
                입금 불가 —{' '}
                {savingsAmount <= 0 ? '금액을 입력해 주세요.' : `소지금이 부족합니다(현재 ${won(money)}).`}
              </p>
            )}
          </div>

          {/* 정기예금 */}
          <div className="bank-card">
            <h3 className="bank-card-title">
              정기예금
              <span className="bank-rate">일 {pct(DEPOSIT_RATE)}</span>
            </h3>
            <p className="bank-card-desc">
              {DEPOSIT_TERM_DAYS}일 동안 <strong>찾을 수 없습니다</strong>. 대신 자유예금보다
              이율이 높고, 만기가 되는 날 밤에 원리금이 소지금으로 돌아옵니다. 최소{' '}
              {won(DEPOSIT_MIN)}부터.
            </p>
            <AmountField
              id="bank-term-amount"
              label="가입 금액"
              value={termInput}
              onChange={setTermInput}
              chips={[
                { label: '10만', amount: 100_000 },
                { label: '50만', amount: 500_000 },
                { label: '100만', amount: 1_000_000 },
              ]}
            />
            {/* 굴림이 없으므로 "며칠 뒤 얼마"를 거짓 없이 미리 적을 수 있다. */}
            {termPreview > 0 && (
              <p className="bank-why">
                {state.day + DEPOSIT_TERM_DAYS}일차 만기 · 받을 원리금{' '}
                <strong>{won(termPreview)}</strong> (이자 {won(termPreview - termAmount)})
              </p>
            )}
            <div className="bank-actions">
              <button
                type="button"
                className="bank-btn"
                disabled={!canOpenDeposit(state, termAmount)}
                onClick={() => bankOpenDeposit(termAmount)}
              >
                가입하기
              </button>
            </div>
            {!canOpenDeposit(state, termAmount) && (
              <p className="bank-why">
                가입 불가 —{' '}
                {termAmount < DEPOSIT_MIN
                  ? `최소 ${won(DEPOSIT_MIN)} 이상이어야 합니다.`
                  : `소지금이 부족합니다(현재 ${won(money)}).`}
              </p>
            )}
          </div>
        </div>

        {/* 가입한 정기예금 목록 */}
        {bank.deposits.length > 0 && (
          <ul className="bank-terms">
            {bank.deposits.map((d) => (
              <li key={d.id} className="bank-term">
                <span className="bank-term-principal">{won(d.principal)}</span>
                <span className="bank-term-due">
                  {d.matureDay}일차 만기 · {daysToMature(d, state.day)}일 남음
                </span>
                <span className="bank-term-value">만기 {won(maturityValue(d))}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── 대출 ─────────────────────────────────────── */}
      <section className="bank-sec" aria-label="대출">
        <h2 className="bank-sec-head">
          대출
          <span className="bank-sec-note">한도는 직장이 정합니다</span>
        </h2>

        <div className="bank-cards">
          <div className="bank-card bank-card-loan">
            <h3 className="bank-card-title">
              마이너스 통장
              <span className="bank-rate">일 {pct(LOAN_RATE)}</span>
            </h3>
            <p className="bank-card-desc">
              지금 바로 현금이 생깁니다. 그러나 갚기 전까지 <strong>매일 이자가 붙습니다</strong> —
              예금 이율보다 훨씬 높으므로, 빌려서 예금하는 것은 언제나 손해입니다.
            </p>
            <p className="bank-why">
              현재 한도 <strong>{won(limit)}</strong> —{' '}
              {career
                ? `${career.company} 재직 중(급여 ${won(career.salary)} 기준)`
                : '무직 기준. 취직하면 한도가 올라갑니다.'}
              <br />
              남은 한도 {won(room)}
              {career && ' · 퇴사·해고 시 한도는 내려가지만 빚은 그대로 남습니다.'}
            </p>

            {/* ux destructive-emphasis + confirmation-dialogs */}
            {bank.debt > 0 && loanDanger(state) && (
              <p className="bank-warn" role="alert">
                빚이 한도에 가까워지고 있습니다. 갚지 않으면 매일 {won(Math.round(bank.debt * LOAN_RATE))}
                씩 늘어나 파산이 앞당겨집니다.
              </p>
            )}

            <AmountField
              id="bank-loan-amount"
              label="대출 금액"
              value={loanInput}
              onChange={(v) => {
                setLoanInput(v)
                setConfirmLoan(false)
              }}
              chips={[
                { label: '50만', amount: 500_000 },
                { label: '100만', amount: 1_000_000 },
                { label: '한도까지', amount: room },
              ]}
            />

            {loanAmount > 0 && (
              <p className="bank-why">
                빌리면 빚이 {won(bank.debt + loanAmount)}이 되고, 하루에{' '}
                <strong>{won(loanDailyCost)}</strong>씩 불어납니다.
              </p>
            )}

            <div className="bank-actions">
              {confirmLoan ? (
                <>
                  <button
                    type="button"
                    className="bank-btn bank-btn-danger"
                    onClick={() => {
                      bankBorrow(loanAmount)
                      setConfirmLoan(false)
                    }}
                  >
                    {won(loanAmount)} 빌리기 — 확정
                  </button>
                  {/* ux escape-routes — 되돌아갈 길을 항상 둔다. */}
                  <button
                    type="button"
                    className="bank-btn bank-btn-ghost"
                    onClick={() => setConfirmLoan(false)}
                  >
                    취소
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="bank-btn bank-btn-danger"
                  disabled={!canBorrow(state, loanAmount)}
                  onClick={() => setConfirmLoan(true)}
                >
                  대출 신청
                </button>
              )}
            </div>
            {!canBorrow(state, loanAmount) && !confirmLoan && (
              <p className="bank-why">
                대출 불가 —{' '}
                {loanAmount < LOAN_MIN
                  ? `최소 ${won(LOAN_MIN)} 이상이어야 합니다.`
                  : `남은 한도(${won(room)})를 넘었습니다.`}
              </p>
            )}
          </div>

          {/* 상환 */}
          <div className="bank-card bank-card-loan">
            <h3 className="bank-card-title">상환</h3>
            <p className="bank-card-desc">
              {bank.debt > 0
                ? '갚는 시점은 언제나 직접 고릅니다 — 급여에서 자동으로 빠져나가지 않습니다. 그만큼 갚지 않으면 계속 불어납니다.'
                : '갚을 빚이 없습니다.'}
            </p>
            {bank.debt > 0 && (
              <>
                <p className="bank-why">
                  남은 빚 <strong>{won(bank.debt)}</strong> · 오늘 하루치 이자{' '}
                  {won(Math.round(bank.debt * LOAN_RATE))}
                </p>
                <div className="bank-actions">
                  <button
                    type="button"
                    className="bank-btn"
                    disabled={!canRepay(state, Math.min(bank.debt, money))}
                    onClick={() => bankRepay(Math.min(bank.debt, money))}
                  >
                    {money >= bank.debt ? '전액 상환' : `${won(money)} 상환`}
                  </button>
                </div>
                {!canRepay(state, Math.min(bank.debt, money)) && (
                  <p className="bank-why">상환 불가 — 소지금이 없습니다.</p>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── 거래 내역 ────────────────────────────────── */}
      <section className="bank-sec" aria-label="거래 내역">
        <h2 className="bank-sec-head">
          거래 내역
          <span className="bank-sec-note">최근 것이 위에 옵니다</span>
        </h2>
        {bank.ledger.length === 0 ? (
          /* ux empty-states — 빈 표 대신 무엇을 하면 되는지 적는다. */
          <p className="bank-empty">
            아직 거래가 없습니다. 위에서 예금에 넣거나 대출을 받으면 여기에 기록됩니다.
          </p>
        ) : (
          <table className="bank-ledger">
            <thead>
              <tr>
                <th scope="col">날짜</th>
                <th scope="col">구분</th>
                <th scope="col" className="bank-amount">
                  금액
                </th>
              </tr>
            </thead>
            <tbody>
              {[...bank.ledger].reverse().map((e) => (
                <tr key={e.id}>
                  <td className="bank-ledger-day">{e.day}일차</td>
                  <td>{LEDGER_LABELS[e.kind]}</td>
                  {/* ⚠️ 부호가 함께 있으므로 색만으로 방향을 전하지 않는다(ux color-not-only). */}
                  <td className={`bank-amount ${isInflow(e.kind) ? 'bank-in' : 'bank-out'}`}>
                    {isInflow(e.kind) ? '+' : '-'}
                    {won(e.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <footer className="bank-foot">
        {BANK_NAME}은 실재하지 않는 은행입니다. 이자는 매일 밤 자동으로 정산되며,
        정기예금은 만기일 밤에 원리금이 소지금으로 입금됩니다. 대출 이율은 언제나 예금
        이율보다 높습니다.
      </footer>
    </div>
  )
}
