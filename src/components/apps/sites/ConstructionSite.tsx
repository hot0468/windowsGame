import { UI_ICONS } from '../../../data/icons'
import type { Site } from '../../../data/sites'
import { AppIcon } from '../../../icons/AppIcon'
import './ConstructionSite.css'

/**
 * 아직 열리지 않은 사이트의 공용 안내 페이지.
 * 사이트마다 페이지를 따로 만들지 않는다 — 다른 것은 데이터(이름·아이콘·문구)뿐이다.
 *
 * 홈으로 가는 버튼을 함께 둔다: 즐겨찾기는 포털 안에 있어서
 * 이 페이지에 도달하면 뒤로 가기 외에는 돌아갈 길이 없다
 * (ux `persistent-nav`, `empty-nav-state`: 막다른 길에는 이유와 나갈 길을 함께 둔다).
 */
export function ConstructionSite({ site, onGoHome }: { site: Site; onGoHome: () => void }) {
  return (
    <div className="nv-construction">
      <AppIcon name={UI_ICONS.underConstruction} size={56} />
      <h1 className="nv-construction-title">
        <AppIcon name={site.icon} size={24} />
        {site.title}
      </h1>
      <p className="nv-construction-text">{site.notice}</p>
      <button type="button" className="nv-construction-home" onClick={onGoHome}>
        네이놈 홈으로
      </button>
    </div>
  )
}
