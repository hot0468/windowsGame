import { deviceSpecs, windowsSpecs } from '../../data/systemSpec'
import { UI_ICONS } from '../../data/icons'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import type { SpecRow } from '../../data/systemSpec'
import './SystemPropsApp.css'

/**
 * 시스템 속성 — **바탕화면 빈 자리를 오른쪽 클릭해 여는 창**(`WindowKind: 'sysinfo'`).
 *
 * ## ⚠️ 게임 상태를 한 톨도 안 만진다
 * 읽기 전용이고 턴도 안 쓴다(`BlueScreen`·부팅 화면과 같은 자리). 사양은
 * `data/systemSpec.ts`가 갖고 여기서는 **줄로 옮겨 적기만** 한다.
 *
 * ## ⚠️ 새 시각 언어를 만들지 않는다
 * OS 크롬 토큰(`--os-*`)만 쓴다 — 이 창은 윈도우의 설정 화면이지 게임 HUD도, 프로그램도
 * 아니다(그래서 `--hud-*`도 `.ad`류의 자기 팔레트도 여기 없다).
 */
export function SystemPropsApp() {
  const state = useGameStore((s) => s.state)
  if (!state) return null

  return (
    <div className="sys">
      <header className="sys-head">
        <AppIcon name={UI_ICONS.sysinfo} size={30} />
        <div>
          <h2 className="sys-title">{state.playerName || '사용자'}-PC</h2>
          <p className="sys-sub">윈도우 11 Home</p>
        </div>
      </header>

      <Section title="장치 사양" rows={deviceSpecs(state.playerName)} />
      <Section title="윈도우 사양" rows={windowsSpecs()} />
    </div>
  )
}

/**
 * 사양 한 묶음.
 *
 * ⚠️ **`<dl>`이다.** 이름-값 쌍이라 그 뜻을 가진 태그가 이미 있고, 화면 낭독기가
 * "장치 이름: 측정-PC"로 묶어 읽는다 — `div` 두 개로 그리면 그 관계가 사라진다.
 */
function Section({ title, rows }: { title: string; rows: SpecRow[] }) {
  return (
    <section className="sys-sec">
      <h3 className="sys-sec-title">{title}</h3>
      <dl className="sys-list">
        {rows.map((row) => (
          <div key={row.label} className="sys-row">
            <dt className="sys-label">{row.label}</dt>
            <dd className="sys-value">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
