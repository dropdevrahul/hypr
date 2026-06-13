export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

// Tailwind classes for the status chip, based on HTTP status class.
export function statusChipClass(status: number): string {
  if (status >= 200 && status < 300)
    return 'border-method-get/40 bg-method-get/10 text-method-get'
  if (status >= 300 && status < 400)
    return 'border-method-put/40 bg-method-put/10 text-method-put'
  if (status >= 400 && status < 500)
    return 'border-method-post/40 bg-method-post/10 text-method-post'
  if (status >= 500)
    return 'border-destructive/40 bg-destructive/10 text-destructive'
  return 'border-border/60 bg-card/40 text-muted-foreground'
}
