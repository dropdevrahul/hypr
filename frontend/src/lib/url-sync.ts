import {emptyKV, type KV} from './kv'

// Parse the query string of a URL into KV rows.
// Returns null if the URL can't be parsed.
export function parseUrlParams(url: string): KV[] | null {
  try {
    const u = new URL(url)
    const rows: KV[] = []
    u.searchParams.forEach((v, k) => rows.push({Key: k, Value: v}))
    return rows.length ? rows : [emptyKV()]
  } catch {
    return null
  }
}

// Rebuild URL with the given param rows (replaces existing query).
export function rebuildUrlWithParams(url: string, rows: KV[]): string {
  try {
    const u = new URL(url)
    // Replace existing search
    Array.from(u.searchParams.keys()).forEach((k) => u.searchParams.delete(k))
    for (const r of rows) {
      if (r.Key) u.searchParams.append(r.Key, r.Value)
    }
    return u.toString()
  } catch {
    // URL not valid yet — append query manually as best-effort
    const q = rows
      .filter((r) => r.Key)
      .map((r) => `${encodeURIComponent(r.Key)}=${encodeURIComponent(r.Value)}`)
      .join('&')
    if (!q) return url
    return url.includes('?') ? `${url.split('?')[0]}?${q}` : `${url}?${q}`
  }
}

// URL-encode form fields the way an `application/x-www-form-urlencoded` body needs.
export function encodeFormBody(rows: KV[]): string {
  const sp = new URLSearchParams()
  for (const r of rows) {
    if (r.Key) sp.append(r.Key, r.Value)
  }
  return sp.toString()
}
