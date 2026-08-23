#!/usr/bin/env node
/**
 * CDP 실측 하네스 — 헤드리스 크롬을 몰아 화면을 찍고 **합성 픽셀로** 대비를 잰다.
 *
 * `node scripts/measure.mjs --help`
 *
 * ## 왜 이 파일이 리포에 있나
 * 이 배선을 매번 스크래치패드에 다시 쓰다가, 아래 함정들을 **매번 다시 알아냈다.**
 * 한 번 겪은 것을 두 번 겪지 않으려고 커밋한다. 아래 ⚠️는 전부 실제로 시간을 태운 것들이다.
 *
 * ⚠️ **의존성 0.** Node 24 내장 `WebSocket`·`fetch`만 쓴다. `ws`·puppeteer를 설치하지 말 것
 *    (이 리포에 브라우저 자동화 의존성을 들이지 않는 것이 규칙이다).
 *
 * ⚠️ **좌표 클릭(`Input.dispatchMouseEvent`)을 쓰지 말 것.** 헤드리스에서는 레이어 트리가
 *    갱신되지 않아 좌표가 어긋나고, 아무 일도 일어나지 않는데 성공으로 보인다.
 *    `el.click()`을 쓴다 — React 합성 이벤트는 이걸로 정상 동작한다.
 *
 * ⚠️ **문서 타임라인이 얼어 있다.** `animation.currentTime`이 0에서 안 움직여
 *    CSS 애니메이션이 **첫 프레임(대개 opacity 0)으로만 찍힌다.** `currentTime`을 손으로
 *    감아도 새 프레임을 안 그린다. 해결은 `--reduced`: `prefers-reduced-motion: reduce`를
 *    에뮬레이트해 애니메이션 자체를 없애면 CSS가 최종 상태를 바로 그린다.
 *    (그래서 이 리포의 화면은 reduced-motion에서 **최종 상태**가 보여야 한다 — 그렇지
 *     않으면 실측이 불가능하다. `animation: none`만 거는 CSS는 그 자체로 버그다.)
 *
 * ⚠️ **크롬은 detach해서 띄운다.** 스크립트와 수명이 묶이면 스크립트가 끝날 때 크롬도
 *    죽어 다음 실행이 ECONNREFUSED로 끝난다.
 *
 * ⚠️ **React 제어 input에 값을 넣을 때는** `HTMLInputElement.prototype.value` 네이티브
 *    setter로 쓰고 `input` 이벤트를 직접 발사해야 한다(`el.value = x`는 무시된다).
 *
 * ⚠️ **대비는 계산하지 말고 픽셀을 읽어라.** 반투명 판·그라데이션 위 글자는 선언된 색과
 *    실제로 합성된 색이 다르다. 이 스크립트는 캡처한 PNG를 페이지 안 canvas로 되돌려
 *    요소 상자 안의 **최빈 픽셀 = 배경**으로 잡고 글자색과의 대비를 낸다.
 */

import { execSync, spawn } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const CHROME_PATHS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
]
const PORT = 9222
const DEV_PORTS = [5173, 5174, 5175]
const WAIT_STEP = 100

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 조건이 참이 될 때까지 짧게 되묻는다. 고정 대기는 프레임 타이밍에 따라 놓친다. */
async function until(fn, { timeout = 8000, label = '조건' } = {}) {
  for (let waited = 0; waited < timeout; waited += WAIT_STEP) {
    if (await fn()) return true
    await sleep(WAIT_STEP)
  }
  throw new Error(`시간 초과: ${label}`)
}

/** 떠 있는 dev 서버를 찾는다. vite는 5173이 물려 있으면 조용히 다음 포트로 넘어간다. */
async function findDevServer(explicit) {
  const candidates = explicit ? [explicit] : DEV_PORTS.map((p) => `http://localhost:${p}/`)
  for (const url of candidates) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1500) })
      if (res.ok) return url
    } catch {
      /* 다음 후보 */
    }
  }
  throw new Error(`dev 서버를 못 찾았다(${candidates.join(', ')}). 먼저 npm run dev`)
}

async function chromeAlive() {
  try {
    await fetch(`http://127.0.0.1:${PORT}/json/version`, { signal: AbortSignal.timeout(1000) })
    return true
  } catch {
    return false
  }
}

/**
 * CDP 포트가 죽었는데 옛 헤드리스 크롬이 살아 있으면 죽인다.
 *
 * ⚠️ **이게 없으면 스크립트가 4분씩 매달린다**(실제로 하루 두 번 났다): 이전 실행이 남긴
 * 크롬이 프로필 잠금과 포트를 쥔 채 뻗어 있으면, 새 크롬은 못 뜨고 `until`은 영원히 기다린다.
 * 우리 프로필(`windowsgame-cdp`)을 쓰는 크롬만 골라 죽인다 — 사용자 크롬은 절대 안 건드린다.
 */
function killStaleChrome() {
  try {
    execSync(
      `powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | Where-Object { $_.CommandLine -like '*windowsgame-cdp*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"`,
      { stdio: 'ignore', timeout: 10000 },
    )
  } catch {
    /* PowerShell이 없거나 실패해도 진행한다 — 어차피 아래 spawn이 다시 시도한다. */
  }
}

/** 크롬을 띄운다. 이미 떠 있으면 그대로 쓴다. */
async function ensureChrome(width, height) {
  if (await chromeAlive()) return
  killStaleChrome()
  const exe = CHROME_PATHS.find(existsSync)
  if (!exe) throw new Error(`크롬을 못 찾았다: ${CHROME_PATHS.join(' / ')}`)
  const child = spawn(
    exe,
    [
      '--headless=new',
      `--remote-debugging-port=${PORT}`,
      `--window-size=${width},${height}`,
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      `--user-data-dir=${process.env.TEMP || '/tmp'}/windowsgame-cdp`,
      'about:blank',
    ],
    { detached: true, stdio: 'ignore' }, // ⚠️ 스크립트와 수명을 끊는다
  )
  child.unref()
  await until(chromeAlive, { timeout: 15000, label: '크롬 기동' })
}

/** CDP 연결. `send`(원시 메서드)와 `evalJs`(페이지 안 평가)를 준다. */
async function connect() {
  const targets = await (
    await fetch(`http://127.0.0.1:${PORT}/json/list`, { signal: AbortSignal.timeout(5000) })
  ).json()
  const page = targets.find((t) => t.type === 'page')
  if (!page) throw new Error('page 타깃이 없다')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((res, rej) => {
    ws.onopen = res
    ws.onerror = rej
  })
  let id = 0
  const pending = new Map()
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data)
    if (m.id && pending.has(m.id)) pending.get(m.id)(m), pending.delete(m.id)
  }
  const send = (method, params = {}) =>
    new Promise((res) => {
      const i = ++id
      pending.set(i, res)
      ws.send(JSON.stringify({ id: i, method, params }))
    })
  const evalJs = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    const ex = r.result?.exceptionDetails
    if (ex) throw new Error(`페이지 평가 실패: ${ex.exception?.description ?? ex.text}`)
    return r.result?.result?.value
  }
  return { send, evalJs, close: () => ws.close() }
}

/** ⚠️ 좌표가 아니라 요소를 직접 누른다(위 주석 참조). */
const clickJs = (sel) => `(() => {
  const e = document.querySelector(${JSON.stringify(sel)})
  if (!e) return false
  e.click()
  return true
})()`

/**
 * ⚠️ **바탕화면 아이콘은 더블클릭이라야 열린다** — `el.click()`으로는 선택만 된다.
 * `HTMLElement.click()`에 해당하는 더블클릭 메서드가 없어 이벤트를 직접 쏜다
 * (React 합성 이벤트는 `bubbles: true`면 정상적으로 받는다).
 */
const dblClickJs = (sel) => `(() => {
  const e = document.querySelector(${JSON.stringify(sel)})
  if (!e) return false
  e.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, view: window }))
  return true
})()`

/**
 * 오른쪽 클릭(= `contextmenu` 이벤트). 더블클릭과 같은 사정 — 해당하는 메서드가 없어
 * 이벤트를 직접 쏜다. **좌표는 요소 한가운데를 실어 보낸다**: 컨텍스트 메뉴가
 * `clientX/Y`로 뜨는 자리를 정하므로 0,0이면 화면 구석에 열려 다음 --click이 못 찾는다.
 */
const rightClickJs = (sel) => `(() => {
  const e = document.querySelector(${JSON.stringify(sel)})
  if (!e) return false
  const r = e.getBoundingClientRect()
  e.dispatchEvent(new MouseEvent('contextmenu', {
    bubbles: true, cancelable: true, view: window,
    clientX: r.left + r.width / 2, clientY: r.top + r.height / 2,
  }))
  return true
})()`

/**
 * ⚠️ **진짜 마우스**를 요소 한가운데에 눌렀다 뗀다(CDP `Input`, 신뢰된 이벤트).
 * `--click`(=`el.click()`)으로는 **볼 수 없는 버그가 있다**: pointerdown이 리렌더를 일으켜
 * 그 버튼 DOM이 갈아 끼워지면 mouseup이 다른 노드에 떨어져 **click 자체가 안 난다**
 * (솔리테어 패산이 그랬다). 손으로 눌러야 재현되는 것을 재려면 이쪽을 쓴다.
 */
async function realClick(d, sel) {
  const at = await d.evalJs(`(() => {
    const e = document.querySelector(${JSON.stringify(sel)})
    if (!e) return null
    const r = e.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  })()`)
  if (!at) return false
  const base = { ...at, button: 'left', buttons: 1, clickCount: 1 }
  await d.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...at, buttons: 0 })
  await d.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...base })
  await d.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...base, buttons: 0 })
  return true
}

/** 잠금화면을 통과해 바탕화면까지 간다. 새 판이면 이름을 넣고, 세이브가 있으면 그대로 들어간다. */
async function login(d, name) {
  /* ⚠️ **부팅 화면이 먼저 지나간다**(`BootScreen`, 1.6초). 그동안은 `.lock`이 DOM에 아예
     없어서, 기다리지 않으면 아래 한 줄이 "세이브가 있어 바로 들어간 판"으로 착각하고
     로그인을 통째로 건너뛴다 — 그 뒤의 모든 --click이 조용히 "없음"이 된다. */
  await until(() => d.evalJs(`!document.querySelector('.boot')`), { label: '부팅 완료' })
  if (!(await d.evalJs(`!!document.querySelector('.lock')`))) return
  // ⚠️ React 제어 input이라 네이티브 setter + input 이벤트가 필요하다.
  await d.evalJs(`(() => {
    const i = document.querySelector('.lock-input')
    if (!i) return false
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    set.call(i, ${JSON.stringify(name)})
    i.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  })()`)
  await sleep(200)
  await d.evalJs(clickJs('.lock-btn'))
  await until(() => d.evalJs(`!!document.querySelector('.desktop, .mo')`), {
    label: '바탕화면 진입',
  })
}

/**
 * 화면을 캡처해 페이지 안 canvas로 되돌린 뒤, 선택자에 걸리는 요소마다
 * **합성 배경 대비**를 잰다. 배경은 요소 상자 안의 **최빈 픽셀**로 잡는다 —
 * 모서리 표본은 `border-radius` 때문에 상자 밖을 읽는다(실제로 당했다).
 */
async function contrast(d, selector) {
  const shot = await d.send('Page.captureScreenshot', { format: 'png' })
  const b64 = shot.result.data
  const rows = await d.evalJs(`(async () => {
    const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,${b64}')).blob())
    const c = document.createElement('canvas')
    c.width = bmp.width; c.height = bmp.height
    const ctx = c.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(bmp, 0, 0)
    const dpr = bmp.width / window.innerWidth

    const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
    const lum = ([R, G, B]) => 0.2126 * lin(R) + 0.7152 * lin(G) + 0.0722 * lin(B)
    const ratio = (a, b) => {
      const la = lum(a), lb = lum(b)
      return Math.round(((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)) * 100) / 100
    }
    const parse = (css) => (css.match(/[\\d.]+/g) ?? []).slice(0, 3).map(Number)

    const out = []
    for (const el of document.querySelectorAll(${JSON.stringify(selector)})) {
      const text = (el.textContent ?? '').trim()
      if (!text) continue
      const r = el.getBoundingClientRect()
      if (r.width < 4 || r.height < 4) continue
      const x0 = Math.max(0, Math.round(r.x * dpr)), y0 = Math.max(0, Math.round(r.y * dpr))
      const w = Math.min(Math.round(r.width * dpr), bmp.width - x0)
      const h = Math.min(Math.round(r.height * dpr), bmp.height - y0)
      if (w < 2 || h < 2) continue
      const data = ctx.getImageData(x0, y0, w, h).data
      const fg = parse(getComputedStyle(el).color)
      /*
       * 최빈 픽셀 = 배경. ⚠️ **글자색에 가까운 픽셀은 세지 않는다** — 큰 글자가 자기
       * 상자를 꽉 채우면 최빈값이 글자 자신이 되어 1:1이라는 거짓 경보가 난다(실제로 났다).
       * 거리를 두고 걸러 내면 남는 것은 배경과 안티에일리어싱 가장자리이고, 가장자리는
       * 배경과 글자 사이에 흩어지므로 최빈값은 배경에 남는다.
       */
      const far = (r, g, b) =>
        Math.abs(r - fg[0]) + Math.abs(g - fg[1]) + Math.abs(b - fg[2]) > 90
      const tally = new Map()
      let kept = 0
      for (let i = 0; i < data.length; i += 4) {
        if (!far(data[i], data[i + 1], data[i + 2])) continue
        const k = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2]
        tally.set(k, (tally.get(k) ?? 0) + 1)
        kept++
      }
      // 상자가 통째로 글자색이면(있을 수 없지만) 판단을 포기하고 건너뛴다 — 거짓 경보보다 낫다.
      if (kept < (w * h) / 20) continue
      let best = 0, bestN = -1
      for (const [k, n] of tally) if (n > bestN) { best = k; bestN = n }
      const bg = [(best >> 16) & 255, (best >> 8) & 255, best & 255]
      const px = parseFloat(getComputedStyle(el).fontSize)
      const bold = Number(getComputedStyle(el).fontWeight) >= 700
      // WCAG AA: 18.66px 이상이거나 14px 이상 굵은 글자는 3:1, 나머지는 4.5:1
      const need = px >= 18.66 || (px >= 14 && bold) ? 3 : 4.5
      out.push({
        sel: el.className || el.tagName.toLowerCase(),
        text: text.slice(0, 28).replace(/\\s+/g, ' '),
        fg: 'rgb(' + fg.join(',') + ')',
        bg: 'rgb(' + bg.join(',') + ')',
        ratio: ratio(fg, bg),
        need,
      })
    }
    return out
  })()`)
  return { rows, png: Buffer.from(b64, 'base64') }
}

const HELP = `
CDP 실측 하네스 — 헤드리스 크롬으로 찍고 합성 픽셀로 대비를 잰다.

  node scripts/measure.mjs [옵션]

옵션
  --click <셀렉터>   요소를 누른다. 여러 번 줄 수 있고 준 순서대로 실행된다
  --dblclick <셀>    더블클릭한다. **바탕화면 아이콘(.desktop-icon)은 이쪽이라야 열린다**
  --mouse <셀>       **진짜 마우스**로 누른다(신뢰된 pointerdown→mouseup).
                     --click이 못 보는 버그(누르는 순간 리렌더로 버튼이 갈아 끼워져
                     click이 안 나는 것)를 재현하려면 이쪽
  --rightclick <셀>  오른쪽 클릭(contextmenu). 우클릭 메뉴(작업 표시줄·스케줄러)를 열 때
  --wait <ms>        --click 사이 대기(기본 400)
  --shot <파일>      스크린샷을 저장한다
  --contrast <셀>    그 셀렉터에 걸리는 요소의 합성 대비를 잰다(기본 검사 대상 없음)
  --scan             화면의 글자 있는 요소를 전부 훑어 **AA 미달만** 보고한다
  --reduced          prefers-reduced-motion을 켠다 (⚠️ CSS 애니메이션을 찍으려면 필수)
  --fresh            localStorage를 비우고 새 판으로 시작한다
  --seed <json>      localStorage에 세이브를 심고 시작한다(키-값 JSON 파일).
                     ⚠️ 검증(reviveState)에 걸리면 **조용히 새 게임으로 떨어진다** —
                     심은 날짜가 화면 날짜칸과 다르면 seed가 거부된 것이다
                     상태로 잠긴 화면(취직해야 뜨는 출근 미니게임 등)을 재려면
                     클릭 수십 번 대신 이걸 쓴다. --fresh와 함께 주면 비운 뒤 심는다
  --name <이름>      잠금화면에 넣을 이름(기본 "측정")
  --url <주소>       dev 서버 주소(기본: 5173→5174→5175 순으로 탐색)
  --size <WxH>       창 크기(기본 1440x900). 모바일 셸을 보려면 예: --size 390x844

예시
  node scripts/measure.mjs --scan
  node scripts/measure.mjs --fresh --click .cal-skip --click .cal-skip --reduced --shot db.png
  node scripts/measure.mjs --click .nv-bookmark --contrast ".tk-card, .tk-card *"
`

function parseArgs(argv) {
  const o = { clicks: [], wait: 400, name: '측정', size: '1440x900' }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const next = () => argv[++i]
    if (a === '--help' || a === '-h') o.help = true
    else if (a === '--click') o.clicks.push({ sel: next(), dbl: false })
    else if (a === '--dblclick') o.clicks.push({ sel: next(), dbl: true })
    else if (a === '--mouse') o.clicks.push({ sel: next(), real: true })
    else if (a === '--rightclick') o.clicks.push({ sel: next(), ctx: true })
    else if (a === '--wait') o.wait = Number(next())
    else if (a === '--shot') o.shot = next()
    else if (a === '--contrast') o.contrast = next()
    else if (a === '--scan') o.scan = true
    else if (a === '--reduced') o.reduced = true
    else if (a === '--fresh') o.fresh = true
    else if (a === '--seed') o.seed = next()
    else if (a === '--name') o.name = next()
    else if (a === '--url') o.url = next()
    else if (a === '--size') o.size = next()
    else throw new Error(`모르는 옵션: ${a}`)
  }
  return o
}

async function main() {
  const o = parseArgs(process.argv.slice(2))
  if (o.help || process.argv.length <= 2) return console.log(HELP)

  const [width, height] = o.size.split('x').map(Number)
  const url = await findDevServer(o.url)
  await ensureChrome(width, height)
  const d = await connect()
  try {
    await d.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    })
    if (o.reduced) {
      // ⚠️ 헤드리스는 애니메이션 시계가 얼어 있어 이걸 켜야 최종 상태가 그려진다.
      await d.send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
      })
    }
    await d.send('Page.navigate', { url })
    await until(() => d.evalJs(`document.readyState === 'complete'`), { label: '로드' })
    if (o.fresh || o.seed) {
      if (o.fresh) await d.evalJs(`localStorage.clear()`)
      if (o.seed) {
        const seed = JSON.parse(readFileSync(o.seed, 'utf8'))
        for (const [k, v] of Object.entries(seed)) {
          await d.evalJs(`localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(JSON.stringify(v))})`)
        }
        console.log(`세이브 심음: ${Object.keys(seed).join(', ')}`)
      }
      await d.send('Page.navigate', { url })
      await until(() => d.evalJs(`document.readyState === 'complete'`), { label: '재로드' })
    }
    await sleep(500)
    await login(d, o.name)

    for (const { sel, dbl, real, ctx } of o.clicks) {
      const ok = real
        ? await realClick(d, sel)
        : await d.evalJs(ctx ? rightClickJs(sel) : dbl ? dblClickJs(sel) : clickJs(sel))
      console.log(
        `${real ? '실마우스' : ctx ? '우클릭' : dbl ? '더블클릭' : '클릭'} ${sel}: ${ok ? 'ok' : '없음'}`,
      )
      await sleep(o.wait)
    }

    if (o.contrast || o.scan) {
      const target = o.contrast ?? 'p, span, a, button, h1, h2, h3, h4, li, td, th, label, strong'
      const { rows } = await contrast(d, target)
      const shown = o.scan ? rows.filter((r) => r.ratio < r.need) : rows
      if (!shown.length) {
        console.log(o.scan ? '✔ AA 미달 없음' : '해당 요소 없음')
      } else {
        console.log(`\n${o.scan ? 'AA 미달' : '대비'} ${shown.length}건`)
        for (const r of shown) {
          const mark = r.ratio < r.need ? '✗' : '✔'
          console.log(
            `  ${mark} ${String(r.ratio).padStart(6)}:1 (필요 ${r.need}) ${r.fg} on ${r.bg}  "${r.text}"  .${r.sel}`,
          )
        }
      }
    }

    if (o.shot) {
      const s = await d.send('Page.captureScreenshot', { format: 'png' })
      writeFileSync(o.shot, Buffer.from(s.result.data, 'base64'))
      console.log(`저장: ${o.shot}`)
    }
  } finally {
    d.close()
  }
}

main().catch((e) => {
  console.error('실패:', e.message)
  process.exit(1)
})
