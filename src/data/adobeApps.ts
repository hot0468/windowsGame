import { GIGS } from './gigs'
import type { IconName, ToolId } from '../types/game'

/**
 * 어도비 도구 셋(포토샵·프리미어·오디션)의 **프로그램 화면이 그릴 것** — 연출이고 규칙이 아니다.
 *
 * ## ⚠️ 수치를 하나도 안 갖는다
 * 보수·업무량·기한은 `data/gigs.ts`가, 증감은 `data/activities.ts`가 갖는다
 * (`data/vscode.ts`와 완전히 같은 자리다). 여기 있는 것은 **패널 이름과 문서 이름**뿐이고,
 * 이 값이 바뀌어도 턴·돈·업무량은 하나도 안 변한다.
 *
 * ## ⚠️ 셋을 한 파일에 두는 이유
 * 세 프로그램은 **같은 크롬을 쓴다**(메뉴 줄 · 왼쪽 패널 · 무대 · 상태 표시줄 · ▶). 실제
 * 어도비 도구들이 그렇게 생겼기 때문이고, 그래서 컴포넌트도 하나(`AdobeApp`)다. 갈리는
 * 것은 **무대 하나**(`stage`)뿐이라 그 값만 프로그램마다 다르다 — 셋으로 쪼개면 크롬 한 벌을
 * 세 번 유지하게 되고, 한쪽만 고치는 사고가 난다(`ToolRun`이 `art`로 갈리는 것과 같은 규칙).
 *
 * ## ⚠️ VS 코드와 같은 수준이다 — 여기서 고를 수 있는 행동은 그 도구의 작업 하나다
 * 프로그램마다 행동을 여럿 두려면 활동을 새로 만들거나 기존 활동을 구독 뒤로 옮겨야 하는데,
 * 둘 다 밸런스를 바꾼다(설계자 결정 2026-08-21: VS 코드와 같은 수준으로 간다).
 * **이 파일에 활동을 늘리지 말 것** — 늘릴 자리는 `data/activities.ts`다.
 */

/** 무대 갈래. 프로그램이 무엇을 다루는지가 여기서 갈린다. */
export type AdobeStage = 'canvas' | 'timeline' | 'wave'

export interface AdobeApp {
  /** `ToolId`와 같은 값이다 — 일감(`Gig.tool`)이 이 키로 자기 도구를 가리킨다. */
  id: Extract<ToolId, 'photoshop' | 'premiere' | 'audition'>
  /** 창 안에서 실행하는 활동(`data/activities.ts`). **하나뿐이다**(위 주석). */
  activityId: string
  name: string
  icon: IconName
  /** 메뉴 줄. **표시 전용이다** — 누를 수 없다(죽은 컨트롤을 만들지 않는다). */
  menus: string[]
  /** 왼쪽 패널 제목과 항목. 프로그램마다 부르는 이름이 다르다(레이어/프로젝트/세션). */
  panel: { title: string; items: string[] }
  stage: AdobeStage
  /** 문서 확장자. 탭과 파일 이름에 붙는다. */
  ext: string
  /** 받아 둔 일이 없을 때 열려 있는 문서. **프로그램은 일이 없어도 열린다.** */
  scratch: string
}

export const ADOBE_APPS: AdobeApp[] = [
  {
    id: 'photoshop',
    activityId: 'tool-photoshop',
    name: '포토샵',
    icon: 'devicon:photoshop',
    menus: ['파일', '편집', '이미지', '레이어', '문자', '선택', '필터', '보기'],
    /* 레이어 이름이 위에서부터 쌓인 순서다(실제 레이어 패널과 같다). */
    panel: {
      title: '레이어',
      items: ['텍스트', '로고', '보정', '배경 사본', '배경'],
    },
    stage: 'canvas',
    ext: 'psd',
    scratch: '무제-1',
  },
  {
    id: 'premiere',
    activityId: 'tool-premiere',
    name: '프리미어',
    icon: 'devicon:premierepro',
    menus: ['파일', '편집', '클립', '시퀀스', '마커', '그래픽', '보기', '창'],
    panel: {
      title: '프로젝트',
      items: ['A_roll.mp4', 'B_roll.mp4', 'bgm.wav', '자막.prproj', '로고.png'],
    },
    stage: 'timeline',
    ext: 'prproj',
    scratch: '무제 시퀀스',
  },
  {
    id: 'audition',
    activityId: 'tool-audition',
    name: '오디션',
    icon: 'fluent-color:headphones-24',
    menus: ['파일', '편집', '멀티트랙', '클립', '효과', '즐겨찾기', '보기', '창'],
    panel: {
      title: '세션',
      items: ['보컬', '기타', '베이스', '드럼', '앰비언스'],
    },
    stage: 'wave',
    ext: 'sesx',
    scratch: '무제 세션',
  },
]

export function findAdobeApp(id: string): AdobeApp | undefined {
  return ADOBE_APPS.find((a) => a.id === id)
}

/**
 * 일감별 문서 이름. **일감마다 다른 파일이 열려야 "다른 일을 하고 있다"가 읽힌다**
 * (`data/vscode.ts`가 프로젝트를 일감 id로 색인하는 것과 같은 이유 — 하나로 돌려쓰면
 * 두 일감이 같은 화면이 되어 창을 만든 이유가 사라진다).
 *
 * ⚠️ **일감 제목에서 만들어 내지 않는다** — "카페 메뉴판 리뉴얼"에서 파일 이름을 뽑으면
 * 제목을 손볼 때마다 화면이 같이 흔들린다. 한 줄씩 적어 두고 `adobeApps.test.ts`가
 * 어도비 일감 전부에 이름이 있는지 지킨다.
 */
const DOC_NAMES: Record<string, string> = {
  /* 포토샵 */
  'detail-mulbit': '상세페이지_a안',
  'poster-hanbam': '안내포스터_리뉴얼',
  'brand-seohan': '브랜딩_한벌_v3',
  /* 프리미어 */
  'promo-sizib': '홍보30초_컷편집',
  /* 오디션 */
  'podcast-neulbom': '팟캐스트_3화_정리',
  'jingle-mulbit': '로고송_15초',
  'mixing-sizib': '단편_믹싱_v2',
}

/** 그 일감의 문서 이름. 일감이 없거나 다른 도구의 일이면 빈 문서를 연다. */
export function docFor(app: AdobeApp, gigId?: string): string {
  return (gigId && DOC_NAMES[gigId]) ?? app.scratch
}

/** 이 도구의 일감 id 전부. 테스트가 문서 이름이 빠졌는지 확인하는 데 쓴다. */
export function adobeGigIds(): string[] {
  const tools = new Set<string>(ADOBE_APPS.map((a) => a.id))
  return GIGS.filter((g) => tools.has(g.tool)).map((g) => g.id)
}

export { DOC_NAMES }
