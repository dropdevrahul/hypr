import {X} from 'lucide-react'
import {Input} from '@/components/ui/input'
import {Button} from '@/components/ui/button'
import type {KV} from '@/lib/kv'

interface KVRowProps {
  row: KV
  index: number
  total: number
  keyPlaceholder?: string
  valuePlaceholder?: string
  onChange: (idx: number, field: 'Key' | 'Value', value: string) => void
  onRemove: (idx: number) => void
}

export function KVRow({
  row,
  index,
  total,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  onChange,
  onRemove,
}: KVRowProps) {
  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder={keyPlaceholder}
        value={row.Key}
        onChange={(e) => onChange(index, 'Key', e.target.value)}
        className="h-9 w-[38%] font-mono text-[0.8125rem]"
      />
      <Input
        placeholder={valuePlaceholder}
        value={row.Value}
        onChange={(e) => onChange(index, 'Value', e.target.value)}
        className="h-9 flex-1 font-mono text-[0.8125rem]"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onRemove(index)}
        disabled={total === 1}
        className="shrink-0 text-muted-foreground hover:bg-destructive/15 hover:text-destructive disabled:opacity-30"
        aria-label="Remove row"
      >
        <X />
      </Button>
    </div>
  )
}
