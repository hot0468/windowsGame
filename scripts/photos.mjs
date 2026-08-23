/**
 * 사진 내려받기 — Pexels에서 한 번 받아 리포에 넣는다.
 *
 * ⚠️ **런타임에 외부를 부르지 않는다.** 이 게임은 오프라인으로 돌아야 하고(아이콘 CDN 금지와
 * 같은 규칙), 핫링크는 인터넷이 없으면 빈 칸이 된다. 그래서 사진은 **빌드 전에 받아 두고**
 * `public/img/`에서 정적으로 낸다 — 화면 코드는 `/img/<갈래>/<id>.webp` 한 줄만 안다.
 *
 * ⚠️ **API 키는 코드에 적지 않는다.** 환경변수 `PEXELS_API_KEY`로만 받는다.
 *   PowerShell:  $env:PEXELS_API_KEY = "..."; npm run photos
 *   bash:        PEXELS_API_KEY=... npm run photos
 *
 * ⚠️ **이미 있는 파일은 건너뛴다.** 다시 돌려도 같은 결과이고 할당량도 안 쓴다.
 * 사진을 갈고 싶으면 그 파일 하나만 지우고 다시 돌린다(질의를 고쳤으면 반드시 지워야 한다).
 *
 * ⚠️ **질의(query)의 정본은 이 파일이다.** 게임 데이터(`src/data/*.ts`)에 검색어를 적지
 * 않는다 — 사진을 어떻게 찾았는지는 게임이 알 필요 없는 사실이고, 경로는 id에서 파생된다.
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'public', 'img')
const CREDITS = path.join(OUT, 'credits.json')

/**
 * 갈래별 **내려받을 픽셀 크기 = 화면에 뜨는 크기**(설계자 지시: "보여지는 사이즈 안 넘게").
 *
 * ⚠️ 눈으로 정한 숫자가 아니라 **CSS에서 읽어 온 값이다** — 여기를 고치기 전에 그 자리의
 * 상자 크기를 먼저 확인하라(`.nv-thumb` 76×60 · 진열 타일 1:1 약 130 · 포스터 열 상한 220 ·
 * 여행 카드 최소 200(4:3) · 트윗 미디어 16:9 · 블로그 본문 72ch에 `max-height: 420`).
 * 화면보다 큰 사진은 **보이지도 않는 픽셀을 받는 것**이고, 이 게임은 사진이 88장이라
 * 그 낭비가 리포 무게로 그대로 쌓인다(large로 받았을 때 4MB → 지금 1MB 아래).
 *
 * ⚠️ **한 파일이 두 자리에 뜨면 큰 쪽에 맞춘다** — 파일을 쪼개면 총량이 오히려 는다.
 * 그런 자리가 둘 있다: 블로그 `-1`(본문 600 / 검색 썸네일 120)과 영화(포스터 220 /
 * 히어로는 창 폭 전체). **히어로는 검은 막 + 흐림(`blur`)이 깔려 있어**
 * 포스터 크기의 사진을 창 폭까지 늘려도 무름이 아니라 분위기로 읽힌다 — 히어로용 큰 파일을
 * 따로 받으면 영화 사진값이 세 배가 된다(480폭 15장 = 1.2MB → 260폭 15장 = 0.4MB).
 */
const BOX = {
  blog: [600, 420],
  news: [76, 60],
  item: [130, 130],
  film: [260, 385],
  trip: [260, 195],
  tweet: [560, 315],
}

/**
 * 그 사진의 내려받기 주소. **Pexels가 서버에서 잘라 주고 압축해 준다**(`auto=compress`) —
 * 리사이즈 라이브러리를 설치할 이유가 없다(의존성 0 규칙, `measure.mjs`와 같다).
 * ⚠️ `q=`는 무시된다(압축률은 `auto=compress`가 정한다) — 붙이지 말 것.
 * ⚠️ `fm=avif`는 여기 사진들에서 WebP보다 **더 컸다**(14KB vs 12KB) — 바꾸지 말 것.
 */
function sizedUrl(photo, group) {
  const [w, h] = BOX[group]
  /* ⚠️ **WebP로 받는다** — 같은 크기·같은 눈으로 봐서 차이 없는 사진이 JPEG의 절반이다
     (600×420 기준 24KB → 12KB). 이 게임은 크로미움 안에서만 도니 지원을 걱정할 것이 없다. */
  return `${photo.src.original}?auto=compress&cs=tinysrgb&fit=crop&fm=webp&w=${w}&h=${h}`
}

/** 포스터만 세로다. 나머지는 가로 사진이라야 카드·타일에 맞는다. */
const ORIENTATION = { film: 'portrait' }

/**
 * 갈래별 장수. 블로그 글만 **두 장**인 이유는 레퍼런스(실제 블로그 본문)가 사진을 문단
 * 사이사이에 놓기 때문이다 — 한 장이면 목록 썸네일과 본문 사진이 같은 그림이 된다.
 * 파일 이름은 `<id>-1.webp`·`<id>-2.webp`이고 목록 썸네일은 언제나 `-1`을 쓴다.
 */
const COUNT = { blog: 2 }

/**
 * id → 검색어. **영어로 적는다** — Pexels 색인이 영어라 한글 질의는 결과가 비거나 엉뚱하다.
 * 새 항목을 데이터에 더하면 여기도 한 줄 더한다(빠지면 그 칸만 사진이 없고, 화면은 그대로 돈다).
 */
const QUERIES = {
  blog: {
    'food-noodle': 'noodle soup bowl restaurant',
    'food-cheap': 'korean street food market',
    'food-latenight': 'late night food stall',
    'life-rent': 'household budget notebook calculator',
    'life-burnout': 'tired person resting by window',
    'work-parttime': 'convenience store clerk',
    'work-interview': 'job interview office',
    'study-cert': 'studying desk lamp night',
    'money-stock': 'stock market chart screen',
    'hobby-draw': 'sketchbook pencil drawing',
    'hobby-game': 'game controller desk setup',
    'life-move': 'moving boxes apartment',
    'life-travel': 'train window travel countryside',
    'work-side': 'freelancer laptop night desk',
  },
  news: {
    'jobs-freeze': 'job fair crowd office building',
    'rent-up': 'apartment buildings city',
    'ramen-up': 'grocery store shelves',
    'cert-boom': 'exam classroom students',
    'night-shift': 'convenience store night',
    'burnout-report': 'exhausted person office desk',
    'sns-star': 'smartphone social media apps',
    'ad-signup': 'gift box celebration confetti',
    'ad-loan': 'cash money bills',
    'ad-class': 'online class laptop notebook',
  },
  item: {
    supplement: 'vitamin supplement pills bottle',
    'gym-pass': 'gym dumbbells weights',
    'salon-pass': 'hair salon interior',
    notebook: 'leather notebook desk',
    brush: 'watercolor paint set brushes',
    pad: 'game controller gamepad',
    headphones: 'headphones over ear',
    laptop: 'laptop computer desk',
    streamkit: 'studio microphone',
    monitor: 'dual monitor desk setup',
    camera: 'mirrorless camera',
    booth: 'recording booth studio foam',
    'pen-tablet': 'drawing tablet stylus',
    'lcd-tablet': 'digital drawing screen tablet',
    phone: 'smartphone modern',
    sportswear: 'sportswear athletic clothing',
    homewear: 'cozy loungewear blanket',
    'outing-jacket': 'casual jacket clothing',
    suit: 'business suit formal',
  },
  film: {
    winter: 'seoul winter snow street',
    parttime: 'convenience store night worker',
    call: 'phone booth night neon',
    longway: 'couple walking sunset road',
    lunchbox: 'lunch box picnic family',
    odyssey: 'space stars galaxy nebula',
    whale: 'whale underwater ocean',
    jackass: 'skateboard stunt jump',
    okmadam: 'city night neon action',
    highway: 'highway night car lights',
    again: 'live music guitar stage',
    emptyhouse: 'empty room window light',
    hokum: 'dark forest fog',
    contempt: 'rain window portrait',
    unnamed: 'futuristic city fog',
  },
  /* 트윗 첨부 사진. **`image`를 가진 트윗만** 적는다 — 목록의 모든 트윗에 사진이 붙으면
     타임라인이 사진첩이 된다(실제 X도 한두 개 걸러 한 장이다). */
  tweet: {
    t2: 'warehouse workers night shift',
    t4: 'convenience store rice ball snack',
    t5: 'online lecture laptop desk',
    t7: 'second hand items flat lay',
    t8: 'sunrise city commute',
    t11: 'rental contract paper signing',
  },
  trip: {
    'south-sea': 'tropical reef island sea',
    'desert-night': 'desert night stars',
    'old-town': 'old town alley europe',
    'aurora-north': 'aurora northern lights',
    'north-onsen': 'hot spring onsen snow',
    'island-hop': 'island beach backpack',
    'lantern-city': 'lantern festival night',
    'harbor-walk': 'harbor city seafood',
    'temple-stay': 'mountain temple',
    'olle-walk': 'coastal trail walking',
  },
}

const KEY = process.env.PEXELS_API_KEY
if (!KEY) {
  console.error('PEXELS_API_KEY가 없다. 환경변수로 키를 주고 다시 돌려라.')
  process.exit(1)
}

/** 이미 받은 사진의 출처. Pexels 라이선스는 표기를 요구하진 않지만 기록은 남긴다. */
const credits = existsSync(CREDITS) ? JSON.parse(await readFile(CREDITS, 'utf-8')) : {}

let got = 0
let skipped = 0
let failed = 0

for (const [group, entries] of Object.entries(QUERIES)) {
  const dir = path.join(OUT, group)
  await mkdir(dir, { recursive: true })
  for (const [id, query] of Object.entries(entries)) {
    const n = COUNT[group] ?? 1
    /* 한 장짜리는 `<id>.webp`, 여러 장은 `<id>-1.webp`부터. 이름 규칙을 화면 코드가 그대로 안다. */
    const names = n === 1 ? [id] : Array.from({ length: n }, (_, i) => `${id}-${i + 1}`)
    if (names.every((name) => existsSync(path.join(dir, `${name}.webp`)))) {
      skipped++
      continue
    }
    const url = new URL('https://api.pexels.com/v1/search')
    url.searchParams.set('query', query)
    url.searchParams.set('per_page', String(n))
    if (ORIENTATION[group]) url.searchParams.set('orientation', ORIENTATION[group])

    const res = await fetch(url, { headers: { Authorization: KEY } })
    if (!res.ok) {
      console.error(`✗ ${group}/${id}: HTTP ${res.status}`)
      failed++
      continue
    }
    const photos = (await res.json()).photos ?? []
    if (photos.length === 0) {
      console.error(`✗ ${group}/${id}: "${query}" 결과 없음`)
      failed++
      continue
    }
    for (const [i, name] of names.entries()) {
      /* 결과가 요청보다 적으면 그 자리는 비운다 — 같은 사진을 두 번 눕히지 않는다
         (화면은 없는 사진을 접으므로 빈 자리가 깨진 아이콘이 되지 않는다). */
      const photo = photos[i]
      if (!photo) break
      const file = path.join(dir, `${name}.webp`)
      if (existsSync(file)) continue
      const bin = await fetch(sizedUrl(photo, group))
      await writeFile(file, Buffer.from(await bin.arrayBuffer()))
      credits[`${group}/${name}`] = {
        photographer: photo.photographer,
        url: photo.url,
        query,
        /* 원본 주소를 남긴다 — 표시 크기를 바꿀 때 검색을 다시 돌리지 않고 다시 자를 수 있다. */
        src: photo.src.original,
      }
      got++
      console.log(`✔ ${group}/${name}  ${photo.photographer}`)
    }
  }
}

await writeFile(CREDITS, `${JSON.stringify(credits, null, 2)}\n`)

/* 데이터에는 있는데 질의가 없는 id를 찾아 준다 — 사진이 빠진 칸을 조용히 넘기지 않는다. */
const sizes = []
for (const group of Object.keys(QUERIES)) {
  const dir = path.join(OUT, group)
  if (existsSync(dir)) sizes.push(`${group} ${(await readdir(dir)).length}장`)
}
console.log(`\n받음 ${got} · 건너뜀 ${skipped} · 실패 ${failed}\n${sizes.join(' · ')}`)
