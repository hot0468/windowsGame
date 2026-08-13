import type { IconName } from '../types/game'

/**
 * 휴지통에 늘 들어 있는 파일.
 *
 * ⚠️ **게임 상태에 영향이 없다** — 읽을거리일 뿐이고 스탯도 턴도 돈도 건드리지 않는다.
 * 휴지통의 나머지 내용(다 쓰고 고장 난 장비)은 `GameState.broken`에서 파생하므로,
 * 이 목록은 "파생시킬 것이 없는 고정 항목"만 진다.
 *
 * ⚠️ **문구가 여기 있는 이유**: 컴포넌트에 적으면 두 번째 콘텐츠 출처가 생긴다
 * (`src/data/`가 게임 텍스트의 단일 출처라는 규칙).
 */
export interface TrashFile {
  id: string
  name: string
  ext: string
  icon: IconName
  /** 파일 목록의 크기 칸. 정렬용 숫자는 화면이 이 문구에서 뽑는다. */
  size: string
  desc: string
}

export const TRASH_FILES: readonly TrashFile[] = [
  {
    id: 'trash-report',
    name: '과제_최종_진짜최종_수정본(3)',
    ext: '.hwp',
    icon: 'fluent-color:document-text-24',
    size: '1.8 MB',
    desc: '제출하고 나서야 파일 이름이 부끄러워졌다. 내용은 기억나지 않는다.',
  },
  {
    id: 'trash-resume',
    name: '자기소개서_초안',
    ext: '.docx',
    icon: 'fluent-color:document-24',
    size: '42 KB',
    desc: '"저는 어릴 적부터"로 시작하는 첫 문장을 열일곱 번 고쳤다. 열여덟 번째에 지웠다.',
  },
  {
    id: 'trash-selfie',
    name: '증명사진_실패작',
    ext: '.png',
    icon: 'fluent-color:image-24',
    size: '320 KB',
    desc: '눈을 감았다. 다시 찍을 돈이 아까워 한참을 들여다보다가 결국 버렸다.',
  },
]
