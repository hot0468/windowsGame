import { useEffect, useRef } from 'react'
import { CHAT_APPS, MAILBOX, findThread } from '../../data/messages'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import { useToastStore } from '../../store/toastStore'
import { useWindowStore } from '../../store/windowStore'
import { noticeMail } from '../../systems/employment'
import { channelVisible, selectIncoming } from '../../systems/messages'
import './ToastHost.css'

/** 토스트가 저절로 사라지기까지의 시간. ux `toast-dismiss`: 3~5초. */
const TOAST_MS = 5000

/**
 * 택배 알림의 채널 값.
 *
 * `Message`를 그대로 재사용한다 — 토스트 자료구조를 하나 더 만들면 겹침 제한(MAX_TOASTS)과
 * 중복 제거를 두 벌로 관리하게 된다. 대신 **이 채널만은 채팅방도 사서함도 아니므로**
 * 아래에서 별도로 분기한다.
 */
const DELIVERY_CHANNEL = 'delivery'

/** 택배 알림·인벤토리 폴더 공용 아이콘. */
const DELIVERY_ICON = 'fluent-color:document-folder-24'

/**
 * 우하단 알림 토스트.
 *
 * **턴이 넘어갈 때** 그 턴의 메시지를 띄운다(설계자 결정). 실시간 타이머로 무작위
 * 팝업을 띄우지 않는 이유는 뉴스와 같다 — 게임 진행과 무관하게 뜨는 알림은 정보가
 * 아니라 소음이고, 편성표가 결정적이라야 테스트도 결정적이다.
 *
 * ⚠️ 토스트는 **게임 상태를 바꾸지 않는다.** 누르면 해당 앱 창을 열 뿐이고,
 * 창을 여는 것 자체는 무료다("탐색은 무료").
 */
export function ToastHost() {
  const day = useGameStore((s) => s.state?.day)
  const slot = useGameStore((s) => s.state?.slot)
  /* ⚠️ 아직 없는 방의 알림은 띄우지 않는다 — 누르면 열 수 없는 토스트가 된다.
     판정은 `channelVisible` 하나이고 메신저 창의 목록과 같은 것을 본다. */
  const state = useGameStore((s) => s.state)
  const toasts = useToastStore((s) => s.toasts)
  const push = useToastStore((s) => s.push)
  const dismiss = useToastStore((s) => s.dismiss)
  const open = useWindowStore((s) => s.open)
  const arrivals = useGameStore((s) => s.arrivals)
  const clearArrivals = useGameStore((s) => s.clearArrivals)
  const jobNotices = useGameStore((s) => s.jobNotices)
  const clearJobNotices = useGameStore((s) => s.clearJobNotices)

  /**
   * 마지막으로 알림을 띄운 턴. 같은 턴에 리렌더가 여러 번 일어나도 한 번만 띄운다.
   * ref인 이유: 이 값이 바뀐다고 다시 그릴 필요가 없다(상태로 두면 무한 루프가 쉽다).
   */
  const lastTurn = useRef<string | null>(null)

  useEffect(() => {
    if (day === undefined || slot === undefined) return
    const key = `${day}-${slot}`
    if (lastTurn.current === key) return
    lastTurn.current = key
    push(selectIncoming(day, slot).filter((m) => !state || channelVisible(m.channel, state)))
    // state는 턴마다 바뀌지만 이 effect는 (day, slot)이 바뀔 때만 돈다 —
    // 같은 턴에 두 번 띄우지 않기 위해서다(lastTurn 가드와 같은 이유).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, slot, push])

  /**
   * 택배 도착. 스토어가 턴을 넘길 때 `arrivals`에 담아 주고, 띄운 뒤 비운다 —
   * 비우지 않으면 다음 리렌더에서 같은 알림이 다시 쌓인다.
   */
  useEffect(() => {
    if (!arrivals.length) return
    push(
      arrivals.map((item) => ({
        // id에 날짜를 섞어 같은 물건을 다시 사도 알림이 중복 제거에 걸리지 않게 한다.
        id: `delivery-${item.id}-${day}`,
        channel: DELIVERY_CHANNEL,
        from: '택배가 왔습니다',
        text: `${item.name} · 아이템 인벤토리에 들어갔습니다.`,
      })),
    )
    clearArrivals()
  }, [arrivals, day, push, clearArrivals])

  /**
   * 정규직 소식(서류 결과·합격·급여·경고·해고).
   *
   * ⚠️ **새 창구를 만들지 않는다** — 채널을 사서함으로 맞춰 기존 아웃룩 분기를 그대로 탄다.
   * 누르면 아웃룩이 열리고, 같은 내용이 메일에도 남는다(토스트는 지나가지만 메일은 남는다).
   */
  useEffect(() => {
    if (!jobNotices.length) return
    push(
      jobNotices.map((n) => ({ id: n.id, channel: MAILBOX.id, ...noticeMail(n) })),
    )
    clearJobNotices()
  }, [jobNotices, push, clearJobNotices])

  if (!toasts.length) return null

  return (
    /* aria-live="polite"로 스크린 리더에 알리되 초점은 빼앗지 않는다
       (ux `toast-accessibility`: 토스트는 포커스를 훔치면 안 된다). */
    <div className="toasts" role="region" aria-live="polite" aria-label="알림">
      {toasts.map((t) => {
        const delivery = t.message.channel === DELIVERY_CHANNEL
        // 채널이 채팅방이면 그 방의 앱을, 아니면 사서함이다.
        const thread = delivery ? undefined : findThread(t.message.channel)
        const app = thread ? CHAT_APPS.find((a) => a.id === thread.app) : undefined
        const title = delivery
          ? '배송 알림'
          : thread
            ? `${app?.label ?? ''} · ${thread.name}`
            : MAILBOX.label
        const icon = delivery ? DELIVERY_ICON : (app?.icon ?? MAILBOX.icon)
        return (
          <ToastCard
            key={t.id}
            title={title}
            icon={icon}
            from={t.message.from}
            text={t.message.subject ?? t.message.text}
            onOpen={() => {
              dismiss(t.id)
              // 택배 알림은 물건이 들어간 곳으로 데려간다 — 알림의 목적지는 그 물건이다.
              if (delivery) {
                open({
                  id: 'folder-inventory',
                  kind: 'folder',
                  title: '아이템 인벤토리',
                  icon: DELIVERY_ICON,
                  folderId: 'inventory',
                  x: 200,
                  y: 100,
                  width: 720,
                })
                return
              }
              // 알림을 누르면 **해당 대화창**이 바로 열린다 — 목록을 한 번 더 거치게 하면
              // "알림을 눌렀는데 왜 목록이 뜨지"가 된다. 메일은 사서함 자체가 목적지다.
              if (thread) {
                open({
                  id: `thread-${thread.id}`,
                  kind: 'thread',
                  title: thread.name,
                  icon,
                  threadId: thread.id,
                  x: 220,
                  y: 100,
                  width: 400,
                })
                return
              }
              open({
                id: 'mail-outlook',
                kind: 'mail',
                title: MAILBOX.label,
                icon: MAILBOX.icon,
                appId: MAILBOX.id,
                x: 160,
                y: 120,
                width: 660,
              })
            }}
            onDismiss={() => dismiss(t.id)}
          />
        )
      })}
    </div>
  )
}

function ToastCard({
  title,
  icon,
  from,
  text,
  onOpen,
  onDismiss,
}: {
  title: string
  icon?: string
  from: string
  text: string
  onOpen: () => void
  onDismiss: () => void
}) {
  useEffect(() => {
    const id = setTimeout(onDismiss, TOAST_MS)
    return () => clearTimeout(id)
    // onDismiss는 렌더마다 새 함수라 의존성에 넣으면 타이머가 계속 다시 걸린다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="toast">
      {/* 카드 전체가 클릭 대상이지만, 닫기 버튼이 안에 있으므로 button 중첩을 피해
          본문만 버튼으로 만든다(버튼 안의 버튼은 HTML에서 허용되지 않는다). */}
      <button type="button" className="toast-body" onClick={onOpen}>
        <span className="toast-head">
          {icon && <AppIcon name={icon} size={16} />}
          {title}
        </span>
        <span className="toast-from">{from}</span>
        <span className="toast-text">{text}</span>
      </button>
      <button type="button" className="toast-close" onClick={onDismiss} aria-label="알림 닫기">
        <span className="toast-x" aria-hidden="true" />
      </button>
    </div>
  )
}
