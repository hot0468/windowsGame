import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 가짜 브라우저의 즐겨찾기 목록.
 *
 * **왜 창 로컬 state가 아니라 스토어인가:** 뒤로/앞으로 이력은 창 하나의 휘발 상태라
 * `BrowserApp`의 `useState`로 두었지만, 즐겨찾기는 창을 닫았다 열어도 남아 있어야 한다.
 * 별표를 눌러 추가한 것이 창을 닫는 순간 사라지면 버그로 읽힌다.
 *
 * **왜 metaStore가 아닌가:** metaStore는 "엔딩 도감" 전용이다. 성격이 다른 상태를 밀어 넣으면
 * 저장 키 하나에 서로 무관한 것들이 쌓인다.
 *
 * ⚠️ **기본 즐겨찾기는 없다**(설계자 지시). 플레이어가 별표로 직접 등록한다 —
 * 미리 채워 두면 "내가 고른 것"이라는 감각이 사라지고, 비어 있는 줄이 별표를 쓰라는
 * 안내가 된다(`BrowserApp`의 빈 상태 문구). `sites.ts`의 `bookmark` 플래그는 이제
 * **네이놈 포털 홈의 카테고리 줄**만 담당한다.
 * 게임 진행과 무관하므로 `gameStore`의 세이브가 아니라 별도 키로 영구 보존한다.
 */
interface BrowserStore {
  /** 즐겨찾기 줄에 그릴 사이트 id. 배열 순서가 곧 표시 순서다. */
  bookmarks: string[]
  /**
   * 개발자 모드. 켜면 브라우저 아래에 현재 페이지의 내부 상태가 붙는다.
   *
   * 진짜 개발자 도구를 흉내 내지 않는다(DOM 트리·네트워크 탭은 우리 게임에 없는 것이다).
   * 대신 **이 가짜 브라우저가 실제로 들고 있는 값**을 보여 준다 — 사이트 id·렌더 종류·
   * 이력·게임 턴. 만드는 사람이 화면과 데이터가 어긋났는지 바로 볼 수 있어야 한다.
   */
  devMode: boolean
  toggleDevMode: () => void
  isBookmarked: (siteId: string) => boolean
  /** 있으면 빼고 없으면 뒤에 붙인다. */
  toggleBookmark: (siteId: string) => void
}

export const useBrowserStore = create<BrowserStore>()(
  persist(
    (set, get) => ({
      bookmarks: [],
      devMode: false,

      toggleDevMode: () => set((s) => ({ devMode: !s.devMode })),

      isBookmarked: (siteId) => get().bookmarks.includes(siteId),

      toggleBookmark: (siteId) =>
        set((s) => ({
          bookmarks: s.bookmarks.includes(siteId)
            ? s.bookmarks.filter((id) => id !== siteId)
            : [...s.bookmarks, siteId],
        })),
    }),
    {
      name: 'windows-game-browser',
      // v1은 sites.ts의 bookmark 플래그로 5개를 미리 채웠다. 기본값을 없앴으므로
      // 이미 저장된 그 목록도 비워야 한다 — 안 그러면 예전에 열어 본 사람만 계속 보인다.
      version: 2,
      migrate: () => ({ bookmarks: [], devMode: false }),
    },
  ),
)
