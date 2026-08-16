import { useState } from 'react'
import { AppIcon } from '../../icons/AppIcon'
import { findChatApp, findThread } from '../../data/messages'
import { findActivity } from '../../data/activities'
import { personOfThread, AFFECTION_FOR_ENDING, AFFECTION_PER_MEET } from '../../data/relations'
import { affectionOf } from '../../systems/affection'
import { findItem } from '../../data/items'
import { useGameStore } from '../../store/gameStore'
import { useWindowStore } from '../../store/windowStore'
import { canOrder, owns } from '../../systems/delivery'
import { canRun, growthCap } from '../../systems/turn'
import {
  channelVisible,
  lastMessage,
  selectChannel,
  selectIncoming,
  visibleThreadsOf,
} from '../../systems/messages'
import { weekendCallMessages } from '../../systems/drive'
import { rankEventMessages } from '../../systems/rankEvents'
import { webtoonReviewMessages } from '../../systems/webtoon'
import { offerUnlockedByRank } from '../../systems/rankEvents'
import { findMaster, giftAmount, seenMaster, masterMessages, MASTER_MENTAL } from '../../systems/masters'
import { STAT_NAMES } from '../../types/game'
import type { GameState, Stats } from '../../types/game'
import './ChatApp.css'

/**
 * 목록 창의 레일·헤더 글리프.
 *
 * 셸 컨트롤이므로 **단색**(`mdi`)이다 — 정체성을 가진 대상만 컬러라는 규칙 그대로다.
 * 이 창 안에서만 쓰는 장식이라 `data/icons.ts`에 올리지 않는다.
 */
const RAIL_ICONS = {
  me: 'mdi:account',
  chat: 'mdi:chat',
  openChat: 'mdi:chat-processing-outline',
  more: 'mdi:dots-horizontal',
  emoji: 'mdi:emoticon-outline',
  bell: 'mdi:bell-outline',
  gear: 'mdi:cog-outline',
  caret: 'mdi:menu-down',
  phone: 'mdi:phone-outline',
  video: 'mdi:video-outline',
  menu: 'mdi:menu',
  plus: 'mdi:plus',
  file: 'mdi:file-outline',
  at: 'mdi:at',
  tune: 'mdi:tune-variant',
  folder: 'mdi:folder-outline',
  mail: 'mdi:email-outline',
  gift: 'mdi:gift-outline',
  search: 'mdi:magnify',
  chatOutline: 'mdi:chat-outline',
  chatPlus: 'mdi:chat-plus-outline',
} as const

/**
 * 메신저 **목록 창**. 레퍼런스(카톡 PC / 네이트온)의 골격을 그대로 따른다:
 *
 *   [세로 아이콘 레일] [목록 패널: 헤더 "채팅 ▾" · 검색 · 필터 칩 · 방 목록]
 *
 * ⚠️ 예전에는 방 목록만 덩그러니 그렸다. 레일·헤더·필터는 장식이 아니라 **골격**이라,
 * 빼면 "메신저 앱"이 아니라 "목록 하나"가 된다. 그래서 형태를 먼저 세우고,
 * 그 안의 컨트롤은 **실제로 동작하는 것만** 채운다(필터 칩은 진짜로 거른다).
 *
 * 카톡과 너아무튼온이 같은 컴포넌트를 쓴다 — 앱 id로 분기하지 않고 데이터가 목록을 준다.
 *
 * ⚠️ **읽는 것은 무료다.** 목록도 대화도 턴을 쓰지 않는다.
 */

/**
 * **편성표에 없는 메시지 전부.** 상태에서 파생되는 사실이라 (day, slot)만으로는 만들 수
 * 없는 말들이다(주말 호출 · 웹툰 회차 반응 · 랭크 이벤트 권유).
 *
 * ⚠️ **목록 미리보기와 대화창 두 곳이 같은 함수를 본다.** 예전에는 같은 배열을 두 번 적어
 * 두었는데, 원천이 셋으로 늘면서 한쪽만 고치면 **목록에는 안 뜨는데 방에 들어가면 있는**
 * 말이 생긴다. 원천을 늘릴 자리는 여기 하나다.
 */
function derivedMessages(state: GameState) {
  return [
    ...weekendCallMessages(state),
    ...webtoonReviewMessages(state),
    ...rankEventMessages(state),
    ...masterMessages(state),
  ]
}

export function ChatListApp({ appId }: { appId: string }) {
  const state = useGameStore((s) => s.state)
  const open = useWindowStore((s) => s.open)
  const app = findChatApp(appId)
  /** 필터 칩. '안읽음'은 **이번 턴에 새로 온 메시지가 있는 방**을 뜻한다. */
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  /**
   * 레일 탭. 일반 채팅과 오픈채팅을 **가른다**(설계자 지시) — 실제 카톡도 레일에서
   * 나뉘어 있다. 지인 방과 모르는 사람들의 방은 성격이 달라 한 목록에 섞이면
   * "누구한테서 온 건가"를 매번 다시 읽어야 한다.
   */
  const [tab, setTab] = useState<'chat' | 'open'>('chat')

  if (!state || !app) return null

  /* ⚠️ 조건을 만족한 방만 본다 — 첫 판의 카톡 목록은 오픈채팅 둘뿐이고,
     너아무튼온은 취직해야 방이 생긴다(판정은 `threadVisible` 하나). */
  const allThreads = visibleThreadsOf(app.id, state)
  const threads = allThreads.filter((t) => (tab === 'open' ? t.open : !t.open))
  /** 오픈채팅이 하나도 없는 앱(너아무튼온)은 탭 자체를 만들지 않는다. */
  const hasOpen = allThreads.some((t) => t.open)
  // 이번 턴 도착분 = 아직 안 본 것으로 친다. 읽음 상태를 따로 저장하지 않는 이유는
  // 메시지 자체를 저장하지 않는 것과 같다 — (day, slot)이면 언제든 다시 계산된다.
  const freshChannels = new Set(
    selectIncoming(state.day, state.slot)
      .filter((m) => channelVisible(m.channel, state))
      .map((m) => m.channel),
  )
  const unreadCount = threads.filter((t) => freshChannels.has(t.id)).length
  const shown = filter === 'unread' ? threads.filter((t) => freshChannels.has(t.id)) : threads

  const openThread = (id: string, name: string) =>
    open({
      // 방 id를 창 id로 쓰면 같은 방이 두 번 열리지 않고 기존 창이 앞으로 온다.
      id: `thread-${id}`,
      kind: 'thread',
      title: name,
      icon: app.icon,
      threadId: id,
      x: 240,
      y: 110,
      width: 400,
    })

  return (
    <div className={`chat-app chat-tone-${app.tone} chat-layout-${app.layout}`}>
      {/*
        세로 레일. 레퍼런스 그대로 **밝은 회색 바탕에 어두운 글리프**이고,
        위 묶음(프로필·채팅·더보기)과 아래 묶음(이모티콘·알림·설정)이 갈려 있다.
        ⚠️ 아래 묶음은 아직 열 화면이 없어 **버튼이 아니라 표시**다 — 버튼으로 만들어 두고
        아무 일도 안 하는 것보다, 지금은 골격만 세워 두고 화면이 생기면 버튼으로 바꾼다.
      */}
      <nav className="chat-rail" aria-label="메뉴">
        <div className="chat-rail-group">
          {app.layout === 'titled' && (
            <span className="chat-rail-me" title={state.playerName}>
              <AppIcon name={RAIL_ICONS.me} size={26} />
            </span>
          )}
          <button
            type="button"
            className={`chat-rail-tab${tab === 'chat' ? ' chat-rail-tab-on' : ''}`}
            aria-current={tab === 'chat' ? 'true' : undefined}
            title="채팅"
            onClick={() => setTab('chat')}
          >
            <AppIcon name={RAIL_ICONS.chat} size={26} />
            {unreadCount > 0 && <span className="chat-rail-badge">{unreadCount}</span>}
          </button>
          {hasOpen && (
            <button
              type="button"
              className={`chat-rail-tab${tab === 'open' ? ' chat-rail-tab-on' : ''}`}
              aria-current={tab === 'open' ? 'true' : undefined}
              title="오픈채팅"
              onClick={() => setTab('open')}
            >
              <AppIcon name={RAIL_ICONS.openChat} size={26} />
            </button>
          )}
          {/* 네이트온 레퍼런스의 레일은 항목이 훨씬 길다 — 앱의 인상이 여기서 갈린다. */}
          {app.layout === 'plain' && (
            <>
              <span className="chat-rail-tab" title="자료함">
                <AppIcon name={RAIL_ICONS.folder} size={24} />
              </span>
              <span className="chat-rail-tab" title="메일">
                <AppIcon name={RAIL_ICONS.mail} size={24} />
              </span>
              <span className="chat-rail-tab" title="선물함">
                <AppIcon name={RAIL_ICONS.gift} size={24} />
              </span>
            </>
          )}
          <span className="chat-rail-tab" title="더보기">
            <AppIcon name={RAIL_ICONS.more} size={26} />
          </span>
        </div>
        <div className="chat-rail-group">
          {app.layout === 'titled' && (
            <span className="chat-rail-tab" title="이모티콘">
              <AppIcon name={RAIL_ICONS.emoji} size={22} />
            </span>
          )}
          <span className="chat-rail-tab" title="알림">
            <AppIcon name={RAIL_ICONS.bell} size={22} />
          </span>
          <span className="chat-rail-tab" title="설정">
            <AppIcon name={app.layout === 'plain' ? RAIL_ICONS.menu : RAIL_ICONS.gear} size={22} />
          </span>
        </div>
      </nav>

      <div className="chat-panel">
        {app.layout === 'titled' ? (
          <>
            <header className="chat-panel-head">
              <h3 className="chat-panel-title">
                {tab === 'open' ? '오픈채팅' : '채팅'}
                <AppIcon name={RAIL_ICONS.caret} size={20} className="chat-panel-caret" />
              </h3>
              <span className="chat-panel-tools" aria-hidden="true">
                <AppIcon name={RAIL_ICONS.search} size={22} />
                <AppIcon name={RAIL_ICONS.chatOutline} size={22} />
                <AppIcon name={RAIL_ICONS.chatPlus} size={22} />
              </span>
            </header>

            {/* 필터 칩. 둘 다 실제로 목록을 거른다.
                레퍼런스의 [ChatGPT]·[+] 칩은 넣지 않았다 — 전자는 남의 브랜드고
                후자는 만들 방이 없어 눌러도 아무 일이 없다. */}
            <div className="chat-filters">
              <button
                type="button"
                className={`chat-chip${filter === 'all' ? ' chat-chip-on' : ''}`}
                aria-pressed={filter === 'all'}
                onClick={() => setFilter('all')}
              >
                전체
              </button>
              <button
                type="button"
                className={`chat-chip${filter === 'unread' ? ' chat-chip-on' : ''}`}
                aria-pressed={filter === 'unread'}
                onClick={() => setFilter('unread')}
              >
                <AppIcon name={RAIL_ICONS.chat} size={16} className="chat-chip-icon" />
                안읽음
                {unreadCount > 0 && <span className="chat-chip-badge">{unreadCount}</span>}
              </button>
            </div>
          </>
        ) : (
          /* 제목도 칩도 없이 도구 글리프 줄만 — 레퍼런스(네이트온) 그대로다.
             검색이 왼쪽, 나머지가 오른쪽으로 갈린다. */
          <header className="chat-panel-head chat-panel-head-plain">
            <span className="chat-panel-tools" aria-hidden="true">
              <AppIcon name={RAIL_ICONS.search} size={22} />
            </span>
            <span className="chat-panel-tools" aria-hidden="true">
              <AppIcon name={RAIL_ICONS.at} size={22} />
              <AppIcon name={RAIL_ICONS.chatPlus} size={22} />
              <AppIcon name={RAIL_ICONS.tune} size={22} />
            </span>
          </header>
        )}

        <ul className="chat-rows">
          {shown.length === 0 && (
            /*
             * ⚠️ **첫 판에는 이 자리가 기본 화면이다**(카톡 일반 탭·너아무튼온 모두 비어 있다).
             * "대화방이 없습니다" 한 줄이면 고장으로 읽히므로 **무엇을 하면 생기는지**까지
             * 적는다(ux `empty-states` — 알바몬·벼룩장터의 빈 목록과 같은 규칙).
             */
            <li className="chat-rows-empty">
              {filter === 'unread'
                ? '새 메시지가 없습니다.'
                : app.id === 'nateon'
                  ? '업무용 메신저입니다. 회사에 들어가면 팀 대화방이 열립니다.'
                  : tab === 'open'
                    ? '참여 중인 오픈채팅이 없습니다.'
                    : '아직 연락이 닿는 사람이 없습니다. 사람들과 어울리다 보면 하나씩 생깁니다.'}
            </li>
          )}
          {shown.map((t) => {
            const derived = derivedMessages(state).find((m) => m.channel === t.id)
            const last = derived
              ? { ...derived, time: '방금', turn: Number.MAX_SAFE_INTEGER }
              : lastMessage(t.id, state.day, state.slot)
            const fresh = freshChannels.has(t.id)
            return (
              <li key={t.id}>
                <button type="button" className="chat-row" onClick={() => openThread(t.id, t.name)}>
                  {/* 프로필 사진 자리. 사진이 없어 이름 첫 글자 타일을 둔다. */}
                  <span className="chat-avatar" aria-hidden="true">
                    {t.name.slice(0, 1)}
                  </span>
                  <span className="chat-row-body">
                    <span className="chat-row-name">
                      {/* 탭이 이미 갈라 주므로 라벨은 '전체' 탭이 생길 때만 의미가 있다.
                          지금은 탭으로 충분해 라벨을 붙이지 않는다. */}
                      {t.name}
                      {t.members > 1 && <span className="chat-row-count">{t.members}</span>}
                    </span>
                    <span className="chat-row-preview">
                      {last ? last.text : '아직 대화가 없습니다.'}
                    </span>
                  </span>
                  {/* 오른쪽 열: 시각 위, 안 읽은 수 아래 — 레퍼런스와 같은 배치다. */}
                  <span className="chat-row-side">
                    {last && <span className="chat-row-time">{last.time}</span>}
                    {fresh && <span className="chat-row-badge">1</span>}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

/**
 * 대화창. 골격: **헤더 → 날짜 구분선이 들어간 대화 → 확정 행동**.
 *
 * ⚠️ 메시지 입력창은 **없다**(설계자 지시). 그 자리에 [만나러 가기]가 들어간다 —
 * 대화는 게임이 말을 거는 창구이지 플레이어가 답하는 곳이 아니고, 답장으로 스탯이
 * 움직이면 "확정 행동만 턴을 쓴다"는 규칙이 무너진다.
 * 그 버튼은 기존 `social` 활동을 그대로 실행한다 — 수치를 여기에 다시 적으면
 * 밸런스 테스트가 못 보는 두 번째 출처가 생긴다.
 */
export function ChatThreadApp({ threadId, onDone }: { threadId: string; onDone: () => void }) {
  const state = useGameStore((s) => s.state)
  const doActivity = useGameStore((s) => s.doActivity)
  const thread = findThread(threadId)
  /* ⚠️ **하드코딩(`threadId === 'minji'`)을 걷어냈다** — [만나러 가기]가 뜨는 방과 그
     활동은 이제 `data/relations.ts`의 인물이 갖는다. 여기서 방 id를 나열하면 사람이 늘 때
     이 줄과 관계 데이터가 갈라지고, 한쪽만 고쳐도 아무 테스트가 안 터진다. */
  const person = personOfThread(threadId)
  const meetup = person ? findActivity(person.activityId) : undefined
  /* ⚠️ **방 id가 곧 스승 id다**(`MASTER_THREADS`가 그렇게 파생된다) — 그래서 방 목록을
     여기서 다시 나열하지 않고 한 번 물어보는 것으로 끝난다. */
  const master = findMaster(threadId)
  const acceptOffer = useGameStore((s) => s.acceptOffer)
  const receiveMasterGift = useGameStore((s) => s.receiveMasterGift)

  if (!state || !thread) return null

  /* ⚠️ **주말 호출은 편성표에 없다** — 상태에서 파생되는 사실이라 (day, slot)만으로는
     만들 수 없다(`MailApp`이 `examMessages`를 합치는 것과 같은 자리). */
  const messages = [
    ...selectChannel(thread.id, state.day, state.slot),
    ...derivedMessages(state)
      .filter((m) => m.channel === thread.id)
      .map((m) => ({ ...m, time: '방금', turn: Number.MAX_SAFE_INTEGER })),
  ]
  const canMeet = meetup ? canRun(state, meetup) : false
  const affection = person ? affectionOf(state, person.id) : 0
  const tone = findChatApp(thread.app)?.tone ?? 'warm'
  const gift = master ? findItem(master.gift) : undefined
  const got = master ? seenMaster(state, master.id) : false
  /* ⚠️ **상한에서 잘리는 몫까지 반영한다** — A에 닿은 스탯이라 상한 근처면 실제로 잘리고,
     그 사실을 안 적으면 카드가 거짓 숫자를 말한다(별똥별 미리보기와 같은 규칙). */
  const giftGain = master
    ? Math.min(growthCap(master.key), state.stats[master.key] + giftAmount(master.key)) -
      state.stats[master.key]
    : 0

  return (
    <div className={`chat chat-tone-${tone}`}>
      <header className="chat-head">
        <span className="chat-avatar" aria-hidden="true">
          {thread.name.slice(0, 1)}
        </span>
        <span className="chat-head-body">
          <span className="chat-peer">{thread.name}</span>
          {thread.members > 1 && (
            <span className="chat-members">
              <AppIcon name={RAIL_ICONS.me} size={14} />
              {thread.members}
            </span>
          )}
        </span>
        {/* 오른쪽 도구 글리프. 아직 열 화면이 없어 버튼이 아니라 표시다 —
            버튼으로 만들어 두고 아무 일도 안 하는 것보다 낫다. */}
        <span className="chat-head-tools" aria-hidden="true">
          <AppIcon name={RAIL_ICONS.search} size={22} />
          <AppIcon name={RAIL_ICONS.phone} size={22} />
          <AppIcon name={RAIL_ICONS.video} size={22} />
          <AppIcon name={RAIL_ICONS.menu} size={22} />
        </span>
      </header>

      <ol className="chat-thread">
        {messages.length === 0 && <li className="chat-empty">아직 온 메시지가 없습니다.</li>}
        {messages.map((m, i) => (
          <li key={m.id} className="chat-line">
            {/* 날짜 구분선. 레퍼런스에도 있고, 우리에게도 "며칠 전 대화"라는 실제 정보다.
                오전 메시지 앞에서만 넣는다 — 슬롯이 아니라 날이 바뀌는 자리다. */}
            {(i === 0 || m.time.startsWith('오전') !== messages[i - 1].time.startsWith('오전')) &&
              m.time.startsWith('오전') && <span className="chat-date">이전 대화</span>}
            <span className="chat-row-line">
              <span className="chat-avatar chat-avatar-sm" aria-hidden="true">
                {m.from.slice(0, 1)}
              </span>
              <span className="chat-line-body">
                <span className="chat-from">{m.from}</span>
                <span className="chat-bubble-row">
                  <span className="chat-bubble">{m.text}</span>
                  <span className="chat-time">{m.time}</span>
                </span>
              </span>
            </span>
          </li>
        ))}
      </ol>

      {/*
        오픈채팅의 제안. 데이터(`Thread.offer`)가 문구·금액·활동을 전부 들고 있고
        여기서는 그리기만 한다 — 컴포넌트에 금액을 적으면 밸런스가 두 곳으로 갈라진다.
      */}
      {thread.offer && (
        <div className="chat-action">
          <p className="chat-offer-q">{thread.offer.question}</p>
          {thread.offer.options
            /* ⚠️ **랭크로 열리는 선택지는 겪은 뒤에만 그린다**(`undefined` = 랭크와 무관한
               기존 선택지라 그대로 통과). 안 열린 것을 흐리게라도 그리면 "왜 못 누르는가"를
               설명할 자리가 없다 — 조건이 등급이라 문장으로 적을 수도 없다. */
            .filter((opt) => offerUnlockedByRank(state, opt.id) !== false)
            .map((opt) => {
            const activity = opt.activityId ? findActivity(opt.activityId) : undefined
            const item = opt.itemId ? findItem(opt.itemId) : undefined
            // 즉시 활동은 조건을, 주문은 주문 가능 여부를, 결제는 잔액을 본다.
            // ⚠️ **이미 가진 물건이면 막지 않는다** — 결제 없이 주간 예약만 다시 걸린다.
            const blocked = activity
              ? !canRun(state, activity)
              : item
                ? !owns(state, item.id) && !canOrder(state, item)
                : opt.cost !== undefined && state.stats.money < opt.cost
            return (
              <button
                key={opt.id}
                className="chat-offer"
                disabled={blocked}
                onClick={() => acceptOffer(opt)}
                title={blocked ? '행동력이나 소지금이 부족합니다' : opt.desc}
              >
                <span className="chat-offer-label">{opt.label}</span>
                <span className="chat-offer-desc">{opt.desc}</span>
              </button>
            )
          })}
        </div>
      )}

      {/*
        카톡 선물하기. **스승의 방에만 뜬다.**
        ⚠️ **받기 전과 받은 뒤 둘 다 그린다** — 받고 나면 사라지게 두면 "무엇을 받았더라"에
        답할 자리가 없어진다(실제 카톡 선물함도 받은 뒤 기록이 남는다).
        ⚠️ **무엇이 오르는지 미리 다 적는다.** 숨긴 채 [받기]만 두면 그 버튼이 도박이 된다.
      */}
      {master && gift && (
        <div className="chat-action">
          <div className="chat-gift">
            <AppIcon name={master.icon} size={34} />
            <span className="chat-gift-body">
              <span className="chat-gift-label">선물이 도착했습니다</span>
              <span className="chat-gift-name">{gift.name}</span>
              <span className="chat-gift-desc">{gift.desc}</span>
            </span>
          </div>
          {got ? (
            /* 받은 뒤. 버튼이 아니라 사실이라 `role="status"`로 남긴다. */
            <p className="chat-gift-done" role="status">
              선물을 받았습니다 · {STAT_NAMES[master.key]} +{giftGain} · 멘탈 +{MASTER_MENTAL}
            </p>
          ) : (
            <button className="chat-offer" onClick={() => receiveMasterGift(master.id)}>
              <span className="chat-offer-label">선물 받기</span>
              <span className="chat-offer-desc">
                {STAT_NAMES[master.key]} +{giftGain} · 멘탈 +{MASTER_MENTAL} · {gift.name}
              </span>
            </button>
          )}
        </div>
      )}

      {meetup && (
        <div className="chat-action">
          <ul className="chat-effects">
            {(Object.entries(meetup.effects) as [keyof Stats, number][]).map(([key, value]) => (
              <li key={key}>
                {STAT_NAMES[key]}
                <b className={value > 0 ? 'chat-plus' : 'chat-minus'}>
                  {value > 0 ? '+' : ''}
                  {value.toLocaleString('ko-KR')}
                </b>
              </li>
            ))}
          </ul>
          {/* ⚠️ 호감도는 **얼마나 남았는지까지** 적는다(ux `error-clarity`의 형태판 —
              숫자만 보여 주면 문턱이 몇인지 알 수 없다). 문턱을 넘긴 뒤에는 그 사실만 말한다:
              부가엔딩의 내용은 엔딩에서 처음 읽혀야 하므로 여기서 미리 말하지 않는다. */}
          <p className="chat-affection">
            {person!.name}와의 관계 {affection}/{AFFECTION_FOR_ENDING}
            {affection >= AFFECTION_FOR_ENDING
              ? ' · 충분히 가까워졌습니다'
              : ` · ${Math.ceil((AFFECTION_FOR_ENDING - affection) / AFFECTION_PER_MEET)}번 더`}
          </p>
          <button
            className="chat-btn"
            onClick={() => {
              doActivity(meetup)
              onDone()
            }}
            disabled={!canMeet}
            title={canMeet ? '1턴을 소모합니다' : '행동력이나 소지금이 부족합니다'}
          >
            만나러 가기
          </button>
          {/* "1턴 소모" 문구는 설계자 지시로 뺐다. 오후 슬롯에서 하루가 끝난다는 경고는
              생활비가 빠져나가는 시점이라 정보 가치가 있어 남긴다. */}
          {state.slot === 'afternoon' && <p className="chat-note">하루가 끝납니다</p>}
        </div>
      )}
    </div>
  )
}
