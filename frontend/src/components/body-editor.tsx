import {Wand2} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {Textarea} from '@/components/ui/textarea'
import {Tabs, TabsList, TabsTrigger} from '@/components/ui/tabs'
import {KVRow} from '@/components/kv-row'
import type {KV} from '@/lib/kv'

export type BodyType = 'none' | 'json' | 'form' | 'raw'

interface BodyEditorProps {
  bodyType: BodyType
  onTypeChange: (t: BodyType) => void
  jsonBody: string
  onJsonChange: (s: string) => void
  rawBody: string
  onRawChange: (s: string) => void
  formRows: KV[]
  onFormRowsChange: (rows: KV[]) => void
}

export function BodyEditor(props: BodyEditorProps) {
  const formatJSON = () => {
    try {
      props.onJsonChange(JSON.stringify(JSON.parse(props.jsonBody), null, 2))
    } catch {
      // leave as-is on parse error
    }
  }

  const updateForm = (idx: number, field: 'Key' | 'Value', value: string) => {
    const next = [...props.formRows]
    next[idx] = {...next[idx], [field]: value}
    props.onFormRowsChange(next)
  }

  const removeForm = (idx: number) => {
    if (props.formRows.length === 1) return
    props.onFormRowsChange(props.formRows.filter((_, i) => i !== idx))
  }

  const addForm = () => {
    props.onFormRowsChange([...props.formRows, {Key: '', Value: ''}])
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Tabs value={props.bodyType} onValueChange={(v) => props.onTypeChange(v as BodyType)}>
          <TabsList className="h-9 rounded-md border border-border/70 bg-card/40 p-1">
            <TabsTrigger
              value="none"
              className="rounded-sm px-2.5 text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
            >
              None
            </TabsTrigger>
            <TabsTrigger
              value="json"
              className="rounded-sm px-2.5 text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
            >
              JSON
            </TabsTrigger>
            <TabsTrigger
              value="form"
              className="rounded-sm px-2.5 text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
            >
              Form
            </TabsTrigger>
            <TabsTrigger
              value="raw"
              className="rounded-sm px-2.5 text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
            >
              Raw
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {props.bodyType === 'json' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={formatJSON}
            className="h-7 gap-1.5 px-2 text-xs text-primary hover:bg-primary/15 hover:text-primary"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Format
          </Button>
        )}
        {props.bodyType === 'form' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={addForm}
            className="h-7 gap-1.5 px-2 text-xs text-primary hover:bg-primary/15 hover:text-primary"
          >
            + Add
          </Button>
        )}
      </div>

      {props.bodyType === 'none' && (
        <p className="rounded-md border border-dashed border-border/60 px-3 py-8 text-center text-sm italic text-muted-foreground">
          No request body will be sent.
        </p>
      )}

      {props.bodyType === 'json' && (
        <Textarea
          value={props.jsonBody}
          onChange={(e) => props.onJsonChange(e.target.value)}
          placeholder='{"key": "value"}'
          spellCheck={false}
          className="min-h-[260px] resize-none font-mono text-[0.8125rem] leading-relaxed"
        />
      )}

      {props.bodyType === 'form' && (
        <div className="flex flex-col gap-2">
          {props.formRows.map((row, idx) => (
            <KVRow
              key={idx}
              row={row}
              index={idx}
              total={props.formRows.length}
              onChange={updateForm}
              onRemove={removeForm}
            />
          ))}
        </div>
      )}

      {props.bodyType === 'raw' && (
        <Textarea
          value={props.rawBody}
          onChange={(e) => props.onRawChange(e.target.value)}
          placeholder="// Raw request body"
          spellCheck={false}
          className="min-h-[260px] resize-none font-mono text-[0.8125rem] leading-relaxed"
        />
      )}
    </div>
  )
}
