// `test` 필드는 vite 타입에 없다 — vitest 쪽 defineConfig라야 빌드가 통과한다.
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    /* ⚠️ **격리를 끈 것이 속도의 핵심이다**(2026-08-14 실측). 기본값(forks + 격리)은
       파일 73개가 각자 `turn.ts`의 무거운 의존 그래프를 다시 변환·import해서, 테스트
       2.4초를 9.2초에 돌렸다(풀만 threads로 바꿔도 안 줄었다 — 병목은 프로세스가 아니라
       재import다). 끄면 그래프를 워커당 한 번만 읽는다.
       ⚠️ **전제: 스토어 싱글턴을 만지는 테스트는 `beforeEach`로 스스로 리셋한다**
       (desktopPanelStore·windowStore·shell 세 파일이 그렇게 한다). 새 스토어 테스트를
       만들면 같은 규칙을 지켜라 — 리셋 없이 모듈 초기 상태에 기대면 여기서만 깨진다. */
    pool: 'threads',
    isolate: false,
  },
})
