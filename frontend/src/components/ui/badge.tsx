import * as React from 'react'
import {cn} from '@/lib/utils'

export type BadgeProps = React.HTMLAttributes<HTMLDivElement>

function Badge({className, ...props}: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors',
        className
      )}
      {...props}
    />
  )
}

export {Badge}
