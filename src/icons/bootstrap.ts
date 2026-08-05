/**
 * Iconify 아이콘 데이터 오프라인 등록.
 *
 * 이 게임은 인터넷 없이 동작해야 하고 첫 렌더에 아이콘이 깜빡이면 안 된다.
 * 그래서 두 겹으로 CDN을 차단한다.
 *  1. `@iconify/react/offline` 엔트리만 쓴다 — 이 빌드에는 fetch/API 코드가 아예 없어
 *     이름을 못 찾아도 네트워크로 나가지 않는다.
 *  2. 실제로 쓰는 아이콘 데이터를 `addCollection()`으로 앱 시작 시 미리 등록한다.
 *     번들에 데이터가 함께 들어가므로 렌더 시점에 이미 메모리에 있다.
 *
 * 등록 대상은 `src/icons/generated.ts`다. 설치된 `@iconify-json/*` 전체(8천여 개)를
 * 그대로 import하면 번들이 20MB가 되므로, 빌드 전에 사용 중인 것만 추려 쓴다
 * (`npm run icons`).
 *
 * 이 모듈은 `main.tsx`가 App보다 먼저 import한다. side-effect 전용이다.
 */
import { addCollection } from '@iconify/react/offline'
import { ICON_COLLECTIONS } from './generated'

for (const collection of ICON_COLLECTIONS) {
  addCollection(collection)
}
