import {useMemo} from 'react'
import {cn} from '@/lib/utils'

interface HighlightedTextProps {
  text: string
  query: string
  className?: string
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function HighlightedText({text, query, className}: HighlightedTextProps) {
  const nodes = useMemo(() => {
    if (!query) return text
    const re = new RegExp(escapeRegExp(query), 'gi')
    const out: React.ReactNode[] = []
    let last = 0
    let m: RegExpExecArray | null
    let i = 0
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) out.push(text.slice(last, m.index))
      out.push(
        <mark
          key={i++}
          className="rounded-sm bg-primary/30 px-0.5 text-foreground"
        >
          {m[0]}
        </mark>
      )
      last = m.index + m[0].length
      if (m.index === re.lastIndex) re.lastIndex++ // empty matches guard
    }
    if (last < text.length) out.push(text.slice(last))
    return out
  }, [text, query])

  return (
    <pre className={cn('font-mono text-[0.8125rem] leading-relaxed whitespace-pre-wrap break-words text-foreground/90', className)}>
      <code>{nodes}</code>
    </pre>
  )
}

export function countMatches(text: string, query: string): number {
  if (!query) return 0
  const re = new RegExp(escapeRegExp(query), 'gi')
  return (text.match(re) || []).length
}
