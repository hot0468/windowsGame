import { START_MENU_ITEMS } from '../../data/startMenu'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import { useWindowStore } from '../../store/windowStore'
import './StartMenu.css'

/**
 * 시작 메뉴.
 *
 * 바탕화면이 **게임 세계의 앱**을 담는다면 여기는 **게임 바깥의 도구**다
 * (세이브·작업 관리자·명령 프롬프트·솔리테어). 실제 윈도우의 구분과 같다.
 *
 * 바깥 클릭으로 닫는 것은 브라우저 더보기 메뉴와 같은 방식이다 — 전역 리스너 대신
 * 투명 scrim 한 장을 깔면 React가 붙이고 떼므로 정리 코드가 없다.
 */
export function StartMenu({ onClose }: { onClose: () => void }) {
  const open = useWindowStore((s) => s.open)
  const playerName = useGameStore((s) => s.state?.playerName ?? '사용자')

  return (
    <>
      <div className="start-scrim" onClick={onClose} />
      <div
        className="start"
        role="menu"
        /* ux `escape-routes`: Esc로 빠져나올 수 있어야 한다. */
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <div className="start-head">
          <span className="start-avatar" aria-hidden="true">
            {playerName.slice(0, 1)}
          </span>
          <span className="start-name">{playerName}</span>
        </div>

        <ul className="start-list">
          {START_MENU_ITEMS.map((item) => (
            <li key={item.id} className={item.separatorBefore ? 'start-sep' : undefined}>
              <button
                type="button"
                role="menuitem"
                className="start-item"
                onClick={() => {
                  onClose()
                  open({
                    id: `${item.kind}-${item.id}`,
                    kind: item.kind,
                    title: item.label,
                    icon: item.icon,
                    x: 180,
                    y: 90,
                    width: item.width,
                  })
                }}
              >
                <AppIcon name={item.icon} size={22} />
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
