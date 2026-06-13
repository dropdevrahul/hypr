import {X} from 'lucide-react'
import {Header} from '../lib/header'
import {Input} from '@/components/ui/input'
import {Button} from '@/components/ui/button'

export interface HeaderProps {
  header: Header
  index: number
  activeTab: number
  reqHeaders: Array<Array<Header>>
  setReqHeaders: (headers: Array<Array<Header>>) => void
}

export const RequestHeader = (props: HeaderProps) => {
  const updateHeader = (field: 'Key' | 'Value', value: string) => {
    const newHeaders = [...props.reqHeaders]
    newHeaders[props.activeTab][props.index] = {
      ...newHeaders[props.activeTab][props.index],
      [field]: value,
    }
    props.setReqHeaders(newHeaders)
  }

  const removeHeader = () => {
    if (props.reqHeaders[props.activeTab].length === 1) return
    const newHeaders = [...props.reqHeaders]
    newHeaders[props.activeTab].splice(props.index, 1)
    props.setReqHeaders(newHeaders)
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Header"
        value={props.header.Key}
        onChange={(e) => updateHeader('Key', e.target.value)}
        className="h-9 w-[38%] font-mono text-[0.8125rem]"
      />
      <Input
        placeholder="Value"
        value={props.header.Value}
        onChange={(e) => updateHeader('Value', e.target.value)}
        className="h-9 flex-1 font-mono text-[0.8125rem]"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={removeHeader}
        className="shrink-0 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
        aria-label="Remove header"
      >
        <X />
      </Button>
    </div>
  )
}
