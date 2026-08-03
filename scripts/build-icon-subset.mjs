/**
 * 사용 중인 아이콘만 추려 `src/icons/generated.ts`를 만든다.
 *
 * 왜 필요한가: `@iconify-json/*`의 icons.json을 통째로 import하면 8천 개가 넘는
 * 아이콘 데이터가 번들에 들어가 20MB가 된다(실제 사용은 30여 개). JSON import는
 * 트리셰이킹되지 않으므로, 빌드 전에 필요한 것만 잘라 TS 모듈로 고정한다.
 *
 * 실행: `npm run icons`
 * 아이콘 이름을 추가·변경한 뒤에는 반드시 다시 실행한다.
 * (`npm run build`/`npm test`가 자동으로 선행 실행하므로 잊어도 검증에서 걸린다)
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'src')
// 세트별 역할(자세한 규칙은 src/data/icons.ts 주석):
//  - fluent-emoji-flat / flat-color-icons / twemoji: 다색 플랫 — OS 크롬·잠금화면·활동창.
//  - devicon: 프로그램 로고 — 바탕화면 앱 아이콘 + 그 창의 타이틀 바 + 작업 표시줄 항목.
//  - mdi-light: 단색 라인 — 작업 표시줄 트레이 글리프.
//  - ph(Phosphor, regular): 단색 외곽선 — 게임 HUD 안(currentColor로 물들일 수 있다).
const PREFIXES = [
  'fluent-emoji-flat',
  'flat-color-icons',
  'twemoji',
  'ph',
  'devicon',
  'mdi-light',
]
const OUT = join(SRC, 'icons', 'generated.ts')

/** 설치된 아이콘 세트 원본을 읽는다. */
const sets = Object.fromEntries(
  PREFIXES.map((p) => [
    p,
    JSON.parse(readFileSync(join(ROOT, 'node_modules/@iconify-json', p, 'icons.json'), 'utf8')),
  ]),
)

/** src/ 전체를 훑어 "세트:이름" 리터럴을 수집한다. 생성 파일 자신은 제외한다. */
function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const f = join(dir, e.name)
    if (e.isDirectory()) walk(f, out)
    else if (/\.(ts|tsx)$/.test(e.name) && f !== OUT) out.push(f)
  }
  return out
}

const re = new RegExp(`['"\`](${PREFIXES.join('|')}):([a-z0-9-]+)['"\`]`, 'g')
/** @type {Map<string, Set<string>>} prefix -> 아이콘 이름들 */
const used = new Map(PREFIXES.map((p) => [p, new Set()]))
/** @type {Map<string, string>} "prefix:name" -> 참조 위치(에러 메시지용) */
const where = new Map()

for (const file of walk(SRC)) {
  const text = readFileSync(file, 'utf8')
  for (const m of text.matchAll(re)) {
    used.get(m[1]).add(m[2])
    if (!where.has(`${m[1]}:${m[2]}`)) where.set(`${m[1]}:${m[2]}`, relative(ROOT, file))
  }
}

/**
 * 별칭(aliases)은 parent를 따라가야 실제 body에 닿는다.
 * 필요한 아이콘 + 그 조상 아이콘까지 모아 하나의 축소 세트를 만든다.
 */
const missing = []
const output = []

for (const prefix of PREFIXES) {
  const source = sets[prefix]
  const names = [...used.get(prefix)].sort()
  if (!names.length) continue

  const icons = {}
  const aliases = {}

  for (const name of names) {
    let cursor = name
    // 별칭 체인을 따라 내려가며 필요한 항목을 전부 복사한다.
    const guard = new Set()
    while (source.aliases?.[cursor] && !guard.has(cursor)) {
      guard.add(cursor)
      aliases[cursor] = source.aliases[cursor]
      cursor = source.aliases[cursor].parent
    }
    if (source.icons[cursor]) {
      icons[cursor] = source.icons[cursor]
    } else {
      missing.push(`${prefix}:${name} (${where.get(`${prefix}:${name}`)})`)
    }
  }

  const subset = { prefix: source.prefix, icons, aliases }
  if (source.width !== undefined) subset.width = source.width
  if (source.height !== undefined) subset.height = source.height
  if (!Object.keys(aliases).length) delete subset.aliases

  output.push({ prefix, subset, count: names.length })
}

if (missing.length) {
  console.error('존재하지 않는 아이콘 이름:')
  for (const m of missing) console.error('  ' + m)
  process.exit(1)
}

const total = output.reduce((n, o) => n + o.count, 0)
const banner = `// 이 파일은 \`npm run icons\`(scripts/build-icon-subset.mjs)가 생성한다. 직접 수정하지 말 것.
// src/에서 실제로 쓰는 아이콘 ${total}개만 담은 축소 세트다 —
// 전체 세트(8천여 개)를 번들에 넣지 않기 위한 것이다.
import type { IconifyJSON } from '@iconify/react/offline'

`

const body = output
  .map(
    (o) =>
      `/** ${o.prefix} — 사용 중인 ${o.count}개 */\nexport const ${toIdent(o.prefix)}: IconifyJSON = ${JSON.stringify(o.subset, null, 2)}\n`,
  )
  .join('\n')

const footer = `\n/** 앱 시작 시 등록할 축소 세트 전체. */\nexport const ICON_COLLECTIONS: IconifyJSON[] = [${output.map((o) => toIdent(o.prefix)).join(', ')}]\n`

function toIdent(prefix) {
  return prefix.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
}

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, banner + body + footer, 'utf8')

console.log(`아이콘 ${total}개를 src/icons/generated.ts로 추출했다.`)
for (const o of output) console.log(`  ${o.prefix}: ${o.count}개`)
