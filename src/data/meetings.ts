/**
 * 화상회의 — 수치와 문구.
 *
 * ⚠️ **회의는 활동이 아니다.** 턴을 쓰지 않고 스탯도 올리지 않는다. 회의가 만지는 것은
 * **성과 게이지 하나**(`Employment.performance`)이고, 그래서 밸런스 시뮬레이션이 이
 * 시스템을 몰라도 그대로 성립한다(사내 드라이브와 같은 경계).
 *
 * ⚠️ 규칙은 전부 `systems/meeting.ts`가 갖는다. 여기 있는 것은 **값과 말**뿐이다.
 */

/** 줌 설치 id. `GameState.installed`에 이 문자열이 들어가면 바탕화면에 아이콘이 생긴다. */
export const ZOOM_APP_ID = 'zoom'

/** 회의 요청이 오는 채팅방(`data/messages.ts`의 `THREADS`). 주말 호출과 같은 팀장 방이다. */
export const MEETING_CHANNEL = 'boss'

/**
 * 요청이 오는 확률(0~99 굴림값과 비교). **주말 호출(10~65%)보다 낮다** —
 * 회의는 며칠 뒤를 예약하는 일이라 자주 오면 일정표가 회의로만 찬다.
 */
export const MEETING_CALL_RATE = 18

/** 요청이 온 날로부터 며칠 뒤에 회의가 잡히는가. 준비할 시간이 하루는 있어야 한다. */
export const MEETING_LEAD_DAYS = 2

/**
 * 회의에 빠졌을 때 깎이는 성과(%p).
 *
 * ⚠️ **출근 한 번으로 메울 수 있는 크기**여야 한다(사무직 한 번 출근이 대략 20~40%p) —
 * 더 크면 회의 한 번을 놓친 판이 급여일까지 회복 불가능해지고, 그건 이 게임에 없는
 * 종류의 손실이다(게임오버를 없앤 판단과 같은 결).
 */
export const MEETING_MISS_PENALTY = 15

/** 회의에 들어갔을 때 오르는 성과(%p). 빠졌을 때의 손해보다 작다 — 회의는 일이 아니라 자리다. */
export const MEETING_JOIN_REWARD = 8

/**
 * 회의 주제 풀. 날짜를 오프셋 삼아 돌린다(`requestsForDay`와 같은 방식) —
 * 길이가 짝수가 아니라야 조합이 날마다 어긋난다.
 */
export const MEETING_TOPICS: string[] = [
  '주간 업무 공유',
  '다음 분기 일정 점검',
  '신규 건 킥오프',
  '고객사 피드백 리뷰',
  '운영 이슈 대응 회의',
]

/**
 * 회의에 들어와 있는 사람들. **호스트가 맨 앞**이고, 나머지는 화면에 타일로 깔린다.
 * ⚠️ 이름을 화면에 적지 않는다 — 여기 한 곳에서만 온다.
 */
export const MEETING_HOST = '박 팀장'

export const MEETING_PARTICIPANTS: string[] = ['김 대리', '이 주임', '정 사원', '최 과장']
