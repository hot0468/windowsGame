import { useMemo, useState } from 'react'
import { dateOf } from '../../data/calendar'
import { desktopEntries } from '../../data/desktopItems'
import { EVENTS } from '../../data/events'
import { fakeSize, findItem } from '../../data/items'
import { FILMS } from '../../data/media'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import { useWindowStore } from '../../store/windowStore'
import { inventoryOf } from '../../systems/delivery'
import { isWorn, usesLeft } from '../../systems/gear'
import { artFileName, artGrade, artworksOf } from '../../systems/artwork'
import { postcardsOf } from '../../systems/cinema'
import { findProject, openProjects, pagesOf } from '../../systems/projects'
import { RANK_ORDER } from '../../systems/rank'
import { TRASH_FILES } from '../../data/trash'
import { folderProjectId, projectFolderId } from '../../types/game'
import type { Artwork, FolderId, GameState, IconName } from '../../types/game'
import { ContextMenu } from '../ContextMenu'
import './ExplorerApp.css'

/**
 * 아이템 인벤토리 · 사진첩.
 *
 * **UI는 윈도우 11 파일 탐색기 그대로다**(설계자 지시, 레퍼런스=실제 탐색기 스크린샷):
 * 주소 줄(경로 빵부스러기 + 검색) → 명령 모음 → (탐색 창 | 파일 목록) → 상태 표시줄.
 * 아이템은 확장자가 붙은 **파일**로 들어간다.
 *
 * ⚠️ 두 폴더가 한 컴포넌트인 이유: 다른 것은 **목록을 만드는 방법 하나뿐**이다.
 * 파일별로 컴포넌트를 나누면 탐색 창·주소줄·보기 전환이 두 벌이 되고, 한쪽만 고치는
 * 버그가 반드시 생긴다.
 *
 * ## 레퍼런스에서 **덜어낸 것**과 그 이유
 * ⚠️ **동작하지 않는 컨트롤은 그리지 않는다**(이 프로젝트의 규칙). 실제 탐색기의
 * - **탭 줄**: 창 타이틀 바가 이미 폴더 이름을 갖는다(같은 말이 두 번). [+]는 갈 데가 없다.
 * - **뒤로·앞으로·위로·새로 고침**: 이 게임의 폴더는 둘뿐이고 창 안에서 이동하지 않는다.
 *   목록은 항상 지금 상태에서 파생되므로 새로 고칠 것도 없다.
 * - **새로 만들기·잘라내기·복사·붙여넣기·이름 바꾸기·공유·삭제**: 게임에 뜻이 없다.
 *   플레이어가 인벤토리에서 물건을 지울 수 있으면 그건 UI가 아니라 규칙 변경이다.
 *
 * 남긴 것은 **전부 실제로 동작한다**: 검색은 목록을 거르고, 정렬·보기는 진짜로 바뀌며,
 * 열 제목을 누르면 그 열로 정렬된다(실제 탐색기와 같다).
 */

interface FolderMeta {
  label: string
  icon: IconName
  /** 파일이 하나도 없을 때의 안내. */
  empty: string
}

/** 고정 폴더 셋. ⚠️ **프로젝트 폴더는 여기 없다** — 개수가 정해져 있지 않아 데이터가 된다. */
const FIXED_FOLDERS = ['inventory', 'codex', 'gallery', 'postcard', 'trash'] as const
type FixedFolderId = (typeof FIXED_FOLDERS)[number]

const FOLDERS: Record<FixedFolderId, FolderMeta> = {
  inventory: {
    label: '아이템 인벤토리',
    icon: 'fluent-color:document-folder-24',
    empty: '아직 받은 물건이 없습니다. 인터넷 → 쇼핑에서 주문하면 다음 날 도착합니다.',
  },
  codex: {
    label: '사진첩',
    icon: 'fluent-color:image-24',
    empty: '아직 담긴 사진이 없습니다.',
  },
  gallery: {
    label: '갤러리',
    icon: 'fluent-color:design-ideas-24',
    empty: '아직 그린 그림이 없습니다. 클립스튜디오를 켜면 한 장씩 여기에 쌓입니다.',
  },
  postcard: {
    label: '포스트카드',
    icon: 'fluent-color:mail-multiple-24',
    empty: '아직 받은 포스트카드가 없습니다. 인터넷 → 시집이에서 영화를 보면 한 장씩 쌓입니다.',
  },
  /*
   * 휴지통. ⚠️ **아이콘만 단색(`mdi`)이다** — `fluent-color`에 휴지통 글리프가 없고,
   * 휴지통은 설치된 앱이 아니라 **셸 가구**라 시스템 글리프로 읽히는 것이 오히려 맞다
   * (단색이라 놓인 자리의 글자색을 그대로 물려받는다: 바탕화면에서는 흰색, 탐색기
   * 안에서는 `--os-text`. 새 색을 만들지 않는다).
   * ⚠️ **비우기 버튼이 없다** — 비우려면 `broken`을 지워야 하는데 그 목록이 "다시 사도
   * 효과 없음"의 근거라(`systems/delivery.ts`), 지우는 순간 되사기 구멍이 열린다.
   */
  trash: {
    label: '휴지통',
    icon: 'mdi:trash-can',
    empty: '휴지통이 비어 있습니다.',
  },
}

/**
 * 주소 줄에 그릴 경로. 마지막 칸이 지금 폴더다.
 * ⚠️ 문자열 하나로 적지 않는다 — 실제 탐색기의 빵부스러기는 칸마다 나뉜 조각이고,
 * 그래야 마지막 칸만 진하게(현재 위치) 그릴 수 있다.
 */
const crumbsOf = (meta: FolderMeta) => ['내 PC', '바탕 화면', meta.label]

/**
 * 그 폴더의 이름·아이콘·빈 안내.
 *
 * ⚠️ **작품집 폴더는 고정 목록에 없다**(플레이어가 원하는 만큼 만든다) — 그래서
 * `FOLDERS` 표를 색인하는 대신 이 함수 하나가 둘을 함께 판정한다. 화면 여러 곳이
 * 각자 `startsWith('project:')`를 적으면 한 곳이 반드시 낡는다.
 */
function metaOf(folderId: FolderId, state: GameState | null): FolderMeta {
  const projectId = folderProjectId(folderId)
  if (projectId) {
    const project = state ? findProject(state, projectId) : undefined
    return {
      label: project?.name ?? '작품집',
      icon: 'fluent-color:document-folder-24',
      empty: '아직 이 작품집에 넣은 장이 없습니다. 클립스튜디오에서 이 작품집을 골라 그리면 한 장씩 쌓입니다.',
    }
  }
  return FOLDERS[folderId as FixedFolderId]
}

/** 목록에 그릴 한 줄. 아이템과 사건을 같은 모양으로 눕힌다. */
interface Entry {
  id: string
  name: string
  ext: string
  icon: IconName
  size: string
  /** 크기 정렬용 바이트. 화면에 뜨는 것은 `size` 문구다. */
  bytes: number
  /** 얻은 날. 사건은 겪은 날이다. 미획득이면 undefined. */
  day?: number
  desc: string
  owned: boolean
}

/**
 * 파일 유형 칸. 실제 탐색기의 "파일 폴더"·"텍스트 문서" 자리이고,
 * ⚠️ **확장자에서 파생한다** — 물건마다 유형을 따로 적으면 확장자와 어긋난 줄이 생긴다.
 */
const typeOf = (ext: string) => `${ext.replace('.', '').toUpperCase()} 파일`

/** 크기 문구를 정렬용 숫자로. "12.4 KB" → 12400 정도면 순서에는 충분하다. */
function bytesOf(size: string): number {
  const n = parseFloat(size) || 0
  return size.includes('MB') ? n * 1024 * 1024 : n * 1024
}

/**
 * 그림 한 장의 파일 줄. **갤러리와 작품집 폴더가 함께 쓴다** — 같은 그림을 가리키는 다른
 * 자루일 뿐이라 파일 이름·크기·설명이 갈리면 "같은 그림인데 폴더마다 다른" 판이 된다.
 */
function artworkRow(work: Artwork): Entry {
  const grade = artGrade(work)
  return {
    id: work.id,
    name: artFileName(work),
    ext: '.png',
    icon: 'fluent-color:image-24',
    // 크기도 등급에서 파생시킨다 — 잘 그린 그림일수록 무겁다(무작위 금지).
    size: `${420 + RANK_ORDER.indexOf(grade) * 260} KB`,
    bytes: (420 + RANK_ORDER.indexOf(grade) * 260) * 1024,
    day: work.day,
    desc: `${work.day}일차 ${work.slot === 'morning' ? '오전' : '오후'}에 ${
      work.tool === 'lcd' ? '액정' : '팬'
    } 타블렛으로 그렸다. 그릴 때 예술 ${work.art} · 창의력 ${work.creativity} → ${grade}등급.`,
    owned: true,
  }
}

export function entriesOf(
  folder: FolderId,
  state: ReturnType<typeof useGameStore.getState>['state'],
): Entry[] {
  if (!state) return []

  /*
   * 휴지통. ⚠️ **새 상태를 만들지 않는다** — 다 쓰고 고장 난 장비(`broken`)가 지금까지
   * 아무 데도 안 남았는데, 그 잔해가 놓일 자리가 여기다.
   * ⚠️ **`sold`(중고마켓에 판 물건)는 넣지 않는다** — 판 것은 버린 것이 아니고, 둘을
   * 한 목록에 섞으면 나중에 왜 거기 있는지 아무도 답할 수 없다(`systems/gear.ts`가
   * 두 배열을 갈라 둔 것과 같은 판단). 고정 파일은 `data/trash.ts`가 진다.
   */
  if (folder === 'trash') {
    const junk: Entry[] = (state.broken ?? []).flatMap((id) => {
      const item = findItem(id)
      if (!item) return []
      const size = fakeSize(item)
      return [
        {
          id,
          name: item.name,
          ext: item.ext,
          icon: item.icon,
          size,
          bytes: bytesOf(size),
          /* ⚠️ 날짜 칸은 비운다 — 고장 난 날은 어디에도 기록돼 있지 않고,
             화면을 채우려고 지어내면 그 순간 거짓말하는 열이 된다. */
          desc: `다 써서 고장 났다. ${item.desc}`,
          owned: true,
        },
      ]
    })
    return [
      ...junk,
      ...TRASH_FILES.map((f) => ({
        id: f.id,
        name: f.name,
        ext: f.ext,
        icon: f.icon,
        size: f.size,
        bytes: bytesOf(f.size),
        desc: f.desc,
        owned: true,
      })),
    ]
  }

  if (folder === 'inventory') {
    // 인벤토리는 **가진 것만** 보여 준다. 안 산 물건까지 흐리게 늘어놓으면
    // 폴더가 아니라 상품 목록이 된다 — 그건 쇼핑 사이트의 몫이다.
    return inventoryOf(state).flatMap((got) => {
      const item = findItem(got.id)
      if (!item) return []
      const size = fakeSize(item)
      /* 닳는 장비는 **남은 횟수를 설명 뒤에 붙인다.** 고장에 무작위가 없는 이유가
         "몇 번 남았는지 언제든 셀 수 있다"는 것이라(`data/gear.ts`), 셀 자리가 없으면
         그 규칙이 화면에서는 그냥 사고가 된다. 새 열도 새 화면도 만들지 않는다. */
      const left = usesLeft(state, got.id)
      const wearNote =
        left === undefined ? '' : isWorn(state, got.id) ? ` (앞으로 ${left}번 쓰면 못 쓴다)` : ` (남은 사용 ${left}회)`
      return [
        {
          id: got.id,
          name: item.name,
          ext: item.ext,
          icon: item.icon,
          size,
          bytes: bytesOf(size),
          day: got.day,
          desc: item.desc + wearNote,
          owned: true,
        },
      ]
    })
  }

  /*
   * 작품집 폴더. ⚠️ **갤러리와 같은 줄 모양을 쓴다** — 같은 그림을 가리키는 다른 자루일
   * 뿐이라 파일 이름도 등급 표시도 갈리면 안 된다(`artFileName` 하나가 정한다).
   */
  const projectId = folderProjectId(folder)
  if (projectId && state) {
    const project = findProject(state, projectId)
    return project ? pagesOf(state, project).map((work) => artworkRow(work)) : []
  }

  /*
   * 포스트카드. 갤러리·인벤토리와 같은 부류다(**받은 것만** 보여 준다).
   * ⚠️ **영화의 사실을 복사해 두지 않는다** — 제목·태그라인은 `FILMS`가 단일 출처이고
   * 여기서는 id로 되찾는다(`Postcard.filmId`). 없는 영화를 가리키는 장은 조용히 건너뛴다.
   */
  if (folder === 'postcard') {
    return postcardsOf(state).flatMap((card) => {
      const film = FILMS.find((f) => f.id === card.filmId)
      if (!film) return []
      // 크기도 상영 시간에서 파생시킨다 — 긴 영화일수록 무겁다(무작위 금지).
      const size = `${film.runtime * 8} KB`
      return [
        {
          id: card.filmId,
          name: `${film.title} 포스트카드`,
          ext: '.png',
          icon: 'fluent-color:image-24',
          size,
          bytes: bytesOf(size),
          day: card.day,
          desc: `${card.day}일차에 시집이에서 관람하고 받았다. ${film.tagline}`,
          owned: true,
        },
      ]
    })
  }

  if (folder === 'gallery') {
    /*
     * 갤러리는 인벤토리와 같은 부류다 — **그린 것만** 보여 준다(안 그린 그림은 없다).
     *
     * ⚠️ **등급이 파일 이름에 박혀 있다**(`artFileName`). 열을 하나 더 만들지 않은 이유는
     * 이 컴포넌트가 폴더 셋의 공용 부품이라 갤러리만을 위한 열을 더하면 나머지 둘에
     * 빈 칸이 생기기 때문이다. 이름에 넣으면 **검색도 정렬도 그대로 동작한다**
     * (`습작_A`를 'A'로 검색하면 A등급만 걸린다).
     * ⚠️ 등급은 저장값이 아니라 계산값이다 — 규칙은 `systems/artwork.ts` 하나가 갖는다.
     */
    return artworksOf(state).map(artworkRow)
  }

  // 도감은 **안 겪은 것도 자리를 남긴다** — 빈 칸이 있어야 채울 마음이 생긴다.
  const log = new Map((state.events ?? []).map((e) => [e.id, e.day]))
  return EVENTS.map((e) => ({
    id: e.id,
    name: e.name,
    ext: e.ext,
    icon: e.icon,
    size: '1 KB',
    bytes: 1024,
    day: log.get(e.id),
    desc: log.has(e.id) ? e.desc : e.hint,
    owned: log.has(e.id),
  }))
}

function formatDay(day: number | undefined): string {
  if (day === undefined) return '—'
  const d = dateOf(day)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

/** 정렬 기준. 열 제목과 [정렬] 메뉴가 **같은 목록**을 쓴다(두 곳에 적으면 갈라진다). */
const SORTS = [
  { key: 'name', label: '이름' },
  { key: 'day', label: '수정한 날짜' },
  { key: 'type', label: '유형' },
  { key: 'size', label: '크기' },
] as const
type SortKey = (typeof SORTS)[number]['key']

function compare(a: Entry, b: Entry, key: SortKey): number {
  switch (key) {
    case 'day':
      return (a.day ?? 0) - (b.day ?? 0)
    case 'type':
      return typeOf(a.ext).localeCompare(typeOf(b.ext), 'ko')
    case 'size':
      return a.bytes - b.bytes
    default:
      return a.name.localeCompare(b.name, 'ko')
  }
}

export function ExplorerApp({ folderId }: { folderId: FolderId }) {
  const state = useGameStore((s) => s.state)
  const open = useWindowStore((s) => s.open)
  /** 보기 방식. 실제 탐색기의 [보기] 메뉴와 같은 역할이고 **실제로 동작한다**. */
  const [view, setView] = useState<'icons' | 'details'>('icons')
  const [selected, setSelected] = useState<string | null>(null)
  /** 검색어. 실제 탐색기의 우상단 검색 상자와 같이 **목록을 거른다**. */
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: 'name', asc: true })
  /** 열려 있는 명령 모음 메뉴. 좌표는 누른 버튼 아래다(우클릭 메뉴와 같은 부품을 쓴다). */
  const [menu, setMenu] = useState<{ kind: 'sort' | 'view'; x: number; y: number } | null>(null)

  /**
   * 탐색 창에 그릴 폴더. ⚠️ **`FOLDERS`를 통째로 나열하지 않는다** — 갤러리는 타블렛을
   * 사야 생기는 폴더라, 없는 사람에게 보여 주면 "없는 폴더는 적지 않는다"는 이 파일의
   * 규칙이 깨진다. 판정은 바탕화면과 **같은 함수**(`desktopEntries`)에서 파생시킨다 —
   * 여기서 조건을 다시 적으면 아이콘은 없는데 트리에는 있는 상태가 생긴다.
   * (지금 열려 있는 폴더는 조건과 무관하게 항상 남긴다 — 자기 자리는 트리에 있어야 한다.)
   */
  const navFolders = useMemo(() => {
    const owned = (state?.inventory ?? []).map((i) => i.id)
    const visible = desktopEntries([], owned).flatMap((e) =>
      !e.shortcut && e.item.folderId ? [e.item.folderId] : [],
    )
    /* ⚠️ **포스트카드 폴더는 바탕화면에 아이콘이 없다** — 받은 장이 있을 때만 트리에
       올린다(없는 폴더는 적지 않는다는 이 파일의 규칙. 갤러리가 타블렛을 사야 생기는 것과
       같은 자리이고, 다른 점은 조건이 물건이 아니라 상태라는 것뿐이다). */
    const hasCards = (state?.postcards ?? []).length > 0
    const fixed = (Object.keys(FOLDERS) as FolderId[]).filter(
      (id) =>
        id === folderId || (id === 'postcard' ? hasCards : visible.includes(id)),
    )
    /*
     * ⚠️ **작업 중인 작품집만 트리에 올린다.** 공모전에 냈거나 회지로 판 권(`usedFor`)은
     * 목록에서 빠지는데, **지금 열려 있는 폴더면 남긴다** — 자기 자리는 트리에 있어야 한다
     * (갤러리를 그렇게 다루는 것과 같은 규칙).
     */
    const projects = state ? openProjects(state).map((p) => projectFolderId(p.id)) : []
    const here = folderProjectId(folderId) && !projects.includes(folderId) ? [folderId] : []
    return [...fixed, ...projects, ...here]
  }, [state, folderId])

  const meta = metaOf(folderId, state)
  const all = entriesOf(folderId, state)
  const q = query.trim()
  const entries = all
    .filter((e) => (q ? (e.name + e.ext).includes(q) : true))
    .sort((a, b) => (sort.asc ? 1 : -1) * compare(a, b, sort.key))
  const picked = entries.find((e) => e.id === selected)

  /** 버튼 아래에 메뉴를 연다. 좌표는 뷰포트 기준이라야 한다(ContextMenu 계약). */
  const openMenu = (kind: 'sort' | 'view', el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    setMenu({ kind, x: r.left, y: r.bottom + 2 })
  }

  /** 열 제목 클릭 = 그 열로 정렬. 같은 열을 다시 누르면 방향이 뒤집힌다(실제 탐색기와 같다). */
  const sortBy = (key: SortKey) =>
    setSort((s) => ({ key, asc: s.key === key ? !s.asc : true }))

  return (
    <div className="ex">
      {/* ── 주소 줄: 경로 빵부스러기 + 검색 ─────────────────────── */}
      <div className="ex-bar">
        <div className="ex-crumbs">
          <AppIcon name={meta.icon} size={16} />
          {crumbsOf(meta).map((c, i, arr) => (
            <span key={c} className={i === arr.length - 1 ? 'ex-crumb ex-crumb-on' : 'ex-crumb'}>
              {c}
              {/* 구분자는 글자가 아니라 그림이다 — 스크린 리더가 "꺾쇠"를 읽지 않게 한다. */}
              <span className="ex-crumb-sep" aria-hidden="true" />
            </span>
          ))}
        </div>

        <div className="ex-search">
          <AppIcon name="mdi:magnify" size={16} className="ex-search-icon" />
          <input
            className="ex-search-input"
            type="search"
            value={query}
            placeholder={`${meta.label} 검색`}
            aria-label={`${meta.label} 검색`}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* ── 명령 모음 ───────────────────────────────────────────── */}
      <div className="ex-cmd">
        <button
          type="button"
          className="ex-cmd-btn"
          aria-haspopup="menu"
          aria-expanded={menu?.kind === 'sort'}
          onClick={(e) => openMenu('sort', e.currentTarget)}
        >
          <AppIcon name="mdi:sort" size={16} />
          정렬
          <span className="ex-caret" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="ex-cmd-btn"
          aria-haspopup="menu"
          aria-expanded={menu?.kind === 'view'}
          onClick={(e) => openMenu('view', e.currentTarget)}
        >
          <AppIcon name="mdi:view-list-outline" size={16} />
          보기
          <span className="ex-caret" aria-hidden="true" />
        </button>
      </div>

      <div className="ex-main">
        {/*
          탐색 창. 실제 탐색기의 트리와 같은 들여쓰기이지만 **없는 폴더는 적지 않는다** —
          다운로드·음악처럼 이 게임에 없는 항목을 늘어놓으면 눌러도 갈 데가 없다.
        */}
        <nav className="ex-nav" aria-label="탐색 창">
          <p className="ex-nav-root">
            <AppIcon name="mdi:monitor" size={16} />내 PC
          </p>
          <p className="ex-nav-group">바탕 화면</p>
          {navFolders.map((id) => (
            <button
              key={id}
              type="button"
              className={`ex-nav-item${id === folderId ? ' ex-nav-item-on' : ''}`}
              aria-current={id === folderId ? 'true' : undefined}
              onClick={() => {
                if (id === folderId) return
                open({
                  id: `folder-${id}`,
                  kind: 'folder',
                  title: metaOf(id, state).label,
                  icon: metaOf(id, state).icon,
                  folderId: id,
                  x: 200,
                  y: 100,
                  width: 720,
                })
              }}
            >
              <AppIcon name={metaOf(id, state).icon} size={16} />
              {metaOf(id, state).label}
            </button>
          ))}
        </nav>

        <div className="ex-files" onClick={() => setSelected(null)}>
          {view === 'details' && (
            /* 열 제목. 자리를 지키려고 목록이 비어도 그대로 둔다(실제 탐색기와 같다). */
            <div className="ex-head" role="row">
              {SORTS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className={`ex-th ex-th-${c.key}`}
                  aria-sort={
                    sort.key === c.key ? (sort.asc ? 'ascending' : 'descending') : 'none'
                  }
                  onClick={(e) => {
                    e.stopPropagation()
                    sortBy(c.key)
                  }}
                >
                  {c.label}
                  {/* 정렬 방향은 색이 아니라 **모양**으로 알린다(ux `color-not-only`). */}
                  {sort.key === c.key && (
                    <span
                      className={`ex-sort-mark${sort.asc ? '' : ' ex-sort-desc'}`}
                      aria-hidden="true"
                    />
                  )}
                </button>
              ))}
            </div>
          )}

          {entries.length === 0 ? (
            <p className="ex-empty">{q ? `"${q}"에 맞는 항목이 없습니다.` : meta.empty}</p>
          ) : view === 'icons' ? (
            <ul className="ex-grid">
              {entries.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    className={`ex-file${selected === e.id ? ' ex-file-on' : ''}${
                      e.owned ? '' : ' ex-file-locked'
                    }`}
                    title={e.desc}
                    onClick={(ev) => {
                      ev.stopPropagation()
                      setSelected(e.id)
                    }}
                  >
                    <AppIcon name={e.icon} size={40} />
                    <span className="ex-file-name">
                      {e.name}
                      {e.ext}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="ex-rows">
              {entries.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    className={`ex-row${selected === e.id ? ' ex-row-on' : ''}${
                      e.owned ? '' : ' ex-row-locked'
                    }`}
                    title={e.desc}
                    onClick={(ev) => {
                      ev.stopPropagation()
                      setSelected(e.id)
                    }}
                  >
                    <span className="ex-td ex-th-name">
                      <AppIcon name={e.icon} size={16} />
                      <span className="ex-row-name">
                        {e.name}
                        {e.ext}
                      </span>
                    </span>
                    <span className="ex-td ex-th-day">{formatDay(e.day)}</span>
                    <span className="ex-td ex-th-type">{typeOf(e.ext)}</span>
                    <span className="ex-td ex-th-size ex-num">{e.size}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 상태 표시줄. 왼쪽은 실제 탐색기와 같은 항목 수, 오른쪽은 고른 파일의 설명이다. */}
      <footer className="ex-status">
        <span className="ex-count">
          {entries.length}개 항목
          {q && ` (전체 ${all.length}개 중 검색됨)`}
        </span>
        {picked ? (
          <span className="ex-status-desc">
            <strong>
              {picked.name}
              {picked.ext}
            </strong>{' '}
            {picked.desc}
          </span>
        ) : (
          <span className="ex-status-hint">파일을 선택하면 설명이 표시됩니다.</span>
        )}
      </footer>

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          label={menu.kind === 'sort' ? '정렬 기준' : '보기 방식'}
          items={
            menu.kind === 'sort'
              ? SORTS.map((c) => ({
                  id: c.key,
                  label: sort.key === c.key ? `${c.label} (지금)` : c.label,
                  onSelect: () => sortBy(c.key),
                }))
              : [
                  {
                    id: 'icons',
                    label: view === 'icons' ? '큰 아이콘 (지금)' : '큰 아이콘',
                    onSelect: () => setView('icons'),
                  },
                  {
                    id: 'details',
                    label: view === 'details' ? '자세히 (지금)' : '자세히',
                    onSelect: () => setView('details'),
                  },
                ]
          }
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  )
}
