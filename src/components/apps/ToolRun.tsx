import { useEffect, useId, useState } from 'react'
import { TOOL_NAMES, findGig } from '../../data/gigs'
import { runSceneOf } from '../../data/runScenes'
import { STAT_META } from '../../data/statMeta'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import { useWindowStore } from '../../store/windowStore'
import { activeContract, gigsOf } from '../../systems/gigs'
import { MENTAL_CAP, STAMINA_CAP, growthCap } from '../../systems/turn'
import { GROWTH_STAT_KEYS, STAT_NAMES } from '../../types/game'
import { rankOf } from '../../systems/rank'
import { previewActivity } from './activityPreview'
import type {
  Activity,
  GameState,
  GigContract,
  IconName,
  ToolId,
  ToolRunPayload,
} from '../../types/game'
import './ToolRun.css'

/**
 * 도구 앱이 **돌아가는 창** — 포토샵·프리미어·VS 코드(`WindowKind: 'tool'`).
 *
 * ## 왜 이 창이 있는가
 * 설계자 지시: "실행하면 해당 프로그램이 작동하는 것처럼 보이다가 결과값 팝업이 뜨게."
 * 도구를 켜는 것은 **일하는 시간 그 자체**(1턴)인데, 여태 활동 창의 [실행하기]가 곧바로
 * 창을 닫아 아무 일도 안 일어난 것처럼 보였다. 그 사이를 이 창이 채운다.
 *
 * ## ⚠️ 활동 창과 **별개의 단독 창이다**(설계자 지시)
 * 활동 창(`ExeApp`)은 "할까요?"를 묻고 대가를 보여 주는 **팝업**이고, 이 창은 **프로그램
 * 그 자체**다. 그래서 [실행하기]를 누르면 팝업은 닫히고 이 창이 새로 열린다 — 실제
 * 윈도우에서도 설치 프로그램의 확인 대화상자와 실행된 프로그램은 다른 창이다.
 * ⚠️ **팝업 안에 그리지 말 것**(그렇게 만들었다가 되돌렸다) — 그러면 프로그램이
 * 대화상자의 일부가 되어 작업 표시줄에도 안 잡히고 다른 창과 나란히 놓을 수도 없다.
 *
 * ## ⚠️ 연출이지 규칙이 아니다
 * **여기서는 게임 상태를 한 톨도 안 바꾼다.** 턴·스탯·업무량은 이 창이 열리기 **전에**
 * `doActivity`가 끝냈고(`openToolWindow`를 부른 쪽이 이어서 부른다) 이 창은 **그 결과를
 * 읽기만** 한다. 그래서 작업 도중에 창을 닫아도, [건너뛰기]를 눌러도 결과가 달라지지
 * 않는다 — 애니메이션이 게임을 잡고 있으면 언젠가 "닫아서 이득 보는" 자리가 생긴다.
 *
 * ## ⚠️ 세 도구가 같은 껍데기를 쓴다
 * 갈리는 것은 **로고·액센트·작업 단계 문구 셋뿐**이다. 도구마다 가짜 UI를 따로 그리면
 * 화면 셋을 영원히 나란히 유지해야 하는데, 정작 게임이 다르게 대하는 것은 하나도 없다
 * (증기의 게임 목록·미디북스의 책과 같은 판단).
 */

/** 한 단계에 머무는 시간. 넷이라 총 2.5초 남짓 — 1턴의 무게치고 짧고, 기다림치곤 견딘다. */
const STEP_MS = 620

/** 창 폭. 활동 창(420)보다 넓다 — 이쪽은 미리보기가 아니라 작업 화면이다. */
const TOOL_WINDOW_WIDTH = 460

/**
 * 성장 게이지 한 줄. **오른 뒤의 값이 상한의 어디쯤인지**를 보여 준다.
 *
 * ⚠️ **상한을 여기서 적지 않는다** — `growthCap`·`STAMINA_CAP`·`MENTAL_CAP`에 물어본다
 * (적는 순간 평판·도덕처럼 상한이 다른 스탯이 거짓 비율로 그려진다).
 * ⚠️ **상한이 없는 스탯(소지금)에는 아무것도 안 그린다.** 기준 없는 막대는 뜻이 없다.
 * ⚠️ **깎인 경우도 안 그린다** — 설계자가 요청한 것은 "올라간 스탯"이고, 줄어드는 막대는
 * 결과 알림이 할 말이 아니다(체력·멘탈 소모는 위 줄의 숫자가 이미 말한다).
 */
function capOf(stat: keyof typeof STAT_NAMES): number | undefined {
  if ((GROWTH_STAT_KEYS as readonly string[]).includes(stat)) {
    return growthCap(stat as (typeof GROWTH_STAT_KEYS)[number])
  }
  if (stat === 'stamina') return STAMINA_CAP
  if (stat === 'mental') return MENTAL_CAP
  return undefined
}

function Gauge({
  stat,
  gained,
  now,
}: {
  stat: keyof typeof STAT_NAMES
  gained: number
  now: number
}) {
  /*
   * ⚠️ **막대는 0에서 자라난다.** 결과 판이 뜨자마자 다 찬 막대를 보여 주면 "여기까지
   * 찼다"는 사실만 남고 **올랐다는 사건**이 안 보인다 — 이 창이 존재하는 이유가 그쪽이다
   * (2026-08-09 설계자 지시: "게이지바에 등급 올라가는 애니메이팅을 추가해").
   * 첫 프레임을 0으로 두고 다음 틱에 목표 폭을 넣어야 전환이 걸린다.
   */
  const [grown, setGrown] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setGrown(true), 60)
    return () => clearTimeout(timer)
  }, [])

  const cap = capOf(stat)
  if (cap === undefined || gained <= 0) return null
  const pct = (v: number) => Math.max(0, Math.min(100, (v / cap) * 100))
  const before = now - gained
  const had = pct(before)

  /* ⚠️ **등급은 성장 스탯만 갖는다** — 체력·멘탈에는 `rankOf`를 물어볼 수 없다
     (`growthCap`이 그 키를 모른다). 그래서 상한이 있어도 등급 표시는 갈린다. */
  const growth = (GROWTH_STAT_KEYS as readonly string[]).includes(stat)
  const key = stat as (typeof GROWTH_STAT_KEYS)[number]
  const was = growth ? rankOf(key, before) : undefined
  const nowRank = growth ? rankOf(key, now) : undefined
  const up = was !== undefined && was !== nowRank

  return (
    <>
      {/* ⚠️ 등급 상승은 **글자로도 말한다**(ux `color-not-only`) — 막대 색이 바뀌는 것만으로
          전하면 색을 못 보는 사람에게는 아무 일도 안 일어난 것이 된다. */}
      {up && (
        <span className="tr-rankup" role="status">
          <span className="tr-rank-was">{was}</span>
          <span className="tr-rank-arrow" aria-hidden="true" />
          <span className="tr-rank-now">{nowRank}</span>
          <span className="tr-rank-label">등급</span>
        </span>
      )}
      <span
        className={`tr-gauge${up ? ' tr-gauge-up' : ''}`}
        role="progressbar"
        aria-valuenow={Math.round(now)}
        aria-valuemin={0}
        aria-valuemax={cap}
        aria-label={`${STAT_NAMES[stat]} ${Math.round(now)} / ${cap}${up ? ` — ${nowRank} 등급` : ''}`}
      >
        <span className="tr-gauge-had" style={{ width: `${had}%` }} />
        <span className="tr-gauge-gain" style={{ width: grown ? `${pct(now) - had}%` : 0 }} />
      </span>
    </>
  )
}

/** 도구별 로고. ⚠️ 바탕화면 항목·그몽 카드와 **같은 그림**이어야 한다. */
const TOOL_ICONS: Record<ToolId, IconName> = {
  photoshop: 'devicon:photoshop',
  premiere: 'devicon:premierepro',
  vscode: 'devicon:vscode',
  // ⚠️ devicon에 오디션 로고가 없다 — 바탕화면 항목과 같은 헤드폰을 쓴다.
  audition: 'fluent-color:headphones-24',
}

/**
 * 도구 앱 창을 연다. **실행 통로 둘이 함께 쓴다**(활동 창 · 바로 가기 확인창) —
 * 각자 적으면 한쪽에서만 프로그램이 안 뜬다.
 *
 * ⚠️ **반드시 `doActivity`보다 먼저 부른다.** 결과 화면이 견줄 것은 **실행 직전의**
 * 증감·일감 상태이기 때문이다(`ToolRunPayload` 주석 참조).
 * ⚠️ **같은 도구의 낡은 창을 먼저 닫는다.** `windowStore.open`은 id가 같으면 새로 열지
 * 않고 앞으로 가져오기만 하므로, 안 닫으면 두 번째 실행이 **지난번 결과를 다시 보여 준다.**
 */
export function openToolWindow(state: GameState, activity: Activity): void {
  const scene = runSceneOf(activity)
  /* ⚠️ **장면이 없는 활동은 그냥 끝난다.** 모든 활동에 2.5초를 붙이면 그건 연출이 아니라
     통행세다 — 잠자기·식사까지 기다리게 만들지 않는다. */
  if (!scene) return
  const { rows, mentalPenalty } = previewActivity(state, activity)
  const id = `run-${activity.id}`
  const { close, open } = useWindowStore.getState()
  close(id)
  open({
    id,
    title: scene.title,
    /* 도구는 프로그램 로고(devicon), 알바는 활동 아이콘 — 둘 다 **다른 자리에서 쓰던
       같은 그림**이라 작업 표시줄에서 무엇이 도는지 바로 읽힌다. */
    icon: activity.toolId ? TOOL_ICONS[activity.toolId] : scene.icon,
    x: 240,
    y: 96,
    width: TOOL_WINDOW_WIDTH,
    kind: 'tool',
    /* ⚠️ 종이 판 장면은 **닫기 버튼 없는 시스템 팝업**이다(설계자 지시) — 공부는 프로그램을
       켜는 일이 아니라 게임이 잠깐 말을 거는 자리라, 창처럼 X로 치울 수 있으면 안 된다.
       빠져나갈 길은 [건너뛰기]·[확인]·Esc 셋이 진다. */
    popup: scene.look === 'paper',
    toolRun: {
      toolId: activity.toolId,
      title: scene.title,
      steps: scene.steps,
      accent: scene.accent,
      look: scene.look,
      rows,
      mentalPenalty,
      contract: activeContract(state),
      earned: gigsOf(state).earned,
    },
  })
}

export function ToolRun({ payload, onClose }: { payload: ToolRunPayload; onClose: () => void }) {
  const state = useGameStore((s) => s.state)
  const [step, setStep] = useState(0)
  const titleId = useId()

  const { toolId, steps, title, accent } = payload
  const finished = step >= steps.length

  useEffect(() => {
    if (finished) return
    const t = setTimeout(() => setStep((s) => s + 1), STEP_MS)
    return () => clearTimeout(t)
  }, [step, finished])

  if (!state) return null

  const percent = Math.round((Math.min(step, steps.length) / steps.length) * 100)

  const paper = payload.look === 'paper'

  return (
    <div
      className={`tr tr-${accent}${paper ? ' tr-paper' : ''}`}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="tr-stage">
        {/*
         * 가짜 작업 영역. ⚠️ **이미지가 아니라 막대 몇 개다**(배너·엔딩과 같은 오프라인
         * 규칙). 화면 낭독기에는 아무 뜻도 없으므로 통째로 숨긴다 — 진행 상황은 아래
         * 상태 줄과 진행 막대가 말한다.
         */}
        {paper ? (
          /*
           * 책장 넘기는 그림. ⚠️ **이미지가 아니라 상자 몇 개다**(막대와 같은 오프라인 규칙).
           * 코드 줄이 흐르는 기본 판은 공부에 어울리지 않았다(설계자 지시).
           */
          <div className="tr-canvas tr-book" aria-hidden="true">
            <span className="tr-book-spread">
              <span className="tr-book-side" />
              <span className="tr-book-side" />
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="tr-book-leaf"
                  style={{ animationDelay: `${i * 520}ms` }}
                />
              ))}
            </span>
          </div>
        ) : (
          <div className="tr-canvas" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="tr-row" style={{ animationDelay: `${i * 90}ms` }} />
            ))}
          </div>
        )}

        {/*
          ux `loading-states`: 무엇을 하는 중인지 글자로 말한다(막대만으로는 모른다).
          ⚠️ **끝나면 상태 줄과 막대를 걷어낸다**(2026-08-08 실측). 결과 알림이 덮은 뒤에도
          남겨 두면 **안 보이는 글자가 액센트 버튼 위에 겹쳐** 대비 1.5:1로 읽히고, 정작
          완료를 알리는 일은 아래 `role="alertdialog"`가 이미 한다(낭독기도 그쪽을 읽는다).
        */}
        {!finished && (
          <>
            <p className="tr-status" aria-live="polite">
              {steps[step]}…
            </p>

            <div
              className="tr-track"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${title} 작업 진행률`}
            >
              <span className="tr-fill" style={{ width: `${percent}%` }} />
            </div>
          </>
        )}

        {/*
         * ⚠️ **기다림에는 언제나 빠져나갈 길을 둔다**(ux `escape-routes`). 어차피 결과는
         * 이미 확정돼 있으므로 건너뛰어도 잃는 것이 없다.
         */}
        {!finished && (
          <button type="button" className="tr-skip" onClick={() => setStep(steps.length)}>
            건너뛰기
          </button>
        )}
      </div>

      {finished && (
        <>
          {/* style `blur-purpose`: 뒤가 흐려지는 것이 "이 알림이 위에 있다"는 신호다. */}
          <div className="tr-scrim" />
          <div className="tr-result" role="alertdialog" aria-labelledby={titleId}>
            <h2 className="tr-result-head" id={titleId}>
              {/* ⚠️ **"작업 완료"라고 쓰지 않는다** — 도구에는 맞지만 공부·알바가 붙으면서
                  "공부 작업 완료"가 됐다(2026-08-08 실측에서 눈에 띄었다). 장면이 무엇이든
                  참인 말은 "끝났다" 하나뿐이다. */}
              {title} 완료
            </h2>

            <ul className="tr-effects">
              {payload.rows.map(({ key, value }) => (
                <li key={key} className="tr-effect-group">
                  <span className="tr-effect">
                    <span className="tr-effect-label">
                      <AppIcon name={STAT_META[key].icon} size={15} />
                      {STAT_NAMES[key]}
                    </span>
                    {/* 부호를 항상 적는다 — 색만으로 증감을 전하지 않는다. */}
                    <span className={value >= 0 ? 'tr-plus' : 'tr-minus'}>
                      {value >= 0 ? '+' : ''}
                      {value.toLocaleString('ko-KR')}
                    </span>
                  </span>
                  <Gauge stat={key} gained={value} now={state?.stats[key] ?? 0} />
                </li>
              ))}
              {payload.mentalPenalty > 0 && (
                <li className="tr-effect">
                  <span className="tr-effect-label">
                    <AppIcon name={STAT_META.mental.icon} size={15} />
                    {STAT_NAMES.mental} (연속 페널티)
                  </span>
                  <span className="tr-minus">-{payload.mentalPenalty}</span>
                </li>
              )}
            </ul>

            {/* ⚠️ **일감 줄은 도구에만 있다** — 알바에는 그몽 계약이 없으므로 이 줄을
                그리면 "받아 둔 일이 없습니다"가 매번 뜬다(빈 자리를 만들지 않는다). */}
            {toolId && (
              <p className="tr-gig">
                {gigLine(payload, gigsOf(state).earned, activeContract(state))}
              </p>
            )}

            <button type="button" className="tr-close" autoFocus onClick={onClose}>
              확인
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * 일감 한 줄. **이 창이 결과값으로서 진짜 궁금한 것**이다 — 스탯은 어느 활동이든 오르지만
 * 업무량은 도구를 켠 이유 그 자체다.
 *
 * ⚠️ **판정을 새로 만들지 않는다**: 받아 둔 일이 사라졌는지(`after`), 보수가 들어왔는지
 * (`earned` 증가)만 견준다. "다 채웠는가"를 여기서 다시 계산하면 `systems/gigs.ts`와
 * 갈라져 언젠가 한쪽만 낡는다.
 * ⚠️ 계약이 사라졌는데 보수가 안 늘었다면 **마감을 놓친 것**이다(밤이 지나갔다) —
 * 그 경우까지 "납품 완료"라고 적으면 화면이 거짓말을 한다.
 */
function gigLine(payload: ToolRunPayload, earnedNow: number, after?: GigContract): string {
  const before = payload.contract
  const gig = before ? findGig(before.gigId) : undefined
  if (!before || !gig) return '받아 둔 일감이 없어 연습으로 켰습니다.'
  if (gig.tool !== payload.toolId) {
    return `받아 둔 일감은 ${TOOL_NAMES[gig.tool]} 작업이라 업무량은 그대로입니다.`
  }
  if (after) return `업무량 ${after.progress} / ${gig.workload} · 「${gig.title}」`
  const paid = earnedNow - payload.earned
  if (paid > 0) {
    return `「${gig.title}」 납품 완료 — 보수 ${paid.toLocaleString('ko-KR')}원을 받았습니다.`
  }
  return `「${gig.title}」 계약이 마감을 넘겨 깨졌습니다.`
}
