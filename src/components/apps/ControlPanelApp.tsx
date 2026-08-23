import { useState } from 'react'
import { COLLECTION_KINDS } from '../../data/desktopIcons'
import { DESKTOP_ITEMS, desktopEntries } from '../../data/desktopItems'
import { START_MENU_ITEMS } from '../../data/startMenu'
import { SUBSCRIPTIONS } from '../../data/subscriptions'
import { AppIcon } from '../../icons/AppIcon'
import { INTERNET_PLANS, planOf } from '../../data/internet'
import { changeBlockers, daysToInternetBill } from '../../systems/internet'
import { useGameStore } from '../../store/gameStore'
import { useWindowStore } from '../../store/windowStore'
import type { DesktopEntry, DesktopItem, IconName } from '../../types/game'
/* ⚠️ **탐색기의 창틀을 그대로 입는다**(설계자 지시) — 주소 줄·탐색 창·상태 표시줄은
   `ExplorerApp.css`의 `.ex-*`가 이미 갖고 있고, 실제 윈도우에서도 제어판과 탐색기는
   같은 셸이다. 여기서 같은 모양을 다시 그리면 한쪽만 고치는 버그가 생기므로 **베끼지
   않고 빌려 쓴다**. 그래서 이 import는 장식이 아니라 의존 선언이다. */
import './ExplorerApp.css'
import './ControlPanelApp.css'

/**
 * 제어판 — **자기 상태가 없는 통로다.** 시스템 도구는 이미 시작 메뉴와 바탕화면에
 * 흩어져 있고, 여기는 그것을 한 자리에 모아 준다. 실제 윈도우 제어판이 하는 일도 그것이다.
 *
 * ⚠️ **항목을 여기 다시 적지 않는다** — 이름·아이콘·창 폭은 각 항목의 원래 자리
 * (`desktopItems`·`startMenu`)가 갖는다. 베껴 두면 이름을 고칠 때 한쪽만 낡는다.
 * ⚠️ 창 id도 바탕화면·시작 메뉴와 **같은 규칙**(`kind-id`)이다 — 어긋나면 같은 도구가
 * 두 창으로 열린다.
 *
 * ## ⚠️ 안쪽 화면은 창을 새로 띄우지 않는다
 * [프로그램 및 기능]·[사용자 계정]은 **같은 창 안에서 갈아 끼운다**(실제 제어판과 같다).
 * 창을 새로 띄우려면 `WindowKind`가 둘 더 생기는데, 둘 다 제어판 밖에서 열 자리가
 * 없어 작업 표시줄에 홀로 뜨는 창이 된다.
 *
 * ## 탐색기에서 **덜어낸 것**과 그 이유
 * ⚠️ 동작하지 않는 컨트롤은 그리지 않는다(`ExplorerApp`과 같은 규칙).
 * - **검색칸**: 제어판 홈은 타일 여섯 개고 프로그램 목록도 열 줄이 안 된다. 거를 것이
 *   없는 검색은 장식이다.
 * - **명령 모음(정렬·보기)**: 정렬 기준이 될 열이 없다(설치 날짜도 크기도 이 게임에 없다).
 */

/** 시작 메뉴에 있지만 제어판에는 없는 것 = 장난감. 도구가 아니라 놀거리다. */
const TOYS = ['solitaire', 'paint']

const TOOLS = [
  ...DESKTOP_ITEMS.filter((i) => i.id === 'settings'),
  ...START_MENU_ITEMS.filter((i) => !TOYS.includes(i.id)),
]

type View = 'home' | 'programs' | 'account' | 'network'

/** 탐색 창과 주소 줄이 **같은 표에서 나온다** — 둘이 어긋나면 지금 어디인지가 거짓이 된다. */
const VIEWS: { view: View; label: string; icon: IconName }[] = [
  { view: 'home', label: '시스템 도구', icon: 'fluent-color:toolbox-24' },
  { view: 'programs', label: '프로그램 및 기능', icon: 'fluent-color:wrench-screwdriver-24' },
  { view: 'account', label: '사용자 계정', icon: 'fluent-color:contact-card-24' },
  { view: 'network', label: '네트워크 및 인터넷', icon: 'fluent-color:globe-24' },
]

/**
 * 목록에서 빠지는 kind = **프로그램이 아닌 것**.
 * 폴더·도감은 모아 보는 것이고, `exe`는 프로그램이 아니라 활동 창이며(헬스장을 제거할
 * 수는 없다), 설정·제어판은 이 OS 자신이다(실제 제어판도 자기 자신은 목록에 안 싣는다).
 */
const NON_PROGRAM_KINDS: readonly string[] = [...COLLECTION_KINDS, 'exe', 'settings', 'controlpanel']

/**
 * 지금 이 컴퓨터에 깔려 있는 프로그램.
 *
 * ⚠️ **목록을 새로 적지 않고 바탕화면과 같은 출처에서 파생시킨다**(`desktopEntries`) —
 * 조건(구독·장비·재직)을 여기 다시 적으면 아이콘은 없는데 목록에는 있는 상태가 생긴다.
 * 플레이어가 만든 바로 가기는 프로그램이 아니라 **가리키는 것**이라 빠진다.
 */
export function installedPrograms(entries: readonly DesktopEntry[]): DesktopItem[] {
  return entries.flatMap((e) =>
    !e.shortcut && !NON_PROGRAM_KINDS.includes(e.item.kind) ? [e.item] : [],
  )
}

/** 무엇이 이 프로그램을 깔았나. 제거할 수 있는 것은 **구독이 깐 것뿐**이다. */
export function installNote(item: DesktopItem): string {
  const sub = SUBSCRIPTIONS.find((s) => s.id === item.requiresSubscription)
  if (sub) return `${sub.name} 구독으로 설치됨`
  if (item.requiresItem) return '산 장비와 함께 설치됨 — 장비를 버리지 않는 한 남습니다'
  if (item.requiresEmployment) return '회사 계정으로 설치됨 — 그만두면 사라집니다'
  if (item.requiresInstall) return '직접 내려받아 설치함'
  return '이 컴퓨터에 기본으로 설치됨'
}

export function ControlPanelApp() {
  const [view, setView] = useState<View>('home')
  const state = useGameStore((s) => s.state)

  if (!state) return null
  const programs = installedPrograms(
    desktopEntries(
      [],
      (state.inventory ?? []).map((i) => i.id),
      Boolean(state.employment),
      Object.keys(state.subscriptions?.active ?? {}),
      state.installed ?? [],
    ),
  )
  /* 상태 표시줄은 **지금 화면이 무엇을 세고 있는지**를 말한다(탐색기의 "N개 항목" 자리). */
  const status =
    view === 'programs'
      ? { count: `설치된 프로그램 ${programs.length}개`, hint: '구독으로 깔린 것만 제거할 수 있습니다.' }
      : view === 'network'
        ? {
            count: `요금제 ${INTERNET_PLANS.length}개`,
            hint: `${planOf(state).name} · 빠를수록 하는 일이 빨리 끝납니다`,
          }
        : view === 'account'
          ? { count: '사용자 계정 1개', hint: `${state.playerName} · 이 컴퓨터의 관리자` }
        : { count: `항목 ${TOOLS.length + 2}개`, hint: '이 컴퓨터의 시스템 도구입니다.' }

  return (
    <div className="ex cp">
      {/* ── 주소 줄: 경로 빵부스러기(검색칸은 없다 — 위 주석) ────── */}
      <div className="ex-bar">
        <div className="ex-crumbs">
          <AppIcon name="fluent-color:toolbox-24" size={16} />
          {['내 PC', '제어판', ...(view === 'home' ? [] : [labelOf(view)])].map((c, i, arr) => (
            <span key={c} className={i === arr.length - 1 ? 'ex-crumb ex-crumb-on' : 'ex-crumb'}>
              {c}
              {/* 구분자는 글자가 아니라 그림이다 — 스크린 리더가 "꺾쇠"를 읽지 않게 한다. */}
              <span className="ex-crumb-sep" aria-hidden="true" />
            </span>
          ))}
        </div>
      </div>

      <div className="ex-main">
        {/* 탐색 창. 항목이 셋뿐이라 트리를 접지 않는다(실제 제어판의 왼쪽 목록과 같다). */}
        <nav className="ex-nav" aria-label="탐색 창">
          <p className="ex-nav-root">
            <AppIcon name="mdi:monitor" size={16} />내 PC
          </p>
          <p className="ex-nav-group">제어판</p>
          {VIEWS.map((v) => (
            <button
              key={v.view}
              type="button"
              className={`ex-nav-item${v.view === view ? ' ex-nav-item-on' : ''}`}
              aria-current={v.view === view ? 'true' : undefined}
              onClick={() => setView(v.view)}
            >
              <AppIcon name={v.icon} size={16} />
              {v.label}
            </button>
          ))}
        </nav>

        <div className="ex-files">
          {view === 'home' ? (
            <HomePanel onOpenPanel={setView} />
          ) : view === 'programs' ? (
            <ProgramsPanel programs={programs} />
          ) : view === 'network' ? (
            <NetworkPanel />
          ) : (
            <AccountPanel />
          )}
        </div>
      </div>

      {/* 상태 표시줄. 왼쪽은 탐색기와 같은 항목 수, 오른쪽은 지금 화면의 한 줄 설명이다. */}
      <footer className="ex-status">
        <span className="ex-count">{status.count}</span>
        <span className="ex-status-hint">{status.hint}</span>
      </footer>
    </div>
  )
}

const labelOf = (view: View) => VIEWS.find((v) => v.view === view)?.label ?? '제어판'

/** 제어판 홈 — 큰 아이콘 타일. 도구는 창을 열고, 안쪽 화면은 이 창 안에서 바뀐다. */
function HomePanel({ onOpenPanel }: { onOpenPanel: (view: View) => void }) {
  const open = useWindowStore((s) => s.open)

  return (
    <ul className="cp-grid">
      {TOOLS.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            className="cp-item"
            onClick={() =>
              open({
                id: `${item.kind}-${item.id}`,
                kind: item.kind,
                title: item.label,
                icon: item.icon,
                width: item.width,
              })
            }
          >
            <AppIcon name={item.icon} size={32} />
            <span className="cp-label">{item.label}</span>
          </button>
        </li>
      ))}
      {/* 홈에도 타일로 둔다 — 탐색 창과 겹치지만 실제 제어판이 그렇고, 창이 좁아 탐색
          창이 눌리는 자리에서도 안쪽 화면으로 가는 길이 남는다. */}
      {VIEWS.filter((v) => v.view !== 'home').map((v) => (
        <li key={v.view}>
          <button type="button" className="cp-item" onClick={() => onOpenPanel(v.view)}>
            <AppIcon name={v.icon} size={32} />
            <span className="cp-label">{v.label}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

/**
 * 프로그램 및 기능.
 *
 * ⚠️ **[제거]는 구독 프로그램에만 붙는다** — 이 게임에서 프로그램을 지운다는 것은 곧
 * **구독 해지**이고(설정의 해지와 같은 함수를 지난다), 기본 프로그램·장비가 깐 프로그램은
 * 지울 대상이 아니다. 누를 수 없는 버튼을 회색으로 그리지 않고 아예 안 그린다
 * (동작하지 않는 컨트롤은 만들지 않는다는 이 리포의 규칙).
 */
function ProgramsPanel({ programs }: { programs: readonly DesktopItem[] }) {
  const unsubscribeFrom = useGameStore((s) => s.unsubscribeFrom)
  /* 제거를 되돌리려면 가입비를 다시 내야 한다 — 한 단계 묻는다(ux `confirmation-dialogs`). */
  const [confirming, setConfirming] = useState<string | null>(null)

  return (
    <ul className="cp-list">
      {programs.map((item) => (
        <li key={item.id} className="cp-row">
          <AppIcon name={item.icon} size={26} />
          <span className="cp-row-body">
            <span className="cp-row-name">{item.label}</span>
            <span className="cp-row-note">{installNote(item)}</span>
          </span>
          {item.requiresSubscription && (
            <span className="cp-row-act">
              {confirming === item.id ? (
                <>
                  <span className="cp-ask">구독이 해지되고 같이 깔린 것도 사라집니다</span>
                  <button
                    type="button"
                    className="cp-btn cp-btn-go"
                    onClick={() => {
                      unsubscribeFrom(item.requiresSubscription!)
                      setConfirming(null)
                    }}
                  >
                    제거
                  </button>
                  <button type="button" className="cp-btn" onClick={() => setConfirming(null)}>
                    취소
                  </button>
                </>
              ) : (
                <button type="button" className="cp-btn" onClick={() => setConfirming(item.id)}>
                  제거
                </button>
              )}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

/**
 * 사용자 계정 — 지금 할 수 있는 것은 **이름 바꾸기 하나**다.
 * ⚠️ 잠금화면과 **같은 제한**(12자·앞뒤 공백 제거)을 쓴다. 여기만 느슨하면 명령 프롬프트
 * 경로·트위터 핸들처럼 이름이 들어가는 자리가 깨진다.
 */
function AccountPanel() {
  const state = useGameStore((s) => s.state)
  const renamePlayer = useGameStore((s) => s.renamePlayer)
  const [draft, setDraft] = useState(state?.playerName ?? '')
  const [done, setDone] = useState(false)

  if (!state) return null
  const trimmed = draft.trim()

  return (
    <div className="cp-account-panel">
      <div className="cp-account">
        <span className="cp-avatar" aria-hidden="true">
          {state.playerName.slice(0, 1)}
        </span>
        <span className="cp-row-body">
          <span className="cp-row-name">{state.playerName}</span>
          <span className="cp-row-note">이 컴퓨터의 관리자 · {state.day}일차 사용 중</span>
        </span>
      </div>

      <label className="cp-field-label" htmlFor="cp-name">
        계정 이름
      </label>
      <div className="cp-field">
        <input
          id="cp-name"
          className="cp-input"
          value={draft}
          maxLength={12}
          onChange={(e) => {
            setDraft(e.target.value)
            setDone(false)
          }}
        />
        <button
          type="button"
          className="cp-btn cp-btn-go"
          disabled={!trimmed || trimmed === state.playerName}
          onClick={() => {
            renamePlayer(trimmed)
            setDone(true)
          }}
        >
          이름 바꾸기
        </button>
      </div>
      {/* role="status"로 두면 스크린 리더가 결과를 읽어 준다(ux `aria-live-errors`). */}
      <p className="cp-note" role="status">
        {done
          ? '이름을 바꿨습니다. 잠금화면·시작 메뉴·명령 프롬프트 경로에 함께 반영됩니다.'
          : '바꾼 이름은 이 컴퓨터가 당신을 부르는 모든 자리에 쓰입니다.'}
      </p>
    </div>
  )
}

/**
 * 네트워크 및 인터넷 — **요금제를 고른다**(2026-08-22 설계자 지시).
 *
 * ⚠️ **이 게임에서 돈으로 시간을 사는 유일한 자리다**(`data/internet.ts`). 그래서 카드마다
 * "활동 시간 −10%"를 **숫자로 적는다** — 속도(1Gbps)는 분위기이지 규칙이 아니다.
 *
 * ⚠️ **턴을 쓰지 않는다**(전화 한 통이다 — 은행 거래와 같은 부류). 대신 첫 달 요금을
 * 그 자리에서 낸다. 못 고르는 이유는 `changeBlockers`가 글자로 만든다(두 번째 판정 금지).
 */
function NetworkPanel() {
  const state = useGameStore((s) => s.state)!
  const setPlan = useGameStore((s) => s.setInternetPlan)
  const current = planOf(state)
  const left = daysToInternetBill(state)

  return (
    <div className="cp-net">
      <p className="cp-net-now">
        지금 회선 <b>{current.name}</b> · {current.speed}
        {left !== undefined && <span className="cp-net-due"> · 다음 청구 {left}일 뒤</span>}
        {state.internet?.downgraded && (
          <span className="cp-net-warn"> · 요금 미납으로 기본 회선으로 내려왔습니다</span>
        )}
      </p>
      <ul className="cp-list">
        {INTERNET_PLANS.map((plan) => {
          const mine = plan.id === current.id
          const blocked = changeBlockers(state, plan.id)
          return (
            <li key={plan.id} className={`cp-row${mine ? ' cp-row-on' : ''}`}>
              <AppIcon name="fluent-color:globe-24" size={26} />
              <span className="cp-row-body">
                <span className="cp-row-name">
                  {plan.name} <span className="cp-net-speed">{plan.speed}</span>
                </span>
                <span className="cp-row-note">{plan.desc}</span>
                {/* 색·크기가 아니라 **글자**가 규칙을 말한다(ux `color-not-only`). */}
                <span className="cp-net-terms">
                  월 {plan.monthly.toLocaleString('ko-KR')}원 · 활동 시간{' '}
                  {plan.timeFactor === 1
                    ? '기준'
                    : `−${Math.round((1 - plan.timeFactor) * 100)}%`}
                </span>
              </span>
              <span className="cp-row-act">
                {mine ? (
                  <span className="cp-net-using">사용 중</span>
                ) : (
                  <button
                    type="button"
                    className="cp-btn"
                    onClick={() => setPlan(plan.id)}
                    disabled={blocked.length > 0}
                    title={blocked[0]}
                  >
                    이 요금제로
                  </button>
                )}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
