import type { Stats } from '../types/game'

/**
 * 벼룩장터 정규직 공고 + 채용/급여 수치.
 *
 * ⚠️ **알바(`data/jobs.ts`)와 구조가 다르다.** 알바 공고는 수치를 하나도 갖지 않는다 —
 * 활동을 `activityId`로 가리키기만 하고 일당은 활동에서 파생한다. 정규직은 반대다:
 * **출근 활동은 하나뿐이고 회사마다 월급이 다르므로**, 급여의 단일 출처는 활동이 아니라
 * 이 파일의 `salary`다. 활동(`commute`)은 행동력·멘탈 비용만 갖고 돈은 한 푼도 만지지 않는다.
 * 그래서 같은 금액이 두 곳에 적히는 일이 없다.
 *
 * ⚠️ **실존 브랜드·실존 인물 이름 금지**(알바몬·가짜 광고와 같은 규칙). 전부 지어낸 상호다.
 * ⚠️ `Math.random`·`Date` 금지 — 목록도 판정도 결정적이어야 한다.
 *
 * ## 왜 합격 판정에 무작위가 없나
 * 탈락한 지원은 **무엇이 모자랐는지** 말해 줘야 한다(ux `error-clarity`). 주사위가 섞이면
 * 그 설명이 거짓이 된다 — "지식이 모자랐다"고 적어 놓고 실제로는 굴림에서 진 것이 되기 때문이다.
 * 그래서 판정은 **스탯 대 요건**만 본다. 불확실성은 **결과가 나오는 날까지의 지연**이 맡는다:
 * 지원한 날에는 모자랐어도 결과가 나오는 날까지 공부해서 채우면 통과한다. 그것이 이 시스템의
 * 도박이고, 굴림보다 훨씬 나은 도박이다(플레이어가 개입할 수 있다).
 */

/** 채용 단계가 보는 요건. 값은 그 스탯의 최소치다. */
export type CareerRequirement = Partial<Record<keyof Stats, number>>

export interface Career {
  id: string
  /** 지어낸 상호. */
  company: string
  title: string
  /** 가짜 지역명. */
  area: string
  /** 근무 형태 문구. */
  schedule: string
  /** 공고 본문 한 줄. */
  summary: string
  /**
   * **급여 주기 1회분 급여**(원). 급여일마다 이 금액이 그대로 들어온다.
   *
   * ⚠️ **물가 배율을 타지 않는다**(알바와 다른 점). 연봉은 계약이고 물가는 계약을 안 본다 —
   * 그래서 정규직은 중반에 강력하고 후반에 반드시 무너진다. 이것이 "고용이 경제를
   * 무의미하게 만들지 않는다"를 규칙 한 줄로 보장한다.
   */
  salary: number
  /**
   * **서류 심사**가 보는 스탯. 이력서에 적히는 것들이다(지식·어휘력·창의력).
   * 여덟 줄이 영원히 0이던 성장 스탯들이 처음으로 결과를 가르는 자리다.
   */
  paper: CareerRequirement
  /** **면접**이 보는 스탯. 사람을 보는 자리다(매력·평판·친화력). */
  person: CareerRequirement
  /**
   * **서류에 반드시 붙여야 하는 자격증**(`data/items.ts`의 아이템 id, O넷에서 취득한다).
   *
   * ⚠️ **급여 상위 두 공고만 요구한다.** 스탯은 시간을 들이면 반드시 오르지만 자격증은
   * "며칠 전에 미리 응시해 뒀는가"를 묻는다 — 상위 공고에만 붙이는 이유는 그 계획성이
   * 곧 높은 급여의 값이기 때문이다. 아래쪽 공고까지 요구하면 첫 취직이 열흘 밀린다.
   *
   * ⚠️ **판정은 `systems/employment.ts`의 `shortfalls()` 하나가 한다**(스탯 요건과 같은
   * 자리). 화면은 그 사유를 파생만 한다 — 두 번째 판정을 만들지 않는다.
   */
  cert?: string
  /** 카드 아래 회색 칩. */
  tags: string[]
  /** 있으면 제목 옆에 강조 배지가 붙는다. */
  badge?: string
}

/* ── 채용 절차의 일정 (일 단위) ────────────────────────────────────────── */

/** 지원 → 서류 결과. */
export const SCREENING_DAYS = 3
/** 서류 통과 → 면접을 볼 수 있게 되는 날까지. */
export const INTERVIEW_LEAD_DAYS = 2
/**
 * 면접 가능 기간. 이 안에 안 가면 **불참으로 탈락**한다.
 * 기한을 안 두면 통과한 지원이 영원히 남아 다른 곳에 지원할 수도 없는 상태가 된다.
 */
export const INTERVIEW_WINDOW_DAYS = 3
/** 면접 → 최종 결과. */
export const FINAL_DAYS = 4

/* ── 재직 규칙 ─────────────────────────────────────────────────────────── */

/**
 * 급여 주기(일). 입사일 + 이 값이 첫 급여일이고, 그 뒤로 같은 간격이다.
 *
 * ⚠️ **처음에 잡았던 30일(월급)에서 15일(격주 지급)로 내렸다.** 시뮬레이션으로 둘 다 재 봤고
 * 30일도 파산하지는 않았다(21일차 입사 → 51일차 첫 급여, 그 사이 최저 잔고 41만원).
 * 내린 이유는 생존이 아니라 **리듬**이다: 30일 주기로는 100일짜리 판에서 급여가 51·81일
 * **두 번**뿐이라 "급여 → 물가 인상 → 다시 급여"라는 이 시스템의 박자가 한 번도 반복되지 않는다.
 * 15일이면 36·51·66·81·96·111일에 들어와 박자가 실제로 돌아오고, 판은 122일차에 끝난다
 * (`balance.verify.test.ts`가 지킨다).
 */
export const PAYDAY_INTERVAL = 15

/** 근무일(0=일 … 6=토). 월~금. `data/calendar.ts`의 `weekdayOf`와 같은 척도다. */
export const WORKDAYS = [1, 2, 3, 4, 5]

/**
 * 무단결근 경고 기준. 이 횟수에 닿으면 경고 메일이 온다.
 * **해고보다 먼저 반드시 경고가 온다** — 예고 없이 잃는 것은 손실이 아니라 사고다.
 */
export const ABSENCE_WARNING = 3

/** 무단결근 해고 기준. 되돌리는 길은 없다(같은 회사에 다시 들어갈 수 없다). */
export const ABSENCE_FIRE = 6

/** 세이브에 남길 소식의 최대 개수. 오래된 것부터 버린다. */
export const NOTICE_LIMIT = 24

/* ── 공고 ─────────────────────────────────────────────────────────────── */

/**
 * 정규직 공고. 위로 갈수록 쉽고 아래로 갈수록 어렵다.
 *
 * 요건을 잡을 때 지킨 것:
 * 1. **서류는 지식·어휘력·창의력, 면접은 매력·평판·친화력**을 본다. 이 여섯이
 *    "올릴 수는 있는데 아무도 안 보는" 스탯이었다.
 * 2. **평판의 상한은 100이다**(`growthCap`). 그래서 면접 요건의 평판은 70을 넘기지 않는다 —
 *    상한을 넘는 요건은 도달 불가능한 공고를 만든다.
 * 3. 첫 공고(다솜기획)는 **지식 40 / 어휘력 20**이다. 공부·독서 열 번 남짓이라
 *    첫 2주 안에 닿는다 — 정규직이 "언젠가의 이야기"로 밀려나지 않게 하는 자리다.
 */
export const CAREERS: Career[] = [
  {
    id: 'dasom-office',
    company: '다솜기획',
    title: '사무보조 · 총무 (정규직)',
    area: '늘봄구 갈밭동',
    schedule: '주 5일 · 월~금',
    summary: '문서 정리와 비품 관리를 맡습니다. 경력보다 성실함을 봅니다.',
    salary: 1_700_000,
    paper: { knowledge: 40, vocabulary: 20 },
    person: { charm: 20, sociability: 15 },
    tags: ['신입 가능', '4대보험', '정시 퇴근'],
    badge: '상시채용',
  },
  {
    id: 'nulbom-edu',
    company: '늘봄에듀',
    title: '교재 편집자 (정규직)',
    area: '청람동 대학로',
    schedule: '주 5일 · 월~금',
    summary: '초·중등 교재의 원고를 다듬습니다. 문장을 오래 들여다볼 수 있어야 합니다.',
    salary: 2_300_000,
    paper: { knowledge: 70, vocabulary: 60, creativity: 30 },
    person: { charm: 25, sociability: 25, reputation: 20 },
    tags: ['편집 경력 우대', '자율 좌석', '도서 지원'],
  },
  {
    id: 'mulbit-agency',
    company: '물빛에이전시',
    title: '브랜드 마케터 (정규직)',
    area: '늘봄구 물빛로',
    schedule: '주 5일 · 월~금',
    summary: '작은 브랜드의 목소리를 만듭니다. 사람 앞에 설 일이 많습니다.',
    salary: 2_900_000,
    paper: { creativity: 70, vocabulary: 50, knowledge: 40 },
    person: { charm: 60, sociability: 55, reputation: 40 },
    tags: ['포트폴리오 필수', '재택 병행', '성과급'],
    badge: '인기',
  },
  {
    id: 'hanbat-soft',
    company: '한밭소프트',
    title: '주니어 개발자 (정규직)',
    area: '늘봄산단 3블록',
    schedule: '주 5일 · 월~금',
    summary: '사내 업무 시스템을 만들고 고칩니다. 기초를 깊게 봅니다.',
    salary: 3_500_000,
    paper: { knowledge: 120, creativity: 60 },
    person: { charm: 30, sociability: 40, reputation: 30 },
    cert: 'cert-info',
    tags: ['코딩 테스트', '자격증 필수', '장비 지원'],
  },
  {
    id: 'cheongram-group',
    company: '청람그룹',
    title: '신입 공채 (정규직)',
    area: '서한리 본사',
    schedule: '주 5일 · 월~금',
    summary: '연 1회 공채입니다. 서류부터 최종까지 통과하는 사람은 많지 않습니다.',
    salary: 4_600_000,
    paper: { knowledge: 150, vocabulary: 100, creativity: 80 },
    person: { charm: 80, sociability: 80, reputation: 70 },
    cert: 'cert-manage',
    tags: ['공채', '자격증 필수', '사택 지원'],
    badge: '마감임박',
  },
]

export function findCareer(id: string): Career | undefined {
  return CAREERS.find((c) => c.id === id)
}

/**
 * 그 자격증을 요구하는 공고. **공고 → 자격증 방향으로만 적혀 있으므로** 뒤집어 찾는다
 * (O넷이 "이 종목이 무엇을 여는가"를 그릴 때 쓴다 — `activitiesUnlockedBy`와 같은 규칙).
 */
export function careersRequiring(certItemId: string): Career[] {
  return CAREERS.filter((c) => c.cert === certItemId)
}

/**
 * 공고의 서열. **배열 순서가 곧 서열이다** — 급여 오름차순으로 정렬돼 있고
 * 그 사실은 `balance.verify.test.ts`가 지킨다.
 *
 * 무직·모르는 id는 **-1**이라 어떤 공고보다도 낮다. 그래서 "더 높은 곳에 갔는가"를
 * 묻는 쪽(`recordPeakCareer`)이 무직 여부를 따로 분기하지 않아도 된다.
 *
 * ⚠️ 별도의 `rank` 필드를 두지 않는 이유: 급여와 서열이 두 곳에 적히면 공고를 하나
 * 끼워 넣을 때 한쪽만 고쳐도 아무 테스트가 안 터진다.
 */
export function careerRank(id: string | undefined): number {
  return id ? CAREERS.findIndex((c) => c.id === id) : -1
}

/** 근무일인가. 결근 판정과 화면 안내가 같은 함수를 본다. */
export function isWorkWeekday(weekday: number): boolean {
  return WORKDAYS.includes(weekday)
}
