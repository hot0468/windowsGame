import { AppIcon } from '../../icons/AppIcon'
import { ADWARE_ADS, VACCINE_PRICE } from '../../data/malware'
import { useGameStore } from '../../store/gameStore'
import { vaccineBlocker } from '../../systems/malware'
import './AdwareApp.css'

/**
 * 악성코드가 띄우는 광고 팝업.
 *
 * ## 이 창이 하는 일
 * 감염 중이면 **턴이 넘어갈 때마다 하나씩** 뜬다(`gameStore.afterTurn`). 여러 개가
 * 쌓이도록 두는 것이 대가의 절반이다 — 나머지 절반은 밤마다 새는 돈이다.
 *
 * ⚠️ **닫을 수 있다.** 시스템 팝업(`OpenWindow.popup`)으로 열지 않는 이유는
 * `WindowKind: 'adware'` 주석에 있다: 못 닫는 창이 매 턴 쌓이면 대가가 아니라 고장이다.
 *
 * ⚠️ **치료 두 갈래 중 하나가 이 버튼이다**(다른 하나는 명령 프롬프트의 `clean`).
 * 판정·금액은 전부 `systems/malware.ts`가 갖고 여기서는 사유를 그대로 적는다 —
 * 못 누르는 버튼이 왜 못 누르는지 말하지 않으면 죽은 컨트롤과 구별되지 않는다.
 *
 * ⚠️ **결제는 턴을 쓰지 않는다**(은행 거래와 같은 부류 — 일어나는 일은 결제뿐이다).
 */
export function AdwareApp({ seed, onClose }: { seed: string; onClose: () => void }) {
  const state = useGameStore((s) => s.state)
  const buy = useGameStore((s) => s.buyVaccine)
  if (!state) return null

  /* 창마다 다른 광고가 뜨게 하는 값. **창 id를 섞는다** — 지금 날짜로 고르면 쌓인 창이
     전부 같은 광고가 된다(창은 매번 다시 그려지고 날짜는 하나뿐이므로). */
  const ad = ADWARE_ADS[hash(seed) % ADWARE_ADS.length]
  const blocked = vaccineBlocker(state)

  return (
    <div className="adw">
      <div className="adw-ad">
        <span className="adw-brand">{ad.brand}</span>
        <strong className="adw-head">{ad.headline}</strong>
        <span className="adw-sub">{ad.sub}</span>
      </div>

      <p className="adw-warn">
        <AppIcon name="mdi:alert" size={16} />이 광고는 컴퓨터에 설치된 프로그램이 띄우고
        있습니다.
      </p>

      <div className="adw-actions">
        <button
          type="button"
          className="adw-btn adw-btn-primary"
          disabled={blocked !== null}
          onClick={() => {
            buy()
            onClose()
          }}
        >
          백신 결제하고 제거 ({VACCINE_PRICE.toLocaleString('ko-KR')}원)
        </button>
        <button type="button" className="adw-btn" onClick={onClose}>
          닫기
        </button>
      </div>

      {/* 못 누르는 사유. role="status"라 보조기기도 같은 말을 듣는다. */}
      {blocked && (
        <p className="adw-note" role="status">
          {blocked}
        </p>
      )}
    </div>
  )
}

/** 문자열 → 정수. 광고를 고르는 데만 쓰는 값이라 분포보다 **결정적인 것**이 중요하다. */
function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 100_000
  return h
}
