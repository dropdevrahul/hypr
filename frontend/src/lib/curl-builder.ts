// Build a curl command string from the current request state.
// Single-quotes are used for shell safety; embedded ' is escaped as '\''.

function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`
}

export interface CurlInput {
  method: string
  url: string
  headers: Record<string, string>
  body?: string
  bodyFlag?: '--data-raw' | '-d' // -d default; raw for JSON
}

export function buildCurl(input: CurlInput): string {
  const parts: string[] = ['curl']
  if (input.method && input.method !== 'GET') {
    parts.push('-X', input.method)
  }
  for (const [k, v] of Object.entries(input.headers)) {
    parts.push('-H', shellQuote(`${k}: ${v}`))
  }
  if (input.body) {
    parts.push(input.bodyFlag ?? '-d', shellQuote(input.body))
  }
  parts.push(shellQuote(input.url))
  return parts.join(' ')
}
