import { useState } from 'react'
import { dateOf } from '../../data/calendar'
import { EVENTS } from '../../data/events'
import { fakeSize, findItem } from '../../data/items'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import { useWindowStore } from '../../store/windowStore'
import { inventoryOf } from '../../systems/delivery'
import type { FolderId, IconName } from '../../types/game'
import './ExplorerApp.css'

/**
 * 아이템 인벤토리 · 이벤트 도감.
 *
 * **UI는 윈도우 파일 탐색기와 같다**(설계자 지시): 도구 모음 → 주소 표시줄 → 탐색 창 +
 * 파일 목록 → 상태 표시줄. 아이템은 확장자가 붙은 **파일**로 들어간다.
 *
 * ⚠️ 두 폴더가 한 컴포넌트인 이유: 다른 것은 **목록을 만드는 방법 하나뿐**이다.
 * 파일별로 컴포넌트를 나누면 탐색 창·주소줄·보기 전환이 두 벌이 되고, 한쪽만 고치는
 * 버그가 반드시 생긴다.
 *
 * 도구 모음 글리프는 **표시만 하지 않는다** — 눌러서 동작하는 것만 버튼으로 둔다
 * (보기 전환·폴더 이동). 실제 탐색기의 잘라내기·붙여넣기는 이 게임에 뜻이 없으므로
 * 아예 그리지 않는다: 눌러도 아무 일 없는 컨트롤이 진짜 탐색기다움을 깎는다.
 */

interface FolderMeta {
  label: string
  icon: IconName
  /** 주소 표시줄에 그릴 경로. */
  path: string
  /** 파일이 하나도 없을 때의 안내. */
  empty: string
}

const FOLDERS: Record<FolderId, FolderMeta> = {
  inventory: {
    label: '아이템 인벤토리',
    icon: 'fluent-color:document-folder-24',
    path: '내 PC \\ 바탕 화면 \\ 아이템 인벤토리',
    empty: '아직 받은 물건이 없습니다. 인터넷 → 쇼핑에서 주문하면 다음 날 도착합니다.',
  },
  codex: {
    label: '이벤트 도감',
    icon: 'fluent-color:document-folder-24',
    path: '내 PC \\ 바탕 화면 \\ 이벤트 도감',
    empty: '아직 기록된 사건이 없습니다.',
  },
}

/** 목록에 그릴 한 줄. 아이템과 사건을 같은 모양으로 눕힌다. */
interface Entry {
  id: string
  name: string
  ext: string
  icon: IconName
  size: string
  /** 얻은 날. 사건은 겪은 날이다. 미획득이면 undefined. */
  day?: number
  desc: string
  owned: boolean
}

function entriesOf(folder: FolderId, state: ReturnType<typeof useGameStore.getState>['state']): Entry[] {
  if (!state) return []

  if (folder === 'inventory') {
    // 인벤토리는 **가진 것만** 보여 준다. 안 산 물건까지 흐리게 늘어놓으면
    // 폴더가 아니라 상품 목록이 된다 — 그건 쇼핑 사이트의 몫이다.
    return inventoryOf(state).flatMap((got) => {
      const item = findItem(got.id)
      if (!item) return []
      return [
        {
          id: got.id,
          name: item.name,
          ext: item.ext,
          icon: item.icon,
          size: fakeSize(item),
          day: got.day,
          desc: item.desc,
          owned: true,
        },
      ]
    })
  }

  // 도감은 **안 겪은 것도 자리를 남긴다** — 빈 칸이 있어야 채울 마음이 생긴다.
  const log = new Map((state.events ?? []).map((e) => [e.id, e.day]))
  return EVENTS.map((e) => ({
    id: e.id,
    name: e.name,
    ext: e.ext,
    icon: e.icon,
    size: '1 KB',
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

export function ExplorerApp({ folderId }: { folderId: FolderId }) {
  const state = useGameStore((s) => s.state)
  const open = useWindowStore((s) => s.open)
  /** 보기 방식. 실제 탐색기의 [보기] 메뉴와 같은 역할이고 **실제로 동작한다**. */
  const [view, setView] = useState<'icons' | 'details'>('icons')
  const [selected, setSelected] = useState<string | null>(null)

  const meta = FOLDERS[folderId]
  const entries = entriesOf(folderId, state)
  const picked = entries.find((e) => e.id === selected)

  return (
    <div className="ex">
      <div className="ex-toolbar">
        <button type="button" className="ex-tool" onClick={() => setView('icons')} aria-pressed={view === 'icons'}>
          <AppIcon name="mdi-light:grid" size={18} />
          큰 아이콘
        </button>
        <button
          type="button"
          className="ex-tool"
          onClick={() => setView('details')}
          aria-pressed={view === 'details'}
        >
          <AppIcon name="mdi-light:format-list-bulleted" size={18} />
          자세히
        </button>
      </div>

      <div className="ex-address">
        <AppIcon name={meta.icon} size={16} />
        <span className="ex-path">{meta.path}</span>
      </div>

      <div className="ex-main">
        <nav className="ex-nav" aria-label="탐색 창">
          <p className="ex-nav-head">바탕 화면</p>
          {(Object.keys(FOLDERS) as FolderId[]).map((id) => (
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
                  title: FOLDERS[id].label,
                  icon: FOLDERS[id].icon,
                  folderId: id,
                  x: 200,
                  y: 100,
                  width: 720,
                })
              }}
            >
              <AppIcon name={FOLDERS[id].icon} size={18} />
              {FOLDERS[id].label}
            </button>
          ))}
        </nav>

        <div className="ex-files" onClick={() => setSelected(null)}>
          {entries.length === 0 ? (
            <p className="ex-empty">{meta.empty}</p>
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
            <table className="ex-table">
              <thead>
                <tr>
                  <th scope="col">이름</th>
                  <th scope="col">수정한 날짜</th>
                  <th scope="col">크기</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr
                    key={e.id}
                    className={`${selected === e.id ? 'ex-row-on' : ''}${
                      e.owned ? '' : ' ex-row-locked'
                    }`}
                    onClick={(ev) => {
                      ev.stopPropagation()
                      setSelected(e.id)
                    }}
                  >
                    <td>
                      <AppIcon name={e.icon} size={20} />
                      {e.name}
                      {e.ext}
                    </td>
                    <td>{formatDay(e.day)}</td>
                    <td className="ex-num">{e.size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 상태 표시줄. 고른 파일의 설명이 여기 뜬다 — 탐색기의 '자세히' 창과 같은 자리다. */}
      <footer className="ex-status">
        <span>{entries.length}개 항목</span>
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
    </div>
  )
}
