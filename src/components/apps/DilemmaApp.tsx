import { choiceEffectText, dilemmaDue, dilemmaToday } from '../../systems/chance'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import './DilemmaApp.css'

/**
 * 아침 딜레마 창 — **길고양이 만남 창(`CatApp`)과 같은 판형이다.**
 *
 * ## 왜 활동 창이 아닌가
 * 갈림길은 플레이어가 고른 행동이 아니라 **일어난 일**이다. 턴을 먹으면 사건이 곧
 * 벌금이 된다 — 그래서 고르는 창이고 턴을 쓰지 않는다(고양이·소원과 같은 판단).
 *
 * ## ⚠️ 닫기만 하면 아무것도 세지 않는다
 * 결정만 커서(`dilemmaDecidedDay`)를 찍는다. 안 고르고 닫으면 그날 안에는 다시 뜨고,
 * 날이 지나면 그 갈림길은 그냥 지나간 것이다(`CatApp`의 `decidedDay` 규칙 그대로).
 *
 * ## ⚠️ 버튼 둘에는 효과를 글자로 적는다
 * 스케줄러 고르기 판의 증감 칩과 같은 원칙(숨은 비용 금지) — 문장은 `choiceEffectText`가
 * `effects`에서 파생하므로 여기 다시 적지 않는다. 판정·클램프는 전부 `systems/chance.ts`.
 */
export function DilemmaApp({ onClose }: { onClose: () => void }) {
  const state = useGameStore((s) => s.state)
  const resolveDilemma = useGameStore((s) => s.resolveDilemma)

  if (!state) return null
  /* 결정한 뒤에도 창이 남아 있을 수 있다(창은 상태를 모른다) — 그때는 마무리 문장만 남긴다. */
  const event = dilemmaToday(state)
  const due = !!event && dilemmaDue(state)

  return (
    <div className="dl">
      <p className="dl-lead">
        <AppIcon name="fluent-color:question-circle-24" size={22} />
        {due ? event.text : '마음을 정했다. 오늘 하루가 이어진다.'}
      </p>
      {due && (
        <div className="dl-actions">
          {event.choices?.map((choice, i) => (
            <button
              key={choice.label}
              type="button"
              className="dl-btn"
              onClick={() => {
                resolveDilemma(i)
                onClose()
              }}
            >
              <span className="dl-btn-label">{choice.label}</span>
              <span className="dl-btn-effect">{choiceEffectText(choice)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
