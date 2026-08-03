import { Icon } from '@iconify/react/offline'
import type { CSSProperties } from 'react'
import type { IconName } from '../types/game'

/**
 * 앱 전역 아이콘 컴포넌트.
 * 컴포넌트들이 `@iconify/react`를 직접 import하지 않게 감싼다 —
 * 이렇게 해야 "오프라인 전용 엔트리(`/offline`)를 쓴다"는 결정이 이 파일 한 곳에만 남는다.
 */
export function AppIcon({
  name,
  size = 16,
  className,
  style,
}: {
  name: IconName
  /** 정사각 픽셀 크기. */
  size?: number
  className?: string
  style?: CSSProperties
}) {
  return <Icon icon={name} width={size} height={size} className={className} style={style} />
}
