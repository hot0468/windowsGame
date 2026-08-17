import type { IconName } from '../types/game'

/**
 * 숨김 파일 — 탐색기 [보기] > 숨긴 항목을 켜야 보이는 고정 파일(2026-08-17).
 *
 * 실제 윈도우의 `Thumbs.db`·`desktop.ini` 감성에, **이 컴퓨터를 먼저 쓰던 사람의
 * 흔적**(회차 메타의 로어)을 한 줄 섞는다. 찾는 재미가 전부인 이스터에그다.
 *
 * ⚠️ **게임 상태에 영향이 없다**(`data/trash.ts`와 같은 규칙 — 읽을거리다).
 * ⚠️ **항상 있는 폴더에만 놓는다**(inventory·codex·trash) — 갤러리·포스트카드는
 *    조건부 폴더라 숨김 조건까지 겹치면 "왜 안 보이나"에 답할 수 없다.
 * ⚠️ 아이콘은 이미 쓰는 이름만 재사용한다(새 글리프를 늘릴 이유가 없는 장식 파일들이다).
 */
export interface HiddenFile {
  id: string
  /** 어느 폴더에 숨어 있나. `ExplorerApp`의 고정 폴더 id와 같은 문자열이다. */
  folder: 'inventory' | 'codex' | 'trash'
  name: string
  ext: string
  icon: IconName
  /** 파일 목록의 크기 칸(`TrashFile.size`와 같은 규칙 — 정렬 숫자는 화면이 뽑는다). */
  size: string
  desc: string
}

export const HIDDEN_FILES: readonly HiddenFile[] = [
  {
    id: 'hidden-desktop-ini',
    folder: 'inventory',
    name: 'desktop',
    ext: '.ini',
    icon: 'fluent-color:document-text-24',
    size: '1 KB',
    desc: '폴더의 겉모습을 정하는 시스템 파일. 열어 보면 [.ShellClassInfo] 한 줄 — 뜻은 몰라도 지우면 안 된다는 것만 안다.',
  },
  {
    id: 'hidden-thumbs-db',
    folder: 'codex',
    name: 'Thumbs',
    ext: '.db',
    icon: 'fluent-color:image-24',
    size: '96 KB',
    desc: '사진첩이 스스로 만든 썸네일 캐시. 지운 사진의 흔적이 여기엔 아직 남아 있다고 한다.',
  },
  {
    id: 'hidden-old-save',
    folder: 'trash',
    name: '이어하기.sav',
    ext: '.bak',
    icon: 'fluent-color:document-24',
    size: '1.2 MB',
    desc: '이 컴퓨터를 먼저 쓰던 누군가의 세이브 백업. 마지막 저장 시각은 아주 늦은 밤이었다.',
  },
]
