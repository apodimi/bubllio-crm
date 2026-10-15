import { Icon, type IconifyIcon } from '@iconify/react'

export function AppIcon({ icon, size = 20 }: { icon: IconifyIcon; size?: number }) {
  return <Icon aria-hidden icon={icon} width={size} height={size} />
}
