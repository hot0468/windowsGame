import { ZOOM_APP_ID } from '../../../data/meetings'
import { AppIcon } from '../../../icons/AppIcon'
import { useGameStore } from '../../../store/gameStore'
import { zoomInstalled } from '../../../systems/meeting'
import type { Site } from '../../../data/sites'
/* ⚠️ **브랜드 색은 앱 창과 한 파일에서 온다**(`.zm`·`.zs` 두 스코프) — 같은 프로그램의
   파랑을 두 파일에 적으면 반드시 어긋난다. 그래서 이 import는 장식이 아니다. */
import '../ZoomApp.css'

/**
 * 줌 다운로드 페이지.
 *
 * ## 은행·어도비와 같은 "기능 사이트"다
 * **활동을 실행하지 않고 턴도 돈도 쓰지 않는다**(`activityId` 없음 → 확정 패널도 없다).
 * 여기서 일어나는 일은 하나뿐이다: 바탕화면에 프로그램이 생긴다(`GameState.installed`).
 *
 * ⚠️ **공짜다.** 값을 매기지 않은 이유는 회의가 **회사가 시키는 일**이기 때문이다 —
 * 참석하지 않으면 성과가 깎이는 것에 돈까지 물리면 대가가 두 겹이 된다.
 */
export function ZoomSite({ site }: { site: Site }) {
  const state = useGameStore((s) => s.state)
  const installApp = useGameStore((s) => s.installApp)

  if (!state) return null
  const installed = zoomInstalled(state)

  return (
    <div className="zs">
      <header className="zs-head">
        <h1 className="zs-logo">
          <AppIcon name={site.icon} size={28} />줌
        </h1>
        <p className="zs-lede">어디서나 연결되는 화상회의. 회사에서 쓰는 그 프로그램입니다.</p>
      </header>

      <section className="zs-card" aria-label="내려받기">
        <p className="zs-ver">줌 워크플레이스 · Windows 64비트 · 무료</p>
        {installed ? (
          <p className="zs-done">
            <AppIcon name="fluent-color:checkmark-circle-24" size={20} />
            설치 완료 — 바탕화면에서 실행하세요
          </p>
        ) : (
          <button type="button" className="zs-get" onClick={() => installApp(ZOOM_APP_ID)}>
            다운로드
          </button>
        )}
      </section>

      <ul className="zs-list">
        <li>· 회의 참여는 무료이고 시간(턴)을 쓰지 않습니다.</li>
        <li>· 회의는 회사에서 잡습니다 — 너아무튼온으로 온 요청을 [확인]하면 일정에 들어갑니다.</li>
        <li>· 잡힌 회의에 빠지면 그날 밤 성과가 깎입니다.</li>
      </ul>

      <p className="zs-foot">
        회의 시간이 아닐 때 실행하면 참여할 방이 없습니다. 다음 회의 날짜는 프로그램을 열면
        적혀 있습니다.
      </p>
    </div>
  )
}
