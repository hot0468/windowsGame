import { UI_ICONS } from '../../data/icons'
import { AppIcon } from '../../icons/AppIcon'
import './StubApp.css'

/**
 * 아직 구현되지 않은 앱의 안내 창.
 * 바탕화면에 아이콘만 먼저 올려 두고 내용은 나중에 채우는 항목들이 공유한다.
 * 게임 상태를 전혀 건드리지 않는다 — 턴도 스탯도 소모하지 않는다.
 */
export function StubApp({ message }: { message: string }) {
  return (
    <div className="stub">
      <AppIcon name={UI_ICONS.underConstruction} size={40} className="stub-icon" />
      <p className="stub-text">{message}</p>
    </div>
  )
}
