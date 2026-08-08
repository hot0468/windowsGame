import { useState } from 'react'
import { CAREERS } from '../../data/careers'
import { ENDINGS } from '../../data/endings'
import { CAREER_LEVEL_DAYS, CAREER_MAX_LEVEL } from '../../data/careers'
import { STAT_NAMES } from '../../types/game'
import { attendedCount, careerLevel, heldCareer, toNextCareerLevel } from '../../systems/careerLog'
import { achievementProgress } from '../../systems/achievements'
import { affectionOf, hasRelationEnding } from '../../systems/affection'
import { AFFECTION_FOR_ENDING, AFFECTION_PER_MEET, PEOPLE } from '../../data/relations'
import { findActivity } from '../../data/activities'
import { EPISODE_PAY, SERIES_TITLE, STUDIO_NAME, WEEKLY_PAGES, webtoonLevel } from '../../systems/webtoon'
import { useGameStore } from '../../store/gameStore'
import { useMetaStore } from '../../store/metaStore'
import type { Ending } from '../../data/endings'
import type { GameState } from '../../types/game'
import './ExcelApp.css'

/**
 * 도감 — **엑셀 판형의 표 창.** 레퍼런스는 실제 엑셀이고 **레퍼런스가 스펙이다**.
 *
 * ## 왜 폴더가 아니라 표인가
 * 사진첩(이벤트 도감)은 파일 격자라 사진 한 장이 곧 항목이지만, 직업·엔딩은 **항목마다
 * 값이 여럿이다**(레벨·급여·종류·조건). 격자로 그리면 그 값들이 갈 자리가 없다.
 *
 * ## 레퍼런스에서 덜어낸 것 (장식 금지)
 * ⚠️ **리본(홈·삽입·수식 탭)을 그리지 않는다.** 누를 것이 없으므로 통째로 죽은 컨트롤이
 * 된다. 파일 이름도 안 그린다 — **진짜 타이틀 바가 이름표를 진다**(`ToolRun`과 같은 판단).
 * 남긴 엑셀 부품은 셋이고 **전부 실제로 동작하거나 실제 값을 읽는다**:
 * - **수식 입력줄**: 고른 행의 전문을 적는다(엔딩 본문은 길어서 셀에 안 들어간다).
 * - **시트 탭**: 직업/엔딩을 실제로 가른다.
 * - **상태 표시줄**: 그 시트의 달성 수를 센다.
 * 열 머리(A·B·C)와 행 번호는 컨트롤이 아니라 **격자의 생김새**라 표시 전용으로 둔다.
 *
 * ## 회색과 검정
 * ⚠️ 설계자 지시: **기본은 회색, 한 번 겪은 것은 검정으로 활성화된다.** 다만 색만으로
 * 알리지 않는다(ux `color-not-only`) — 마지막 열이 그 사실을 글자로도 적는다.
 * 회색은 `#6E6E6E`다(흰 판 위 5.1:1, AA 통과) — 더 옅게 하면 규칙을 어긴다.
 *
 * ## 무엇을 감추고 무엇을 보여 주는가
 * - **직업**은 전부 보여 준다. 벼룩장터에 공개된 공고라 감출 것이 애초에 없다.
 * - **엔딩은 이름만 보여 주고 조건·본문은 감춘다**(`???`). 설계 결정 "엔딩 공개: 비공개"가
 *   지키려던 것은 **도달하는 법과 그 끝의 문장**이지 목록의 존재가 아니다.
 *
 * ⚠️ **읽기 전용 창이다.** `gameStore`를 읽기만 하고 턴·스탯을 건드리지 않는다.
 */

type SheetId = 'career' | 'ending' | 'achievement' | 'relation'

/** 표 한 줄. 시트가 둘이지만 그리는 코드는 하나다 — 열 이름만 시트가 갖는다. */
interface Row {
  key: string
  cells: string[]
  /** 한 번 겪었는가. 검정/회색과 마지막 열의 글자를 함께 정한다. */
  done: boolean
  /** 수식 입력줄에 뜰 전문. */
  detail: string
}

interface Sheet {
  id: SheetId
  label: string
  columns: string[]
  rows: Row[]
  /** 상태 표시줄 문구. "몇 개 중 몇 개"는 시트마다 세는 대상이 다르다. */
  countLabel: (done: number, total: number) => string
}

export function ExcelApp() {
  const state = useGameStore((s) => s.state)
  const unlockedEndings = useMetaStore((s) => s.unlockedEndings)
  const unlockedRelations = useMetaStore((s) => s.unlockedRelations)
  const [sheetId, setSheetId] = useState<SheetId>('career')
  /** 고른 행. 엑셀에서 셀 하나를 고른 것과 같고, 수식 입력줄이 그 값을 적는다. */
  const [picked, setPicked] = useState<string | null>(null)

  if (!state) return null

  /* ⚠️ **엔딩 집합을 한 번만 만들어 두 시트가 나눠 쓴다** — 업적 '모든 끝을 본 사람'이
     엔딩 시트와 다른 수를 말하면 같은 창 안에서 두 표가 서로를 반박한다. */
  const seenEndings = new Set([...(state.seenEndingIds ?? []), ...unlockedEndings])
  const sheets: Sheet[] = [
    careerSheet(state),
    endingSheet(seenEndings),
    achievementSheet(state, seenEndings),
    relationSheet(state, unlockedRelations),
  ]
  const sheet = sheets.find((s) => s.id === sheetId) ?? sheets[0]
  const doneCount = sheet.rows.filter((r) => r.done).length
  const selected = sheet.rows.find((r) => r.key === picked)

  return (
    <div className="xls">
      {/* 수식 입력줄. 이름 상자에는 고른 셀의 좌표가 들어간다(엑셀과 같다). */}
      <div className="xls-formula">
        <span className="xls-namebox">
          {selected ? `A${sheet.rows.indexOf(selected) + 1}` : '—'}
        </span>
        <span className="xls-fx" aria-hidden="true">
          fx
        </span>
        <p className="xls-formula-text" role="status">
          {selected ? selected.detail : '행을 누르면 여기에 내용이 나옵니다.'}
        </p>
      </div>

      <div className="xls-scroll">
        <table className="xls-grid">
          <caption className="xls-sr">{sheet.label} 도감</caption>
          <thead>
            {/* 엑셀의 A·B·C 열 머리. 표시 전용이라 읽어 주지 않는다. */}
            <tr aria-hidden="true" className="xls-alpha">
              <th className="xls-corner" />
              {sheet.columns.map((_, i) => (
                <th key={i}>{String.fromCharCode(65 + i)}</th>
              ))}
            </tr>
            <tr>
              <th className="xls-corner" aria-hidden="true" />
              {sheet.columns.map((c) => (
                <th key={c} scope="col">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheet.rows.map((row, i) => (
              <tr
                key={row.key}
                className={[
                  'xls-row',
                  row.done ? 'xls-on' : 'xls-off',
                  row.key === picked ? 'xls-picked' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-selected={row.key === picked}
                tabIndex={0}
                onClick={() => setPicked(row.key)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setPicked(row.key)
                  }
                }}
              >
                <th scope="row" className="xls-rownum" aria-hidden="true">
                  {i + 1}
                </th>
                {row.cells.map((cell, ci) => (
                  <td key={ci}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="xls-bottom">
        <div className="xls-tabs" role="tablist" aria-label="도감 시트">
          {sheets.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={s.id === sheetId}
              className={`xls-tab${s.id === sheetId ? ' xls-tab-on' : ''}`}
              onClick={() => {
                setSheetId(s.id)
                setPicked(null)
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="xls-status">{sheet.countLabel(doneCount, sheet.rows.length)}</p>
      </div>
    </div>
  )
}

/**
 * 직업 시트. **이번 판의 기록이라 새 게임이면 전부 회색이다**(설계자 지시).
 *
 * ⚠️ 급여를 여기서 다시 적지 않는다 — `Career.salary`를 그대로 읽는다.
 * 레벨 규칙도 여기 없다(`systems/careerLog.ts`).
 *
 * ⚠️ **마지막 줄은 공고가 아니라 웹툰 연재다.** 벼룩장터에 없고 출근부도 급여일도 없지만
 * "이번 판에 무엇으로 먹고살아 봤는가"를 묻는 표라 빠지면 표가 거짓이 된다. 그래서 행만
 * 여기서 만들고 **레벨·경험 판정은 `systems/webtoon.ts`가 한다**(두 번째 판정 금지).
 */
function careerSheet(state: GameState): Sheet {
  return {
    id: 'career',
    label: '직업',
    columns: ['회사', '직함', '급여', '레벨', '상태'],
    rows: [...CAREERS.map((career) => {
      const held = heldCareer(state, career.id)
      const level = careerLevel(state, career.id)
      const attended = attendedCount(state, career.id)
      const toNext = toNextCareerLevel(state, career.id)
      return {
        key: career.id,
        done: held,
        cells: [
          career.company,
          career.title,
          `${career.salary.toLocaleString('ko-KR')}원`,
          level === undefined ? '—' : `Lv.${level}`,
          held ? '경험함' : '미경험',
        ],
        detail: held
          ? `${career.company} · ${career.title} — 출근 ${attended}회, Lv.${level}` +
            (toNext === undefined
              ? ` (최고 레벨 ${CAREER_MAX_LEVEL})`
              : ` (다음 레벨까지 출근 ${toNext}회)`) +
            ` · ${career.summary}`
          : `아직 다녀 본 적 없는 회사입니다. 벼룩장터에서 지원해 채용되면 Lv.1로 열리고, 출근 ${CAREER_LEVEL_DAYS}회마다 한 칸 오릅니다.`,
      }
    }), webtoonRow(state)],
    countLabel: (done, total) => `직업 ${total}개 중 ${done}개 경험`,
  }
}

/**
 * 웹툰 작가 줄. **연재는 정규직과 다른 축이라 `careerLog`에 없다** — 상태를 `webtoon`에서
 * 직접 읽는다. 급여 칸에 회차당 금액을 적는 것은 월급이 아니라 원고료이기 때문이다.
 */
function webtoonRow(state: GameState): Row {
  const w = state.webtoon
  const level = webtoonLevel(state)
  const held = level !== undefined
  return {
    key: 'webtoon',
    done: held,
    cells: [
      STUDIO_NAME,
      '웹툰 작가 (연재)',
      `${EPISODE_PAY.toLocaleString('ko-KR')}원/회차`,
      held ? `Lv.${level}` : '—',
      w?.status === 'serializing' ? '연재 중' : held ? '연재 종료' : '미경험',
    ],
    detail: held
      ? `${STUDIO_NAME} · 「${SERIES_TITLE}」 — ${w!.episodes}회 연재, 원고료 누적 ${w!.earned.toLocaleString('ko-KR')}원, Lv.${level}` +
        (w!.status === 'serializing'
          ? ` · 이번 주 원고 ${w!.progress}/${WEEKLY_PAGES}장`
          : ` · 연재가 끝났습니다(놓친 마감 ${w!.missed}회).`)
      : `아직 연재를 맡아 본 적 없습니다. 그림이 알려지면 ${STUDIO_NAME} 편집부에서 제의가 오고, 클립스튜디오에서 수락하면 Lv.1로 열립니다. 회차를 넘길 때마다 한 칸 오릅니다.`,
  }
}

/**
 * 엔딩 시트.
 *
 * ⚠️ **두 곳을 합친다**: 지금 세이브가 이번 판에서 본 엔딩(`seenEndingIds`)과 판을 넘어
 * 남는 해금 기록(`metaStore`). 세이브만 보면 **파산·직업 엔딩이 영영 안 뜬다** —
 * 그 엔딩들은 강제 종료이고 끝난 게임의 세이브는 지워지기 때문이다.
 */
function endingSheet(seen: Set<string>): Sheet {
  return {
    id: 'ending',
    label: '엔딩',
    columns: ['엔딩', '종류', '조건', '상태'],
    rows: ENDINGS.map((ending) => {
      const done = seen.has(ending.id)
      return {
        key: ending.id,
        done,
        cells: [
          ending.title,
          endingKind(ending),
          // ⚠️ 도달하는 법은 감춘다 — 목록을 보여 주는 것과 답을 알려 주는 것은 다르다.
          done ? conditionLabel(ending) : '???',
          done ? '달성' : '미달성',
        ],
        detail: done ? ending.text : '아직 도달하지 않은 엔딩입니다.',
      }
    }),
    countLabel: (done, total) => `엔딩 ${total}개 중 ${done}개 달성`,
  }
}

/**
 * 업적 시트.
 *
 * ⚠️ **엔딩과 반대로 조건을 감추지 않는다** — 엔딩은 이야기의 끝이라 알면 김이 새지만
 * 업적은 **목표**다. 무엇을 하면 되는지 모르는 목표는 목표가 아니다.
 * ⚠️ **저장하지 않고 매번 다시 센다**(`systems/achievements.ts`) — 그래서 포스트카드를
 * 중고마켓에 팔면 '극장의 단골'이 다시 미달성으로 돌아간다. 도감은 트로피 상자가 아니라
 * **지금 가진 것을 비추는 거울**이라는 것이 그 규칙의 뜻이다.
 */
function achievementSheet(state: GameState, seenEndings: Set<string>): Sheet {
  return {
    id: 'achievement',
    label: '업적',
    columns: ['업적', '조건', '진행', '상태'],
    rows: achievementProgress(state, seenEndings).map(({ achievement, value, done }) => ({
      key: achievement.id,
      done,
      cells: [
        achievement.title,
        achievement.desc,
        `${Math.min(value, achievement.goal)} / ${achievement.goal}`,
        done ? '달성' : '미달성',
      ],
      detail: done
        ? `달성했습니다. ${achievement.desc}.`
        : `${achievement.desc}. 앞으로 ${achievement.goal - value}개 남았습니다.`,
    })),
    countLabel: (done, total) => `업적 ${total}개 중 ${done}개 달성`,
  }
}

/**
 * 관계 시트.
 *
 * ⚠️ **엔딩 시트와 따로인 것이 설계다**(설계자 지시: 관계엔딩은 본엔딩의 **부가**엔딩).
 * 같은 표에 섞으면 "엔딩 n개 중 m개"가 관계를 세기 시작하고, 파산 엔딩과 민지 엔딩이
 * 한 층에 놓여 서로 배타로 읽힌다.
 *
 * ⚠️ **두 곳을 합친다**(엔딩 시트와 같은 이유): 지금 판의 호감도(`GameState.affection`)와
 * 판을 넘어 남는 해금 기록(`metaStore.unlockedRelations`). 세이브만 보면 **파산으로 끝난
 * 판의 관계가 영영 안 뜬다** — 강제 종료된 게임의 세이브는 지워지기 때문이다.
 *
 * ⚠️ **부가엔딩 본문은 감춘다**(엔딩과 같은 규칙) — 도달하는 법이 아니라 **그 끝의 문장**을
 * 지키는 것이 그 결정의 뜻이었다. 대신 진행도는 그대로 보여 준다: 관계는 감춰야 할 답이
 * 아니라 **목표**다(업적과 같은 부류).
 */
function relationSheet(state: GameState, unlocked: string[]): Sheet {
  const seen = new Set(unlocked)
  return {
    id: 'relation',
    label: '관계',
    columns: ['사람', '만나는 곳', '호감도', '상태'],
    rows: PEOPLE.map((person) => {
      const value = affectionOf(state, person.id)
      const reached = hasRelationEnding(state, person.id)
      const done = reached || seen.has(person.id)
      return {
        key: person.id,
        done,
        cells: [
          person.name,
          findActivity(person.activityId)?.label ?? '—',
          // ⚠️ 업적 시트와 같은 표기다(`Math.min(value, goal)`) — 안 자르면 '80 / 60'이 되어
          //    같은 창 안에서 두 표가 다른 규칙으로 진행도를 적는다.
          `${Math.min(value, AFFECTION_FOR_ENDING)} / ${AFFECTION_FOR_ENDING}`,
          seen.has(person.id) ? '엔딩 확인' : reached ? '충분함' : '진행 중',
        ],
        detail: seen.has(person.id)
          ? `${person.endingTitle} — ${person.endingText}`
          : reached
            ? `충분히 가까워졌습니다. 이번 판이 끝날 때 ${person.name}의 이야기가 함께 나옵니다.`
            : `${person.name}를 ${Math.ceil(
                (AFFECTION_FOR_ENDING - value) / AFFECTION_PER_MEET,
              )}번 더 만나면 이 사람의 이야기가 엔딩에 함께 나옵니다.`,
      }
    }),
    countLabel: (done, total) => `관계 ${total}명 중 ${done}명`,
  }
}

/** 엔딩의 갈래. ⚠️ **직업 엔딩도 `isFailure`이므로 `careerId`를 먼저 본다.** */
function endingKind(ending: Ending): string {
  if (ending.careerId) return '직업'
  return ending.isFailure ? '실패' : '성취'
}

/** 도달 조건 한 줄. 조건이 없는 엔딩(직업·실패)은 어떻게 끝났는지를 적는다. */
function conditionLabel(ending: Ending): string {
  if (ending.careerId) return '재직 중 파산'
  if (!ending.condition) return '조건 없음'
  return Object.entries(ending.condition)
    .map(([key, value]) => `${STAT_NAMES[key as keyof typeof STAT_NAMES]} ${value}`)
    .join(' · ')
}
