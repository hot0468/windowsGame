import { TOOL_NAMES, TOOL_STEPS } from './gigs'
import type { Activity, IconName } from '../types/game'

/**
 * 실행 연출 — **활동을 시작하면 한 번 흐르는 장면.**
 *
 * ## 왜 이 파일이 생겼나
 * 도구 앱(포토샵·프리미어·VS 코드)에만 있던 연출을 **알바에도** 붙이면서(2026-08-08
 * 설계자 지시: "알바도 바로 결과팝업 뜨지 말고 일하는 듯한 애니메이션 한 번"),
 * 창이 알아야 할 것을 한 자리에 모았다. 예전에는 `ToolRun`이 `ToolId`로 직접 색인해서
 * **도구가 아닌 활동은 애초에 그릴 수가 없었다.**
 *
 * ## ⚠️ 연출이지 규칙이 아니다
 * 단계 수·문구가 바뀌어도 턴·스탯·업무량은 하나도 안 바뀐다. 결과는 창이 열리기 **전에**
 * `doActivity`가 이미 끝냈고 창은 읽기만 한다 — 닫든 [건너뛰기]를 누르든 같다.
 *
 * ## ⚠️ 단계 수는 전부 같아야 한다
 * 다르면 같은 1턴인데 어떤 일은 더 오래 걸리는 것처럼 보인다(`gigs.test.ts`가 지킨다).
 * 도구 셋에만 걸려 있던 이 규칙이 이제 알바까지 함께 묶는다.
 *
 * ## ⚠️ 도구 문구를 여기 옮겨 적지 않는다
 * `TOOL_STEPS`·`TOOL_NAMES`가 여전히 도구의 단일 출처이고 여기서는 **읽기만** 한다 —
 * 옮겨 적으면 그몽 화면과 실행 창이 서로 다른 이름을 말하게 된다.
 */

/** 창이 그릴 장면 하나. */
export interface RunScene {
  /** 창 제목이자 결과 알림의 제목. */
  title: string
  icon: IconName
  /** CSS 액센트 갈래(`.tr-<accent>`). 장면마다 판의 강조색이 갈린다. */
  accent: string
  /** 상태 줄에 차례로 흐르는 문구. */
  steps: string[]
  /**
   * 판의 생김새. 생략 = 기본(어두운 작업 화면 + 막대 몇 개).
   *
   * ⚠️ **`'paper'` 하나가 세 가지를 함께 바꾼다**: 밝은 종이 판 · 책장 넘기는 그림 ·
   * 닫기 버튼 없는 시스템 팝업(2026-08-09 설계자 지시). 셋을 따로 두면 "밝은데 코드 줄이
   * 흐르는" 같은 조합이 생기고, 어느 조합이 옳은지 아무도 답할 수 없다. **공부가 도구처럼
   * 보이던 것이 이 필드가 생긴 이유다.**
   */
  look?: 'paper'
}

/**
 * 장면이 붙은 활동의 작업 단계.
 *
 * ⚠️ **문구가 그 활동이 무슨 일인지 말하는 유일한 자리다**(도구와 같은 규칙) — 전부 같은
 * 껍데기를 쓰므로 문구가 같아지면 여러 활동이 한 활동이 된다.
 *
 * ⚠️ **2026-08-14에 핵심 육성 활동으로 넓혔다**(설계자 지시: "행동하면 행동과 관련된
 * 애니메이팅을 좀 보여주다가 결과창이 뜬다든지"). 그전에는 71개 중 10개(도구 3 + 알바·공부
 * 6 + 웹툰)에만 장면이 있어서, **운동·그림·작곡·독서 같은 육성의 본체가 눌러도 아무 일도
 * 없이 끝났다.** 스탯이 오르는 것을 눈으로 보는 자리가 없으면 숫자만 남는다.
 *
 * ⚠️ **여전히 전부에 붙이지는 않는다** — 잠자기·식사·이동처럼 **한순간에 끝나는 일**에
 * 2.5초를 끌면 그건 연출이 아니라 벌칙이다(이 파일이 처음부터 지킨 규칙).
 */
const WORK_STEPS: Record<string, string[]> = {
  /* ⚠️ **공부 둘은 알바가 아니지만 같은 판을 쓴다**(2026-08-08 설계자 지시: "슬로우캠퍼스에서
     공부하는 것도 바로 끝나지 말고"). 강의(`data/courses.ts`)는 이 두 활동을 가리키기만
     하므로, 강의마다 장면을 만들면 강의를 늘릴 때마다 문구를 또 써야 한다. */
  study: ['강의를 재생하는 중', '필기를 따라 적는 중', '되감아 다시 듣는 중', '연습문제를 푸는 중'],
  writing: ['참고 자료를 여는 중', '초안을 쓰는 중', '문장을 덜어 내는 중', '다시 읽어 보는 중'],
  work: ['앞치마를 매는 중', '진열대를 채우는 중', '계산대에 서는 중', '폐기를 정리하는 중'],
  'work-cafe': [
    '원두를 가는 중',
    '주문을 받는 중',
    '우유를 데우는 중',
    '테이블을 닦는 중',
  ],
  'work-logistics': [
    '안전화를 신는 중',
    '컨베이어에 붙는 중',
    '상자를 내리는 중',
    '파렛트를 옮기는 중',
  ],
  'work-tutor': [
    '교재를 펼치는 중',
    '지난주 오답을 보는 중',
    '문제를 풀리는 중',
    '숙제를 내주는 중',
  ],
  /* ── 핵심 육성 활동 (2026-08-14) ───────────────────────────── */
  /* 몸. 숨이 차는 지점이 문구로 드러난다. */
  exercise: ['몸을 푸는 중', '첫 세트를 도는 중', '숨이 턱에 닿는 중', '마무리 스트레칭 중'],
  running: ['신발 끈을 매는 중', '첫 킬로를 지나는 중', '페이스를 붙잡는 중', '숨을 고르는 중'],
  /* 손으로 만드는 것 셋. 결과물이 남는 활동이라 "고치는" 단계가 들어간다. */
  draw: ['캔버스를 여는 중', '밑그림을 잡는 중', '선을 정리하는 중', '색을 얹는 중'],
  compose: ['건반을 켜는 중', '네 마디를 잡는 중', '코드를 갈아 보는 중', '다시 들어 보는 중'],
  'coding-study': ['예제를 여는 중', '따라 치는 중', '에러를 읽는 중', '고쳐 돌려 보는 중'],
  /* 받아들이는 것 둘. 읽고 보는 일이라 종이 판을 쓴다(아래 `PAPER_IDS`). */
  reading: ['책을 펴는 중', '한 챕터를 지나는 중', '접어 둘 곳을 찾는 중', '덮고 생각하는 중'],
  'finance-study': ['지표를 여는 중', '차트를 겹쳐 보는 중', '숫자를 적어 두는 중', '다시 세는 중'],
}

/**
 * 종이 판으로 그리는 활동. **책상에 앉아 읽고 쓰는 일**이다 — 알바·운동·그림은 아니다.
 * ⚠️ 갈래(`category`)로 가르지 않는다: 독서는 여가이고 공부는 학습인데 **화면에서는
 * 같은 일**이다. 무엇처럼 보이는가가 기준이라 목록으로 둔다.
 */
const PAPER_IDS = new Set(['study', 'writing', 'reading', 'finance-study'])

/** 알바 장면의 액센트. 넷이 서로 달라야 "다른 일"로 읽힌다. */
const WORK_ACCENT: Record<string, string> = {
  study: 'study',
  writing: 'write',
  work: 'store',
  'work-cafe': 'cafe',
  'work-logistics': 'depot',
  'work-tutor': 'desk',
  /* 육성 활동. 알바·공부와 또 갈려야 "다른 종류의 일"로 읽힌다. */
  exercise: 'body',
  running: 'body',
  draw: 'make',
  compose: 'make',
  'coding-study': 'make',
  reading: 'read',
  'finance-study': 'read',
}

/**
 * 그 활동이 여는 장면. **없으면 `undefined`**이고, 그때는 연출 없이 곧바로 끝난다
 * (모든 활동에 장면을 만들지 않는다 — 잠자기·식사까지 2.5초를 끌면 그건 벌칙이다).
 */
export function runSceneOf(activity: Activity): RunScene | undefined {
  if (activity.toolId) {
    return {
      title: TOOL_NAMES[activity.toolId],
      icon: activity.icon,
      accent: activity.toolId,
      steps: TOOL_STEPS[activity.toolId],
    }
  }
  const steps = WORK_STEPS[activity.id]
  if (!steps) return undefined
  return {
    title: activity.label,
    icon: activity.icon,
    accent: WORK_ACCENT[activity.id] ?? 'store',
    steps,
    look: PAPER_IDS.has(activity.id) ? 'paper' : undefined,
  }
}

/** 장면이 있는 활동 id 전부. 테스트가 단계 수를 대조할 때 쓴다. */
export const SCENE_ACTIVITY_IDS: string[] = Object.keys(WORK_STEPS)
