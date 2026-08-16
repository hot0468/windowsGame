import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import { findMaster, MASTER_MENTAL } from '../../systems/masters'
import { giftAmount, seenMaster } from '../../systems/masters'
import { growthCap } from '../../systems/turn'
import { findItem } from '../../data/items'
import { STAT_NAMES } from '../../types/game'
import './MasterVisit.css'

/**
 * **스탯 마스터의 방문** — 그 분야를 오래 한 사람이 찾아와 선물을 주고 간다
 * (설계자 지시, 프린세스메이커).
 *
 * ## 왜 활동 창이 아닌가
 * 활동 창은 "이걸 할까요?"를 묻는 팝업이고 실행하면 1턴을 쓴다. 스승이 찾아온 것은
 * 플레이어가 고른 행동이 아니라 **일어난 일**이라, 턴을 먹으면 A 등급에 닿은 보상이
 * 곧 벌금이 된다(별똥별과 완전히 같은 판단이고 같은 부류의 창이다).
 *
 * ## ⚠️ 닫기만 하면 다음 밤에 다시 온다
 * 이 창을 닫는 것 자체는 아무것도 기록하지 않는다 — 기록은 선물을 받을 때만 찍히고
 * 그것이 "한 번만"의 근거다(`systems/masters.ts`의 `receiveGift`).
 * 그래서 [나중에]는 죽은 컨트롤이 아니다: 아무 일도 안 일어나고 다시 찾아온다.
 *
 * ## ⚠️ 무엇을 받는지 미리 다 적는다
 * 스탯이 얼마 오르는지·상한에서 잘리는지·어떤 물건이 남는지를 누르기 전에 적는다.
 * 숨긴 채 "받겠습니다"만 두면 그 버튼이 도박이 된다(ux `error-clarity`와 같은 결).
 */
export function MasterVisit({ masterId, onClose }: { masterId: string; onClose: () => void }) {
  const state = useGameStore((s) => s.state)
  const receiveMasterGift = useGameStore((s) => s.receiveMasterGift)
  const master = findMaster(masterId)

  if (!state || !master) return null
  /* 이미 받은 뒤에 창이 남아 있으면(같은 밤에 두 번 눌렀다면) 아무것도 그리지 않는다. */
  if (seenMaster(state, master.id)) return null

  const gift = findItem(master.gift)
  const key = master.key
  const cap = growthCap(key)
  /* ⚠️ **상한에서 잘리는 몫을 미리 적는다**(별똥별과 같은 이유) — A에 닿은 스탯이라
     상한 근처면 실제로 잘리고, 그 사실을 안 적으면 화면이 거짓 숫자를 말한다. */
  const gain = Math.min(cap, state.stats[key] + giftAmount(key)) - state.stats[key]

  return (
    <div className="mv">
      {/* ⚠️ **인물 그림을 그리지 않았다.** 사람 얼굴은 이 리포에 한 장도 없고(아이콘·배너·
          포스터 전부 CSS다), 스승 열넷의 초상을 만들면 그 순간 새 시각 언어가 된다.
          누가 왔는지는 **이름과 하는 일**이 지고, 글리프는 그 분야를 가리키기만 한다. */}
      <header className="mv-head">
        <AppIcon name={master.icon} size={40} />
        <div className="mv-who">
          <p className="mv-name">{master.name}</p>
          <p className="mv-title">{master.title}</p>
        </div>
      </header>

      <p className="mv-line">{master.line}</p>

      <div className="mv-gift">
        <p className="mv-gift-head">받는 것</p>
        <ul className="mv-gift-list">
          <li>
            <span className="mv-gift-name">{STAT_NAMES[key]}</span>
            <span className="mv-gift-value">
              {state.stats[key]} → {state.stats[key] + gain}
              {/* 잘린 경우에만 그 사실을 적는다. 늘 적으면 상한이 먼 스탯에서도 소음이 된다. */}
              {gain < giftAmount(key) && (
                <span className="mv-gift-note">상한 {cap.toLocaleString('ko-KR')}에서 멈춥니다</span>
              )}
            </span>
          </li>
          <li>
            <span className="mv-gift-name">멘탈</span>
            <span className="mv-gift-value">+{MASTER_MENTAL}</span>
          </li>
          {gift && (
            <li>
              <span className="mv-gift-name">{gift.name}</span>
              <span className="mv-gift-value mv-gift-desc">{gift.desc}</span>
            </li>
          )}
        </ul>
      </div>

      <div className="mv-actions">
        <button
          type="button"
          className="mv-btn mv-btn-primary"
          onClick={() => {
            receiveMasterGift(master.id)
            onClose()
          }}
        >
          감사히 받습니다
        </button>
        {/* ⚠️ 죽은 컨트롤이 아니다: 닫으면 아무 일도 안 일어나고 **다시 찾아온다**.
            그 사실을 title로 적어 "기회를 날렸다"는 오해를 막는다(별똥별과 같은 장치). */}
        <button
          type="button"
          className="mv-btn"
          onClick={onClose}
          title="지금은 받지 않습니다. 다시 찾아옵니다."
        >
          나중에
        </button>
      </div>
    </div>
  )
}
