import { useMetaStore } from './store/metaStore'

/**
 * 효과음 — 가짜 OS의 목소리(2026-08-17).
 *
 * ## ⚠️ 에셋이 없다. 전부 WebAudio로 합성한다
 * 오디오 파일을 들이면 로딩·번들·라이선스가 딸려 온다. 필요한 것은 "컴퓨터가 반응했다"는
 * 몇백 ms의 신호뿐이라 오실레이터 몇 개면 충분하다. **음원 파일을 추가하지 말 것.**
 *
 * ## ⚠️ `systems/`가 아니라 여기(src 루트)에 있다
 * 스피커를 울리는 것은 부수효과라 순수 로직 폴더에 못 들어간다. 게임 상태도 안 읽는다 —
 * 켬/끔(`metaStore.soundOn`)만 본다.
 *
 * ## ⚠️ AudioContext는 첫 재생에서 게으르게 만든다
 * 브라우저가 사용자 제스처 전의 오디오를 막는다. 이 게임의 소리는 전부 클릭 뒤에
 * 나므로(로그인·창·토스트도 턴 조작의 결과) 첫 호출 시점이면 이미 제스처 안이다.
 * 그래도 suspended면 resume을 시도하고, 안 되면 **조용히 넘어간다**(소리는 게임 규칙이
 * 아니다 — 실패가 화면에 보이면 안 된다).
 */

export type SoundName = 'boot' | 'toast' | 'open' | 'close' | 'error'

let ctx: AudioContext | null = null

/** 전체 음량. 효과음은 배경이지 주인공이 아니다 — 키우려면 이 한 곳만 만진다. */
const MASTER = 0.09

function context(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
  return ctx.state === 'closed' ? null : ctx
}

/** 감쇠 봉투를 씌운 단음 하나. at은 지금부터의 지연(초). */
function tone(
  ac: AudioContext,
  freq: number,
  at: number,
  dur: number,
  type: OscillatorType = 'sine',
  peak = 1,
) {
  const t0 = ac.currentTime + at
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  gain.gain.setValueAtTime(0, t0)
  gain.gain.linearRampToValueAtTime(MASTER * peak, t0 + 0.008)
  /* exponential은 0에 못 닿으므로 거의 0까지 내리고 stop으로 끝낸다. */
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(gain).connect(ac.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

/**
 * 효과음 하나를 낸다. 꺼져 있으면(설정) 아무 일도 없다.
 *
 * 음들은 전부 즉흥이 아니라 관습을 따른다: 부팅=올라가는 5도(시작), 오류=낮은 2연타(경고),
 * 창 열기/닫기=반대 방향의 같은 블립(한 쌍임이 귀로 들리게).
 */
export function playSound(name: SoundName) {
  if (!useMetaStore.getState().soundOn) return
  try {
    const ac = context()
    if (!ac) return
    switch (name) {
      case 'boot':
        tone(ac, 392, 0, 0.35)
        tone(ac, 587, 0.12, 0.45)
        break
      case 'toast':
        tone(ac, 880, 0, 0.2)
        tone(ac, 1174, 0.07, 0.25, 'sine', 0.6)
        break
      case 'open':
        tone(ac, 520, 0, 0.07, 'triangle', 0.8)
        tone(ac, 660, 0.05, 0.09, 'triangle', 0.8)
        break
      case 'close':
        tone(ac, 660, 0, 0.07, 'triangle', 0.8)
        tone(ac, 520, 0.05, 0.09, 'triangle', 0.8)
        break
      case 'error':
        tone(ac, 220, 0, 0.16, 'square', 0.5)
        tone(ac, 185, 0.18, 0.22, 'square', 0.5)
        break
    }
  } catch {
    /* 소리는 연출이다 — 어떤 실패도 게임을 멈추면 안 된다. */
  }
}
