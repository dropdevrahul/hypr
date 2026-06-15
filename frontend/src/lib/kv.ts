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

// Single-array (per-payload) immutable row helpers.
export const setRow = (
  rows: KV[],
  idx: number,
  field: 'Key' | 'Value',
  value: string
): KV[] => rows.map((r, i) => (i === idx ? {...r, [field]: value} : r))

export const dropRow = (rows: KV[], idx: number): KV[] =>
  rows.length === 1 ? rows : rows.filter((_, i) => i !== idx)

export const appendRow = (rows: KV[]): KV[] => [...rows, emptyKV()]
