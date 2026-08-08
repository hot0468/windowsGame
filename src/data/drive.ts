/**
 * 사내 드라이브 업무 — 동료가 메신저로 파일을 요청하면 드라이브에서 찾아 보낸다.
 *
 * ## 콜센터와 무엇이 다른가
 * ⚠️ **콜센터(전화)는 그대로 두고 사무직 쪽에 하나를 더 만든 것이다**(설계자 지시: "추가").
 * 그래서 이 미니게임을 여는 회사는 `OFFICE_CAREER_IDS` = **콜센터를 뺀 나머지 전부**이고,
 * 두 미니게임은 같은 출근 활동(`commute`)을 공유하되 **서로 다른 창**을 연다.
 *
 * ⚠️ **버는 것의 종류도 다르다.** 콜센터는 콜마다 원 단위 보너스(`Employment.bonus`)를
 * 쌓지만 여기는 **성과 게이지(%)**를 쌓고, 급여일에 **100%를 넘는 분량만** 야근비가 된다
 * (`systems/employment.ts`의 `payWages`). 100%는 그 주기에 하기로 되어 있던 몫이라
 * 채우는 것만으로는 돈이 되지 않는다 — 넘겨야 수당이다.
 *
 * ⚠️ `Math.random`·`Date` 금지 — 오늘 오는 요청은 **날짜의 함수**다(콜과 같은 규칙).
 *    실시간인 것은 경과 시간 하나뿐이고 그것은 화면이 잰다.
 * ⚠️ **실존 브랜드·실존 인물 이름 금지.**
 */

/**
 * 이 미니게임을 여는 회사 — **사무실 책상에 앉는 자리만.**
 *
 * ⚠️ **한때 "콜센터만 뺀 나머지 전부"라는 파생이었고, 그 파생을 버렸다.** 물류센터
 * 상하차·어린이집 보조교사가 생기자 그 식이 **컨베이어 앞과 교실을 사내 드라이브로
 * 끌어들였다** — "콜센터가 아니다"는 "사무직이다"와 같은 말이 아니었다. 목록을 손으로
 * 적는 값이 그 사고보다 싸다.
 *
 * ⚠️ **한 회사는 미니게임을 하나만 갖는다**(여기 · `CALL_CENTER_CAREER_ID` · `QA_CAREER_ID`가
 * 서로 배타이고 `drive.test.ts`가 지킨다). **어느 목록에도 없는 회사가 있는 것은 정상이다** —
 * 출근하면 창이 안 열리고 급여만 받는다(스케줄러로 지나간 콜센터 출근과 같은 상태).
 */
export const OFFICE_CAREER_IDS: string[] = [
  'dasom-office',
  'nulbom-edu',
  'mulbit-agency',
  'hanbat-soft',
  'cheongram-group',
]

/** 하루에 받는 요청 수. 콜센터와 같은 3건이다(같은 1턴인데 한쪽만 길면 안 된다). */
export const REQUESTS_PER_SHIFT = 3

/**
 * 한 주기에 채워야 하는 성과(%). 이 선까지는 **기본급이 사는 몫**이라 돈이 되지 않고,
 * 넘는 분량만 야근비가 된다.
 */
export const PERFORMANCE_QUOTA = 100

/**
 * 성과 1%당 야근비(원).
 *
 * ⚠️ **이 단가가 "판은 반드시 끝난다"를 지탱한다**(`MAX_CALL_BONUS`와 같은 장치).
 * 한 주기(15일) 근무일은 최대 11일이고 하루 최대 성과는 `REQUESTS_PER_SHIFT × 최고 티어`
 * = 3 × 9% = 27%이므로 초과분 상한은 11 × 27 − 100 = 197%다. 곧 주기당 상한이
 * 197 × 이 값이고 **고정 금액이라 물가 배율을 안 탄다** — 결국 생활비에 따라잡힌다.
 * **비율로 만들지 말 것.** 부등식은 `drive.test.ts`가 데이터에서 직접 지킨다.
 */
export const WON_PER_PERCENT = 1_100

/**
 * 처리 시간(초) → 성과(%). **앞에서부터 처음 맞는 칸이 답이다**(내림차순으로 적는다).
 * 마지막 칸에도 값이 있다 — 아무리 늦어도 처리한 것은 처리한 것이고,
 * 그래야 [자동 넘기기]와 구분된다.
 */
export const PERFORMANCE_TIERS: { withinSec: number; percent: number; label: string }[] = [
  { withinSec: 15, percent: 9, label: '즉시' },
  { withinSec: 30, percent: 7, label: '양호' },
  { withinSec: 60, percent: 5, label: '보통' },
  { withinSec: Infinity, percent: 3, label: '지연' },
]

/**
 * [자동 넘기기]로 하루를 넘겼을 때의 성과(%).
 *
 * ⚠️ **0이 아닌 것이 규칙이다** — 출근은 했으므로 아무것도 안 준다면 미니게임을 여는 것이
 * 아니라 **미니게임을 피하는 것이 손해**가 되어 창이 벌칙이 된다. 다만 가장 낮은 티어(3%)
 * 하나보다도 적어야 한다(3건 × 3% = 9% > 2%).
 */
export const AUTO_PERFORMANCE = 2

/* ── 드라이브의 파일 ────────────────────────────────────────────────────── */

/** 드라이브 칸 하나. 폴더가 아니라 **파일만** 둔다(찾는 재미는 이름에서 나온다). */
export interface DriveFile {
  id: string
  name: string
  ext: string
  /** 어느 폴더에 있는가. 드라이브 왼쪽 트리가 이 값으로 목록을 가른다. */
  folder: DriveFolder
  /** 크기 표시. 계산할 것이 없어 문자열 그대로 둔다(`Video.views`와 같은 규칙). */
  size: string
}

export type DriveFolder = '기획' | '디자인' | '개발' | '총무'

export const DRIVE_FOLDERS: DriveFolder[] = ['기획', '디자인', '개발', '총무']

/**
 * 사내 드라이브의 파일.
 *
 * ⚠️ **비슷한 이름을 일부러 섞는다** — "3분기 실적표"와 "3분기 실적표(최종)"이 함께 있어야
 * 요청 문장을 읽을 이유가 생긴다. 이름만 보고 하나뿐이면 찾기가 아니라 스크롤이 된다.
 */
export const DRIVE_FILES: DriveFile[] = [
  { id: 'f-q3', name: '3분기 실적표', ext: '.xlsx', folder: '기획', size: '284 KB' },
  { id: 'f-q3-final', name: '3분기 실적표 (최종)', ext: '.xlsx', folder: '기획', size: '291 KB' },
  { id: 'f-q3-final2', name: '3분기 실적표 (최종2)', ext: '.xlsx', folder: '기획', size: '293 KB' },
  { id: 'f-plan', name: '내년도 사업계획 초안', ext: '.docx', folder: '기획', size: '96 KB' },
  { id: 'f-minutes', name: '주간회의록 08월 2주', ext: '.docx', folder: '기획', size: '41 KB' },
  { id: 'f-persona', name: '고객 페르소나 정리', ext: '.pptx', folder: '기획', size: '1.2 MB' },

  { id: 'f-logo', name: '로고 리뉴얼 시안', ext: '.ai', folder: '디자인', size: '18.4 MB' },
  { id: 'f-logo-old', name: '로고 (구버전)', ext: '.ai', folder: '디자인', size: '17.9 MB' },
  { id: 'f-banner', name: '가을 프로모션 배너', ext: '.psd', folder: '디자인', size: '42.1 MB' },
  { id: 'f-guide', name: '브랜드 가이드라인', ext: '.pdf', folder: '디자인', size: '6.8 MB' },
  { id: 'f-thumb', name: '상세페이지 썸네일 모음', ext: '.zip', folder: '디자인', size: '31.0 MB' },

  { id: 'f-spec', name: '결제 모듈 명세서', ext: '.md', folder: '개발', size: '22 KB' },
  { id: 'f-api', name: 'API 연동 가이드', ext: '.md', folder: '개발', size: '35 KB' },
  { id: 'f-log', name: '장애 대응 기록 07월', ext: '.txt', folder: '개발', size: '512 KB' },
  { id: 'f-db', name: 'DB 스키마 백업', ext: '.sql', folder: '개발', size: '8.7 MB' },
  { id: 'f-release', name: '릴리즈 노트 v2.3', ext: '.md', folder: '개발', size: '11 KB' },

  { id: 'f-expense', name: '법인카드 사용내역 08월', ext: '.xlsx', folder: '총무', size: '77 KB' },
  { id: 'f-vacation', name: '연차 신청서 양식', ext: '.hwp', folder: '총무', size: '28 KB' },
  { id: 'f-seat', name: '사무실 자리 배치도', ext: '.pdf', folder: '총무', size: '1.9 MB' },
  { id: 'f-manual', name: '신입 온보딩 안내서', ext: '.pdf', folder: '총무', size: '3.4 MB' },
]

/* ── 파일을 요청하는 사람 ──────────────────────────────────────────────── */

/** 너아무튼온에서 말을 거는 사람. 아바타는 그라데이션 + 글자다(오프라인 규칙). */
export interface Coworker {
  id: string
  name: string
  /** 직함. 상사인지 동료인지가 말투를 정한다. */
  role: string
  initial: string
  gradient: string
}

export const COWORKERS: Coworker[] = [
  {
    id: 'boss',
    name: '박 팀장',
    role: '팀장',
    initial: '박',
    gradient: 'linear-gradient(135deg, #1e3a5f 0%, #2f6ea8 100%)',
  },
  {
    id: 'senior',
    name: '정 대리',
    role: '대리',
    initial: '정',
    gradient: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)',
  },
  {
    id: 'peer',
    name: '한 주임',
    role: '주임',
    initial: '한',
    gradient: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
  },
  {
    id: 'design',
    name: '유 디자이너',
    role: '디자인팀',
    initial: '유',
    gradient: 'linear-gradient(135deg, #9d174d 0%, #f43f5e 100%)',
  },
]

/** 파일 요청 한 건. ⚠️ **수치를 갖지 않는다** — 성과는 위의 티어 하나가 정한다. */
export interface FileRequest {
  id: string
  /** `Coworker.id`. 사람 정보를 요청마다 다시 적지 않는다. */
  from: string
  /** 메신저에 뜨는 말. 파일 이름을 그대로 적지 않는 것이 이 미니게임의 전부다. */
  text: string
  /** 정답 파일(`DriveFile.id`). */
  fileId: string
  /** 보내고 나면 상대가 하는 말. 요청마다 다르면 3건이 서로 다른 하루로 읽힌다. */
  reply: string
}

export const FILE_REQUESTS: FileRequest[] = [
  {
    id: 'r-q3',
    from: 'boss',
    text: '3분기 실적표 좀 보내줘요. 아까 수정한 거 말고 **가장 나중에 고친 것**으로.',
    fileId: 'f-q3-final2',
    reply: '이게 맞네요. 파일명 정리 좀 합시다 우리.',
  },
  {
    id: 'r-logo',
    from: 'design',
    text: '로고 리뉴얼 시안 원본 주실 수 있나요? 구버전 말고 이번에 새로 뜬 거요.',
    fileId: 'f-logo',
    reply: '감사합니다. 이걸로 시안 마저 뽑을게요.',
  },
  {
    id: 'r-spec',
    from: 'senior',
    text: '결제 쪽 붙이려는데 명세서가 어디 있더라. 개발 폴더에 있을 거예요.',
    fileId: 'f-spec',
    reply: '맞습니다. 이거 보고 연동하면 되겠네요.',
  },
  {
    id: 'r-expense',
    from: 'peer',
    text: '법인카드 쓴 거 정산해야 하는데 8월 내역 좀 부탁드려요.',
    fileId: 'f-expense',
    reply: '받았습니다. 영수증은 제가 붙일게요.',
  },
  {
    id: 'r-guide',
    from: 'design',
    text: '외주 업체에 브랜드 가이드라인 보내야 해서요. PDF로 된 거요.',
    fileId: 'f-guide',
    reply: '네, 이거면 됩니다.',
  },
  {
    id: 'r-minutes',
    from: 'boss',
    text: '지난주 회의록 어디 갔지. 8월 둘째 주 것 좀 찾아 봐요.',
    fileId: 'f-minutes',
    reply: '그때 그 얘기가 여기 있었군요. 고마워요.',
  },
  {
    id: 'r-release',
    from: 'senior',
    text: '2.3 릴리즈 노트 공유 부탁해요. 고객사에 넘겨야 합니다.',
    fileId: 'f-release',
    reply: '바로 전달하겠습니다.',
  },
  {
    id: 'r-vacation',
    from: 'peer',
    text: '연차 쓰려는데 신청서 양식이 어디 있는지 모르겠어요.',
    fileId: 'f-vacation',
    reply: '이거였구나. 감사합니다!',
  },
  {
    id: 'r-seat',
    from: 'boss',
    text: '신입 자리 잡아 줘야 하는데 사무실 배치도 있으면 보내 줘요.',
    fileId: 'f-seat',
    reply: '창가 쪽에 앉히면 되겠네. 수고했어요.',
  },
  {
    id: 'r-persona',
    from: 'design',
    text: '고객 페르소나 정리해 두신 거 있죠? 발표 자료에 넣으려고요.',
    fileId: 'f-persona',
    reply: '딱 필요한 자료였어요. 감사합니다.',
  },
  {
    id: 'r-db',
    from: 'senior',
    text: 'DB 스키마 백업본 좀 주세요. 로컬에 올려 보려고요.',
    fileId: 'f-db',
    reply: '용량이 크네요. 잘 받았습니다.',
  },
]

export function findDriveFile(id: string): DriveFile | undefined {
  return DRIVE_FILES.find((f) => f.id === id)
}

export function findCoworker(id: string): Coworker | undefined {
  return COWORKERS.find((c) => c.id === id)
}
