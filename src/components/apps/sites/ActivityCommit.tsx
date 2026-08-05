import { useState } from 'react'
import { UI_ICONS } from '../../../data/icons'
import { STAT_META } from '../../../data/statMeta'
import { AppIcon } from '../../../icons/AppIcon'
import { useGameStore } from '../../../store/gameStore'
import { useShortcutStore } from '../../../store/shortcutStore'
import { canRun } from '../../../systems/turn'
import { STAT_NAMES } from '../../../types/game'
import type { Activity } from '../../../types/game'
import { ContextMenu } from '../../ContextMenu'
import { previewActivity, previewWarnings } from '../activityPreview'
import './ActivityCommit.css'

/** 이 패널에서만 쓰는 경고 글리프. 세 종류의 경고 문구가 공유한다(ExeApp과 같은 규칙). */
const WARN_ICON = 'fluent-color:warning-24'

/**
 * 사이트의 **확정 패널** — 브라우저에서 활동을 실행하는 유일한 자리.
 *
 * ⚠️ **브라우저는 활동 실행의 세 번째 통로다**(①카톡 [만나러 가기] ②스케줄러 예약 ③여기).
 * 그래도 규칙은 그대로다: **둘러보기는 무료이고, 이 버튼 하나만 1턴을 쓴다.**
 * 사이트 본문(책 목록·상영 시간표·글감)은 게임 상태를 읽기만 하고, 스탯을 움직이는
 * 코드는 이 파일의 `doActivity` 한 줄뿐이다.
 *
 * ## 왜 사이트마다 만들지 않고 하나로 뒀나
 * 이 패널이 지는 약속이 넷이다 — ①증감 미리보기 ②번아웃 경고 ③조건 미달 경고
 * ④**오후 슬롯의 생활비 차감 경고**. 세 사이트가 각자 그리면 넷 중 하나를 빠뜨린
 * 사이트가 반드시 생기고, 그 사고는 "누르기 전에 비용을 알 수 없다"는 형태로 터진다.
 *
 * ## 왜 어느 사이트에서든 같은 밝은 카드인가
 * 시집이는 어두운 극장 톤이지만 이 패널만은 흰 카드다(실제 예매 사이트의 결제 시트와 같다).
 * **1턴을 쓰는 자리는 어느 사이트에서나 같은 모양이어야** 플레이어가 "여기가 그 자리"임을
 * 사이트를 옮겨 다니며 다시 배우지 않는다(ux `navigation-consistency`,
 * style `primary-action`: 화면당 주 CTA는 하나).
 */
export function ActivityCommit({
  activity,
  actionLabel,
  selection,
  selectionHint,
  onCommitted,
}: {
  activity: Activity
  /** 확정 버튼의 글자. 사이트마다 다르다(읽기 / 예매하기 / 발행하기). */
  actionLabel: string
  /** 고른 것의 이름. 아무것도 안 골랐으면 undefined — 그때는 버튼을 막는다. */
  selection?: string
  /** 안 골랐을 때 무엇을 하면 되는지(ux `empty-states`). */
  selectionHint: string
  onCommitted: () => void
}) {
  const state = useGameStore((s) => s.state)
  const doActivity = useGameStore((s) => s.doActivity)
  /** 이 활동의 바로 가기가 이미 바탕화면에 있는가. */
  const registered = useShortcutStore((s) => s.activityIds.includes(activity.id))
  const addShortcut = useShortcutStore((s) => s.add)
  /** 열려 있는 오른쪽 클릭 메뉴의 커서 좌표. null이면 안 열려 있다. */
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  /** 방금 등록했는가. 성공을 조용히 넘기지 않기 위한 것이다(ux `success-feedback`). */
  const [justAdded, setJustAdded] = useState(false)
  if (!state) return null

  const enough = canRun(state, activity)
  const ready = selection !== undefined
  const { rows, mentalPenalty } = previewActivity(state, activity)
  const warnings = previewWarnings(state, activity)

  return (
    <section className="ac" aria-label={`${activity.label} 확정`}>
      <header className="ac-head">
        <AppIcon name={activity.icon} size={22} />
        <div>
          <h2 className="ac-title">{activity.label}</h2>
          {/* 고른 것을 글자로 다시 적는다 — 목록에서 눌린 칸이 화면 밖으로 밀려도
              무엇을 확정하는지 버튼 옆에서 확인할 수 있어야 한다. */}
          <p className={`ac-pick${ready ? '' : ' ac-pick-empty'}`}>
            {ready ? selection : selectionHint}
          </p>
        </div>
      </header>

      <ul className="ac-effects">
        {rows.map(({ key, value }) => (
          <li key={key} className="ac-effect">
            <span className="ac-effect-label">
              <AppIcon name={STAT_META[key].icon} size={15} />
              {STAT_NAMES[key]}
            </span>
            {/* 부호를 항상 적는다 — 색만으로 증감을 전하지 않는다(ux `color-not-only`). */}
            <span className={value >= 0 ? 'ac-plus' : 'ac-minus'}>
              {value >= 0 ? '+' : ''}
              {value.toLocaleString('ko-KR')}
            </span>
          </li>
        ))}
        {mentalPenalty > 0 && (
          <li className="ac-effect">
            <span className="ac-effect-label">
              <AppIcon name={STAT_META.mental.icon} size={15} />
              {STAT_NAMES.mental} (연속 페널티)
            </span>
            <span className="ac-minus">-{mentalPenalty}</span>
          </li>
        )}
      </ul>

      {/* ⚠️ 경고 문구는 `previewWarnings` 하나가 만든다(번아웃·조건 미달·오후 생활비).
          활동을 확정하는 화면이 셋이 되면서(활동 창·여기·바탕화면 바로 가기 확인창)
          각자 적으면 한 곳만 빠뜨린 화면이 반드시 생긴다 — 그 사고는 "누르기 전에
          비용을 알 수 없다"는 형태로 터진다. */}
      {warnings.map((w) => (
        <p key={w.id} className="ac-warn">
          <AppIcon name={WARN_ICON} size={15} />
          <span>{w.text}</span>
        </p>
      ))}

      {/*
       * ⚠️ 오른쪽 클릭은 **버튼이 아니라 이 감싼 상자**가 받는다.
       * 확정 버튼은 못 고른 상태·조건 미달일 때 `disabled`인데, 비활성 버튼은
       * 마우스 이벤트를 아예 발사하지 않는다. 바로 가기를 만들고 싶은 순간은
       * 오히려 "지금은 못 하지만 자주 할 것 같다"일 때라 그때 막히면 안 된다.
       * (`.ac-btn:disabled`의 `pointer-events: none`이 판정을 이 상자로 흘려보낸다.)
       */}
      <div
        className="ac-commit"
        onContextMenu={(e) => {
          // 브라우저 기본 메뉴를 막지 않으면 그게 위에 떠서 우리 메뉴를 가린다.
          e.preventDefault()
          setMenu({ x: e.clientX, y: e.clientY })
        }}
      >
        <button
          type="button"
          className="ac-btn"
          disabled={!ready || !enough}
          onClick={() => {
            doActivity(activity)
            onCommitted()
          }}
          title={ready ? '1턴을 소모합니다' : selectionHint}
        >
          {actionLabel}
        </button>
      </div>
      <p className="ac-cost">
        <AppIcon name={UI_ICONS.turnCost} size={13} />
        1턴을 소모합니다 · 오른쪽 클릭으로 바탕화면에 등록
      </p>

      {/* ux `success-feedback`: 등록은 브라우저 창 뒤에서 일어나 눈에 안 보인다.
          글자로 알리지 않으면 "눌렀는데 아무 일도 없었다"가 된다. */}
      {justAdded && (
        <p className="ac-added" role="status">
          바탕화면에 「{activity.label}」 바로 가기를 만들었습니다.
        </p>
      )}

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          label={`${activity.label} 확정 버튼 메뉴`}
          items={[
            registered
              ? // 이미 있으면 **말해 준다**. 조용히 하나 더 만들면 같은 아이콘이 둘이 된다.
                { id: 'exists', label: '이미 바탕화면에 있습니다' }
              : {
                  id: 'add',
                  label: '바탕화면에 등록',
                  onSelect: () => {
                    addShortcut(activity.id)
                    setJustAdded(true)
                  },
                },
          ]}
          onClose={() => setMenu(null)}
        />
      )}
    </section>
  )
}
