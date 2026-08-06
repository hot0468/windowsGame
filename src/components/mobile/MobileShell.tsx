import { useEffect, useMemo, useState } from 'react'
import { findActivity } from '../../data/activities'
import { DESKTOP_ITEMS, desktopEntries } from '../../data/desktopItems'
import { UI_ICONS } from '../../data/icons'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import { useShortcutStore } from '../../store/shortcutStore'
import { useWindowStore } from '../../store/windowStore'
import type { Activity, DesktopEntry, DesktopItem } from '../../types/game'
import { ActivityConfirm } from '../apps/ActivityConfirm'
import { EndingModal } from '../apps/EndingModal'
import { ToastHost } from '../desktop/ToastHost'
import { MobileAppView } from './MobileAppView'
import { MobileNavBar } from './MobileNavBar'
import { MobileStatSheet } from './MobileStatSheet'
import { MobileStatusBar } from './MobileStatusBar'
import './MobileShell.css'

/**
 * 모바일 셸 — 데스크톱 셸(`Desktop`)과 **같은 게임의 다른 껍데기**다.
 *
 * ## 무엇을 재사용하는가
 * ⚠️ 게임 로직도, 앱 내용물도, 앱 목록도 새로 만들지 않는다:
 *  - 앱 목록: `desktopEntries(shortcutIds)` — 바탕화면과 **같은 출처**다.
 *    모바일 전용 목록을 만들면 앱을 추가할 때 한쪽만 고치게 된다.
 *    다만 격자 좌표(`DEFAULT_ICON_CELLS`)는 **무시한다** — 폰 홈 화면은 절대 좌표가
 *    아니라 흐르는 그리드이고, 데스크톱 격자는 뷰포트 폭으로 칸 수를 계산한다.
 *  - 앱 내용물: `windowStore` + `appForWindow` — `WindowManager`와 같은 분기다.
 *  - 스탯: `STAT_META`·`STAT_NAMES`·`rankOf` (표현만 모바일 전용).
 *
 * ## 무엇을 마운트하지 않는가
 * ⚠️ `Window`·`Desktop`·`Taskbar`·`CalendarPanel`·`StatPanel`은 **아예 그리지 않는다** —
 * 전부 `window.innerWidth` 기반 절대 좌표를 쓰고, 375px 화면에서는 서로를 덮는다.
 * 지우지는 않았다(데스크톱 셸은 그대로 살아 있다).
 *
 * ## 무엇이 셸과 무관하게 살아 있는가
 * 엔딩 모달(게임이 끝나는 순간)·토스트(알림)·활동 확인창. 셋 다 여기서도 그린다.
 *
 * ## 화면은 둘뿐이다
 * **홈**(앱 그리드) ↔ **앱 뷰**(전체화면). 앱이 열려 있으면 앱 뷰, 아니면 홈이다 —
 * 별도의 `screen` 상태를 두지 않는다(창 목록과 어긋날 수 있는 두 번째 진실이 된다).
 */
export function MobileShell() {
  const open = useWindowStore((s) => s.open)
  const windows = useWindowStore((s) => s.windows)
  const shortcutIds = useShortcutStore((s) => s.activityIds)
  const autoRun = useGameStore((s) => s.autoRun)
  const autoRunning = useGameStore((s) => s.autoRunning)

  /** 스탯·날짜를 보는 바텀 시트. 데스크톱 스탯창을 대신하는 창구다. */
  const [sheetOpen, setSheetOpen] = useState(false)
  /** 실행 여부를 묻는 중인 활동(홈 화면 바로 가기를 탭했을 때). */
  const [confirming, setConfirming] = useState<Activity | null>(null)

  /*
   * 자동 진행이 끝나면 요약 창을 스스로 띄운다. 데스크톱 `Desktop`과 같은 이유·같은 코드다 —
   * 여기에도 두지 않으면 모바일에서는 며칠이 조용히 사라진다.
   */
  useEffect(() => {
    if (autoRunning || !autoRun?.stop || autoRun.slots === 0) return
    open({
      id: 'autolog',
      kind: 'autolog',
      title: '자동 진행 기록',
      icon: UI_ICONS.autoLog,
      x: 0,
      y: 0,
      width: 520,
    })
  }, [autoRun, autoRunning, open])

  const entries = useMemo(() => desktopEntries(shortcutIds), [shortcutIds])

  /**
   * 지금 전체화면으로 그릴 앱 = **최소화되지 않은 창 중 z가 가장 높은 하나**.
   * 폰에는 "여러 창"이 없으므로 창 목록을 **앱 스택**으로 읽는다.
   */
  const top = useMemo(() => {
    const visible = windows.filter((w) => !w.minimized)
    if (!visible.length) return null
    return visible.reduce((a, b) => (b.zIndex > a.zIndex ? b : a))
  }, [windows])

  const openItem = (item: DesktopItem) => {
    const i = DESKTOP_ITEMS.indexOf(item)
    open({
      id: `${item.kind}-${item.id}`,
      title: item.label,
      icon: item.icon,
      // 모바일은 전체화면이라 좌표·폭·최대화가 쓰이지 않는다. 그래도 값을 넘기는 것은
      // 같은 창을 데스크톱으로 전환해서 볼 수 있어야 하기 때문이다(셸 토글은 창을 닫지 않는다).
      x: 120 + i * 28,
      y: 80 + i * 28,
      width: item.width,
      maximized: item.openMaximized,
      kind: item.kind,
      activityId: item.activityId,
      message: item.stubMessage,
      appId: item.appId,
      folderId: item.folderId,
    })
  }

  /**
   * 앱을 연다. ⚠️ **한 번 탭이다**(더블클릭이 아니라) — 폰이므로.
   * 바로 가기는 데스크톱과 똑같이 확인창을 거친다(1턴이 나가는 지름길이라 기습이면 안 된다).
   */
  const openEntry = (entry: DesktopEntry) => {
    if (!entry.shortcut) {
      openItem(entry.item)
      return
    }
    const activity = findActivity(entry.activityId)
    if (activity) setConfirming(activity)
  }

  return (
    <div className="mo">
      <MobileStatusBar onOpenStats={() => setSheetOpen(true)} />

      {/* 홈 화면. 앱이 열려 있어도 **DOM에 남겨 둔다** — 앱을 닫았을 때 스크롤 위치와
          그리드가 그대로 있어야 "홈으로 돌아왔다"로 읽힌다. 앱 뷰가 그 위를 덮는다. */}
      <main className="mo-home" aria-hidden={top ? true : undefined}>
        <ul className="mo-grid">
          {entries.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                className="mo-app"
                onClick={() => openEntry(entry)}
              >
                <span className="mo-app-art">
                  {/* ⚠️ 다색 아이콘이다 — CSS color를 입히지 않는다. */}
                  <AppIcon name={entry.icon} size={34} />
                </span>
                <span className="mo-app-name">{entry.label}</span>
                {entry.shortcut && <span className="mo-sr-only"> (바로 가기)</span>}
              </button>
            </li>
          ))}
        </ul>
      </main>

      {/* 전체화면 앱. 창 크롬 대신 앱 바 하나가 제목과 닫기를 진다. */}
      {top && <MobileAppView win={top} />}

      <MobileNavBar
        appOpen={Boolean(top)}
        sheetOpen={sheetOpen}
        onToggleSheet={() => setSheetOpen((v) => !v)}
      />

      {sheetOpen && <MobileStatSheet onClose={() => setSheetOpen(false)} />}

      {/* 알림·확인창·엔딩은 셸과 무관하게 살아 있어야 한다. */}
      <ToastHost />
      {confirming && (
        <ActivityConfirm activity={confirming} onClose={() => setConfirming(null)} />
      )}
      <EndingModal />
    </div>
  )
}
