export interface KV {
  Key: string
  Value: string
}

export const emptyKV = (): KV => ({Key: '', Value: ''})

export const kvToRecord = (rows: KV[]): Record<string, string> => {
  const out: Record<string, string> = {}
  for (const r of rows) {
    if (r.Key) out[r.Key] = r.Value
  }
  return out
}

export const updateRowsAt = (
  rows: KV[][],
  tab: number,
  idx: number,
  field: 'Key' | 'Value',
  value: string
): KV[][] => {
  const next = [...rows]
  const tabRows = [...next[tab]]
  tabRows[idx] = {...tabRows[idx], [field]: value}
  next[tab] = tabRows
  return next
}

export const removeRowAt = (rows: KV[][], tab: number, idx: number): KV[][] => {
  if (rows[tab].length === 1) return rows
  const next = [...rows]
  next[tab] = next[tab].filter((_, i) => i !== idx)
  return next
}

export const addRowAt = (rows: KV[][], tab: number): KV[][] => {
  const next = [...rows]
  next[tab] = [...next[tab], emptyKV()]
  return next
}
