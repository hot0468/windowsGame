import { CAT_NIGHT_FOOD_COST } from '../../data/cat'
import { MALWARE_DAILY_LOSS } from '../../data/malware'
import { useGameStore } from '../../store/gameStore'
import { countConsecutive, getBurnoutPenalty } from '../../systems/burnout'
import { catAdopted, catName } from '../../systems/cat'
import { getLivingCost } from '../../systems/economy'
import { PHONE_FEE, daysToPhoneBill } from '../../systems/phone'
import { activeSubscriptions, daysToBilling } from '../../systems/subscription'
import { MENTAL_CAP, STAMINA_CAP } from '../../systems/turn'
import './TaskMgrApp.css'

/**
 * 작업 관리자 — **내 상태를 프로세스 목록으로 보여 주는 진단 창.**
 *
 * 유머이면서 실용이다: 번아웃 효율처럼 게임이 계산하면서 화면에 안 보여주던 값을
 * 실제 윈도우 11 작업 관리자 '프로세스' 화면의 판형으로 처음 노출한다.
 * 레퍼런스가 스펙이다(엑셀 도감·탐색기의 머리말과 같은 방식) — 다만 **누를 것 없는
 * 부품은 그리지 않는다**: 탭 레일·검색창·[작업 끝내기]는 없다. 프로세스를 끝내는 것은
 * 이 게임에 대응 동작이 없고, 악성코드 치료는 백신·`clean` 두 갈래가 확정 규칙이라
 * 여기서 끝내게 하면 세 번째 통로가 생긴다.
 *
 * ⚠️ **읽기 전용이다**(도감과 같은 규칙) — 턴·스탯을 안 건드린다.
 * ⚠️ **값을 여기서 재계산하지 않는다** — 번아웃은 `getBurnoutPenalty`, 생활비는
 * `getLivingCost`, 청구일은 `daysToBilling`/`daysToPhoneBill` 등 **미리보기·정산이 쓰는
 * 것과 같은 창구**만 부른다. 따로 계산하면 이 화면만 조용히 거짓말을 하게 된다.
 */

/**
 * 멘탈이 이 아래면 상태 칸에 "응답 없음"이 뜬다(실제 윈도우 문구).
 * 게임 규칙이 아니라 **표시 문턱**이다 — 어떤 판정도 이 값을 읽지 않는다.
 */
const MENTAL_HANG = 20

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`

export function TaskMgrApp() {
  const state = useGameStore((s) => s.state)
  if (!state) return null

  /* 번아웃은 활동별 값이라 "마지막으로 한 활동"의 키를 기준으로 본다 —
     그게 지금 플레이어가 실제로 물고 있는 배율이다(구 SystemApps 판과 같은 판단). */
  const recent = state.recentActivities
  const lastKey = recent[recent.length - 1]
  const efficiency = lastKey ? getBurnoutPenalty(recent, lastKey).efficiency : 1
  const streak = lastKey ? countConsecutive(recent, lastKey) : 0

  const subs = activeSubscriptions(state)
  const phoneDays = daysToPhoneBill(state)
  const adopted = catAdopted(state)
  /* Recovery 중이면 며칠째 아무 입력도 못 받는 상태다 — "응답 없음"이 정확한 번역이다. */
  const mentalHang = state.stats.mental <= MENTAL_HANG || !!state.recovery

  return (
    <div className="tm">
      <table className="tm-table">
        <thead>
          <tr>
            <th scope="col">이름</th>
            <th scope="col">상태</th>
            <th scope="col" className="tm-num">
              값
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="tm-group">
            <td colSpan={3}>앱 ({adopted ? 2 : 1})</td>
          </tr>
          <tr>
            <td>멘탈.exe</td>
            <td>{mentalHang ? '응답 없음' : '실행 중'}</td>
            <td className="tm-num">{Math.round((state.stats.mental / MENTAL_CAP) * 100)}%</td>
          </tr>
          {adopted && (
            <tr>
              <td>{catName(state)}.exe</td>
              <td>실행 중</td>
              {/* 장식이 아니라 사실을 적는다 — 하루 한 번 커서(`lastPetDay`)가 근거다. */}
              <td className="tm-num">
                {state.cat?.lastPetDay === state.day ? '오늘 쓰다듬음' : '아직 안 쓰다듬음'}
              </td>
            </tr>
          )}

          {state.malware && (
            <>
              <tr className="tm-group">
                <td colSpan={3}>백그라운드 프로세스 (1)</td>
              </tr>
              {/* 표시만 한다 — 끝내는 길은 백신 결제와 명령 프롬프트 `clean` 둘뿐이다. */}
              <tr>
                <td>ad-loader.exe</td>
                <td>실행 중</td>
                <td className="tm-num">밤마다 −{won(MALWARE_DAILY_LOSS)}</td>
              </tr>
            </>
          )}

          {/* "Windows 프로세스" 자리. 이름은 가짜 OS 것을 쓴다(`OS_VERSION`과 같은 규칙). */}
          <tr className="tm-group">
            <td colSpan={3}>시스템 프로세스</td>
          </tr>
          <tr>
            <td>체력.sys</td>
            <td>실행 중</td>
            <td className="tm-num">{Math.round((state.stats.stamina / STAMINA_CAP) * 100)}%</td>
          </tr>
          <tr>
            <td>번아웃 감시자</td>
            <td>실행 중</td>
            <td className="tm-num">
              {streak > 0
                ? `효율 ${Math.round(efficiency * 100)}% · 연속 ${streak}회`
                : '효율 100%'}
            </td>
          </tr>
          <tr>
            <td>생활비 서비스</td>
            <td>실행 중</td>
            {/* 합계를 적지 않는다 — 합산 창구가 없는 값이라 여기서 더하면 두 번째 출처가 된다. */}
            <td className="tm-num" />
          </tr>
          <tr className="tm-child">
            <td>생활비</td>
            <td />
            <td className="tm-num">−{won(getLivingCost(state))}/밤</td>
          </tr>
          {subs.map((sub) => (
            <tr key={sub.id} className="tm-child">
              <td>{sub.name}</td>
              <td />
              <td className="tm-num">
                −{won(sub.monthlyFee)}/월 · {daysToBilling(state, sub.id)}일 후
              </td>
            </tr>
          ))}
          {phoneDays !== undefined && (
            <tr className="tm-child">
              <td>휴대폰 요금</td>
              <td />
              <td className="tm-num">
                −{won(PHONE_FEE)}/월 · {phoneDays}일 후
              </td>
            </tr>
          )}
          {adopted && (
            <tr className="tm-child">
              <td>{catName(state)} 사료</td>
              <td />
              <td className="tm-num">−{won(CAT_NIGHT_FOOD_COST)}/밤</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
