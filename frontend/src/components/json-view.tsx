import {useMemo} from 'react'
import {cn} from '@/lib/utils'

interface JsonViewProps {
  data: string
  className?: string
}

const TOKEN_RE =
  /("(?:\\.|[^"\\])*"\s*:)|("(?:\\.|[^"\\])*")|(\b-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|(\btrue\b|\bfalse\b)|(\bnull\b)|([{}\[\],])/g

function classFor(
  key?: string,
  str?: string,
  num?: string,
  bool?: string,
  nul?: string,
  punct?: string
): string {
  if (key) return 'tok-key'
  if (str) return 'tok-string'
  if (num) return 'tok-number'
  if (bool) return 'tok-boolean'
  if (nul) return 'tok-null'
  if (punct) return 'tok-punct'
  return ''
}

/**
 * Renders syntax-highlighted JSON. If `data` isn't valid JSON (e.g. the
 * newline-joined response headers string), it's shown verbatim as monospace.
 */
export function JsonView({data, className}: JsonViewProps) {
  const {pretty, isJson} = useMemo(() => {
    try {
      const parsed = JSON.parse(data)
      return {pretty: JSON.stringify(parsed, null, 2), isJson: true}
    } catch {
      return {pretty: data, isJson: false}
    }
  }, [data])

  const nodes = useMemo(() => {
    if (!isJson) return null
    const out: React.ReactNode[] = []
    let last = 0
    let match: RegExpExecArray | null
    TOKEN_RE.lastIndex = 0
    let i = 0
    while ((match = TOKEN_RE.exec(pretty)) !== null) {
      if (match.index > last) {
        out.push(pretty.slice(last, match.index))
      }
      const cls = classFor(match[1], match[2], match[3], match[4], match[5], match[6])
      out.push(
        <span key={i++} className={cls}>
          {match[0]}
        </span>
      )
      last = match.index + match[0].length
    }
    if (last < pretty.length) out.push(pretty.slice(last))
    return out
  }, [pretty, isJson])

  return (
    <pre className={cn('json-view', className)}>
      {isJson ? <code>{nodes}</code> : <code className="text-foreground/90">{pretty}</code>}
    </pre>
  )
}
