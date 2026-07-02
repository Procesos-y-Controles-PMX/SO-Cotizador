'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { moduleIndexForPath } from '@/lib/moduleOrder'

let lastModuleIndex = -1

export default function ModuleTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ''
  const index = moduleIndexForPath(pathname)
  const previous = lastModuleIndex
  const animClass =
    previous === -1 || index === -1 || index === previous
      ? 'module-enter-fade'
      : index > previous
        ? 'module-enter-up'
        : 'module-enter-down'

  React.useEffect(() => {
    if (index !== -1) lastModuleIndex = index
  }, [index])

  return (
    <div key={pathname} className={`flex min-h-full flex-1 flex-col ${animClass}`}>
      {children}
    </div>
  )
}
