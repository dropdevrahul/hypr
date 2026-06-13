import {useState} from 'react'
import {MakeRequest, RunCurl, Export} from '../wailsjs/go/main/App'
import {main} from '../wailsjs/go/models'
import {
  Send,
  Download,
  Plus,
  X,
  Code2,
  Zap,
  Braces,
  List,
  AlertTriangle,
  Inbox,
  Loader2,
} from 'lucide-react'
import {Header} from './lib/header'
import {RequestHeader} from './components/headerform'
import {JsonView} from './components/json-view'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Textarea} from '@/components/ui/textarea'
import {Label} from '@/components/ui/label'
import {Badge} from '@/components/ui/badge'
import {Separator} from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {Tabs, TabsList, TabsTrigger, TabsContent} from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

class Request {
  method: string
  url: string
  headers: {[key: string]: string}
  body: string

  constructor(source: any = {}) {
    if ('string' === typeof source) source = JSON.parse(source)
    this.method = source['method'] || source['Method'] || 'GET'
    this.url = source['url'] || ''
    this.headers = source['headers'] || {}
    this.body = source['body'] || ''
  }
}

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const

const METHOD_HSL: {[key: string]: string} = {
  GET: '152 60% 52%',
  POST: '38 92% 58%',
  PUT: '212 90% 62%',
  DELETE: '0 84% 64%',
  PATCH: '265 85% 70%',
}

const methodColor = (m: string) => `hsl(${METHOD_HSL[m] ?? '84 78% 56%'})`

const emptyResult = () => new main.RequestResult()

// "Key: Value\nKey: Value" -> Header[]
function parseHeaderLines(raw: string): Header[] {
  const rows = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(':')
      if (idx === -1) return {Key: line, Value: ''}
      return {Key: line.slice(0, idx).trim(), Value: line.slice(idx + 1).trim()}
    })
  return rows.length ? rows : [{Key: '', Value: ''}]
}

function App() {
  const [reqBodies, setReqBodies] = useState<Array<string>>([''])
  const [reqHeaders, setReqHeaders] = useState<Array<Array<Header>>>([
    [
      {Key: '', Value: ''},
      {Key: '', Value: ''},
      {Key: '', Value: ''},
    ],
  ])
  const [responses, setResponses] = useState<Array<main.RequestResult>>([emptyResult()])
  const [activeTab, setActiveTab] = useState(0)
  const [request, setRequest] = useState(new Request({method: 'GET'}))
  const [curlBody, setCurlBody] = useState('')
  const [open, setOpen] = useState(false)
  const [responseTab, setResponseTab] = useState('body')
  const [loading, setLoading] = useState(false)

  const result = responses[activeTab] ?? emptyResult()
  const hasResponse = Boolean(result.Body || result.Error || result.HeadersStr)

  const setMethod = (method: string) => setRequest((p) => ({...p, method}))
  const setUrl = (url: string) => setRequest((p) => ({...p, url}))

  const addNewTab = () => {
    setReqBodies([...reqBodies, ''])
    setReqHeaders([...reqHeaders, [{Key: '', Value: ''}]])
    setResponses([...responses, emptyResult()])
    setActiveTab(reqBodies.length)
  }

  const closeTab = (e: React.MouseEvent, index: number) => {
    e.stopPropagation()
    if (reqBodies.length === 1) return
    setReqBodies(reqBodies.filter((_, i) => i !== index))
    setReqHeaders(reqHeaders.filter((_, i) => i !== index))
    setResponses(responses.filter((_, i) => i !== index))
    if (activeTab >= index && activeTab > 0) setActiveTab(activeTab - 1)
  }

  const updateReqBody = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newBodies = [...reqBodies]
    newBodies[activeTab] = e.target.value
    setReqBodies(newBodies)
  }

  const addHeader = () => {
    const newHeaders = [...reqHeaders]
    newHeaders[activeTab] = [...newHeaders[activeTab], {Key: '', Value: ''}]
    setReqHeaders(newHeaders)
  }

  const storeResponse = (r: main.RequestResult) => {
    const next = [...responses]
    next[activeTab] = r
    setResponses(next)
    setResponseTab(r.Body ? 'body' : r.HeadersStr ? 'headers' : 'body')
  }

  function makeRequest() {
    const headers: {[key: string]: string} = {}
    for (const h of reqHeaders[activeTab]) {
      if (h.Key && h.Value) headers[h.Key] = h.Value
    }
    setLoading(true)
    MakeRequest(request.url, request.method, reqBodies[activeTab], headers)
      .then((r) => storeResponse(r))
      .finally(() => setLoading(false))
  }

  function importCurl() {
    RunCurl(curlBody).then((r: main.RequestResult) => {
      setRequest(new Request({method: r.Method, url: r.URL}))
      const newBodies = [...reqBodies]
      newBodies[activeTab] = r.RequestBody || ''
      setReqBodies(newBodies)
      const newHeaders = [...reqHeaders]
      newHeaders[activeTab] = parseHeaderLines(r.ReqHeaders || '')
      setReqHeaders(newHeaders)
      storeResponse(r)
      setOpen(false)
      setCurlBody('')
    })
  }

  function handleExport() {
    Export(request as any, reqHeaders, reqBodies, result)
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-6 py-5 lg:px-10">
      {/* ── Top bar ─────────────────────────────────────────── */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
            <Zap className="h-[18px] w-[18px] text-primary" />
          </div>
          <div className="leading-none">
            <div className="font-mono text-lg font-bold tracking-[0.2em] text-foreground">
              HYPR
            </div>
            <div className="mt-1 text-[0.7rem] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              REST workbench
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            <Code2 />
            Import cURL
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExport}>
            <Download />
            Export
          </Button>
        </div>
      </header>

      <Separator className="my-5 bg-border/60" />

      {/* ── Request bar ─────────────────────────────────────── */}
      <div className="flex flex-col gap-2.5 rounded-xl border border-border/80 bg-card/60 p-2.5 backdrop-blur-sm sm:flex-row sm:items-center">
        <Select value={request.method} onValueChange={setMethod}>
          <SelectTrigger
            className="h-11 w-full font-mono font-bold sm:w-[130px]"
            style={{
              borderColor: methodColor(request.method),
              color: methodColor(request.method),
              boxShadow: `inset 0 0 0 1px ${methodColor(request.method)}, 0 0 18px -8px ${methodColor(
                request.method
              )}`,
            }}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METHODS.map((m) => (
              <SelectItem key={m} value={m} className="font-mono font-semibold">
                <span style={{color: methodColor(m)}}>{m}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          value={request.url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && makeRequest()}
          placeholder="https://api.example.com/v1/resource"
          className="h-11 flex-1 font-mono text-sm"
        />

        <Button
          onClick={makeRequest}
          disabled={loading}
          size="lg"
          className="h-11 w-full sm:w-auto"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Send />}
          {loading ? 'Sending' : 'Send'}
        </Button>
      </div>

      {/* ── Request tabs ────────────────────────────────────── */}
      <div className="mt-5 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-1.5 overflow-x-auto pb-1">
          {reqBodies.map((_, index) => {
            const active = index === activeTab
            return (
              <button
                key={index}
                onClick={() => setActiveTab(index)}
                className={[
                  'group flex shrink-0 items-center gap-2 rounded-lg border px-3.5 py-2 font-mono text-xs font-semibold tracking-wide transition-all',
                  active
                    ? 'border-primary/40 bg-primary/15 text-primary'
                    : 'border-border/70 bg-card/40 text-muted-foreground hover:border-border hover:text-foreground',
                ].join(' ')}
              >
                <span
                  className={[
                    'h-1.5 w-1.5 rounded-full',
                    active ? 'bg-primary' : 'bg-muted-foreground/40',
                  ].join(' ')}
                />
                REQ {String(index + 1).padStart(2, '0')}
                {reqBodies.length > 1 && (
                  <span
                    role="button"
                    aria-label="Close tab"
                    onClick={(e) => closeTab(e, index)}
                    className="-mr-1 grid h-5 w-5 place-items-center rounded text-muted-foreground/70 transition-colors hover:bg-destructive/20 hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={addNewTab}
          className="h-10 w-10 shrink-0 border-primary/30 text-primary hover:bg-primary/15 hover:text-primary"
          aria-label="New request tab"
        >
          <Plus />
        </Button>
      </div>

      {/* ── Request editor ──────────────────────────────────── */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Headers */}
        <section className="rounded-xl border border-border/80 bg-card/50 p-4 backdrop-blur-sm lg:col-span-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <List className="h-4 w-4 text-primary" />
              <Label>Request headers</Label>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={addHeader}
              className="-mr-1 h-7 gap-1.5 px-2 text-xs font-medium text-primary hover:bg-primary/15 hover:text-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {reqHeaders[activeTab].map((header, index) => (
              <RequestHeader
                key={index}
                header={header}
                index={index}
                activeTab={activeTab}
                reqHeaders={reqHeaders}
                setReqHeaders={setReqHeaders}
              />
            ))}
          </div>
        </section>

        {/* Body */}
        <section className="rounded-xl border border-border/80 bg-card/50 p-4 backdrop-blur-sm lg:col-span-7">
          <div className="mb-3 flex items-center gap-2">
            <Braces className="h-4 w-4 text-method-post" />
            <Label>Request body</Label>
          </div>
          <Textarea
            value={reqBodies[activeTab]}
            onChange={updateReqBody}
            placeholder="// Raw request body — JSON, form data, etc."
            spellCheck={false}
            className="min-h-[300px] resize-none font-mono text-[0.8125rem] leading-relaxed"
          />
        </section>
      </div>

      {/* ── Response ────────────────────────────────────────── */}
      <div className="mt-5 flex-1">
        {hasResponse ? (
          <div className="animate-fade-in">
            <div className="mb-3 flex items-center gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-foreground">
                Response
              </h2>
              {result.HeadersStr && !result.Error && (
                <Badge className="border-method-get/30 bg-method-get/10 text-method-get">
                  Received
                </Badge>
              )}
              {result.Error && (
                <Badge className="border-destructive/30 bg-destructive/10 text-destructive">
                  Error
                </Badge>
              )}
            </div>

            <div className="overflow-hidden rounded-xl border border-border/80 bg-card/50 backdrop-blur-sm">
              <Tabs value={responseTab} onValueChange={setResponseTab}>
                <div className="border-b border-border/70 px-2">
                  <TabsList className="h-11">
                    <TabsTrigger
                      value="body"
                      className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
                    >
                      <Braces className="mr-1.5 h-3.5 w-3.5" />
                      Body
                    </TabsTrigger>
                    <TabsTrigger
                      value="headers"
                      className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
                    >
                      <List className="mr-1.5 h-3.5 w-3.5" />
                      Headers
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="body" className="m-0">
                  <div className="max-h-[460px] overflow-auto bg-background/40 p-4">
                    {result.Body ? (
                      <JsonView data={result.Body} />
                    ) : (
                      <p className="text-sm italic text-muted-foreground">
                        No response body
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="headers" className="m-0">
                  <div className="max-h-[460px] overflow-auto bg-background/40 p-4">
                    {result.HeadersStr ? (
                      <JsonView data={result.HeadersStr} />
                    ) : (
                      <p className="text-sm italic text-muted-foreground">
                        No response headers
                      </p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {result.Error && (
              <div className="mt-4 rounded-xl border border-destructive/25 bg-destructive/10 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Request failed
                </div>
                <pre className="whitespace-pre-wrap break-words font-mono text-[0.8125rem] text-destructive/90">
                  {result.Error}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div className="grid place-items-center rounded-xl border border-dashed border-border/70 bg-card/20 px-6 py-16 text-center">
            <Inbox className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-base font-semibold text-muted-foreground">
              No response yet
            </p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Enter a URL and hit Send, or import a cURL command to get started.
            </p>
          </div>
        )}
      </div>

      {/* ── cURL import dialog ──────────────────────────────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-primary" />
              Import cURL
            </DialogTitle>
            <DialogDescription>
              Paste a cURL command — it runs immediately and fills this tab.
            </DialogDescription>
          </DialogHeader>
          <div className="p-5">
            <Textarea
              autoFocus
              value={curlBody}
              onChange={(e) => setCurlBody(e.target.value)}
              placeholder="curl -X POST https://api.example.com -H 'Content-Type: application/json' -d '{}'"
              spellCheck={false}
              className="min-h-[200px] resize-none font-mono text-[0.8125rem]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={importCurl} disabled={!curlBody.trim()}>
              <Send />
              Import &amp; run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default App
