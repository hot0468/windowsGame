import { create } from 'zustand'
import type { Message } from '../data/messages'

/**
 * 우하단 토스트 알림.
 *
 * **휘발 상태다** — 세이브에 넣지 않는다. 알림은 "지금 이 순간"의 것이고,
 * 실제 내용은 편성표에서 언제든 다시 만들 수 있으므로 저장할 이유가 없다.
 */
export interface Toast {
  /** 같은 메시지가 두 번 쌓이지 않도록 메시지 id를 그대로 쓴다. */
  id: string
  message: Message
}

/** 화면에 동시에 쌓아 둘 최대 개수. 넘치면 오래된 것부터 밀어낸다. */
const MAX_TOASTS = 3

interface ToastStore {
  toasts: Toast[]
  /** 이미 떠 있거나 같은 id가 있으면 무시한다(턴이 다시 그려져도 중복되지 않게). */
  push: (messages: Message[]) => void
  dismiss: (id: string) => void
  clear: () => void
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  push: (messages) => {
    const existing = new Set(get().toasts.map((t) => t.id))
    const fresh = messages.filter((m) => !existing.has(m.id)).map((m) => ({ id: m.id, message: m }))
    if (!fresh.length) return
    set({ toasts: [...get().toasts, ...fresh].slice(-MAX_TOASTS) })
  },

  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

  clear: () => set({ toasts: [] }),
}))
