// Fast, browser-local autosave of the working session. Complements the durable
// Go JSON store: localStorage is synchronous, instant, and survives a reload even
// before (or if) the Go-side write happens.

const KEY = 'hypr:session:v1'

export interface DraftSession {
  openRequests: unknown[]
  activeRequest: number
  savedAt: number // epoch ms
}

// Persist the draft. Returns the save timestamp (epoch ms), or null on failure.
export function writeDraft(data: {openRequests: unknown[]; activeRequest: number}): number | null {
  const savedAt = Date.now()
  try {
    localStorage.setItem(KEY, JSON.stringify({...data, savedAt}))
    return savedAt
  } catch {
    return null
  }
}

export function readDraft(): DraftSession | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as DraftSession) : null
  } catch {
    return null
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
