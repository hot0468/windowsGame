import { useState } from 'react'
import { START_MENU_ITEMS } from '../../data/startMenu'
import { MOBILE_ICONS, UI_ICONS } from '../../data/icons'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import { useShellStore } from '../../store/shellStore'
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
  const day = useGameStore((s) => s.state?.day ?? 1)
  const reset = useGameStore((s) => s.reset)
  const setOverride = useShellStore((s) => s.setOverride)
  /* [새 게임]은 세이브를 지운다. 메뉴 항목은 스치듯 눌리는 자리라 확인을 한 단계 둔다
     (ux `confirmation-dialogs`). 두 번 누르게 하는 방식은 쓰지 않는다 — 메뉴에서
     더블클릭은 흔한 사고다. */
  const [confirming, setConfirming] = useState(false)

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

        {/*
         * 휴대폰 모드로 전환.
         *
         * ⚠️ **여기 있는 이유:** 셸을 바꾸는 것은 게임 세계의 앱이 아니라 **게임 바깥의
         * 도구**다 — 세이브·작업 관리자와 같은 성격이라 시작 메뉴가 제자리다.
         * 되돌아오는 길은 모바일 하단바에 있다(양쪽에 두지 않으면 한 셸에 갇힌다).
         *
         * 목록에 섞지 않고 아래에 떼어 둔 것은 `START_MENU_ITEMS`가 **창을 여는 항목**의
         * 데이터이기 때문이다. 창을 열지 않는 동작을 그 배열에 넣으면 `kind`가 거짓이 된다.
         */}
        <button
          type="button"
          role="menuitem"
          className="start-item start-shell"
          onClick={() => {
            onClose()
            setOverride('mobile')
          }}
          title="화면을 휴대폰 UI로 바꿉니다. 돌아오는 버튼은 폰 화면 아래에 있습니다"
        >
          <AppIcon name={MOBILE_ICONS.phone} size={22} />
          휴대폰 모드
        </button>

        {/*
         * 새 게임. **잠금화면으로 돌려보내는 것이 전부다** — 이름을 다시 받아야 판이
         * 시작되므로(`LockScreen`), 여기서 만드는 것은 없다. 안내 투어는 그때
         * `startGame`이 켠다.
         */}
        {confirming ? (
          <div className="start-confirm" role="alertdialog" aria-label="새 게임 확인">
            <p className="start-confirm-text">
              지금 판({day}일차)은 지워집니다. 새로 시작할까요?
            </p>
            <div className="start-confirm-btns">
              <button type="button" className="start-confirm-btn" onClick={() => setConfirming(false)}>
                취소
              </button>
              <button
                type="button"
                className="start-confirm-btn start-confirm-go"
                onClick={() => {
                  onClose()
                  reset()
                }}
              >
                새 게임
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            role="menuitem"
            className="start-item"
            onClick={() => setConfirming(true)}
          >
            <AppIcon name={UI_ICONS.newGame} size={22} />새 게임
          </button>
        )}
      </div>
    </>
  )
}
