import {useEffect, useRef, useState} from 'react'
import {
  Send as SendBinding,
  RunCurl,
  Export,
  SaveTextFile,
  ListCollections,
  SaveCollection,
  DeleteCollection,
  SaveRequest as SaveRequestBinding,
  DeleteRequest as DeleteRequestBinding,
  AppendHistory,
  ListHistory,
  ClearHistory,
  LoadSession,
  SaveSession,
} from '../wailsjs/go/main/App'
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
  Copy,
  Save,
  Search,
  KeyRound,
  Settings as SettingsIcon,
  Link2,
  PanelLeftClose,
  PanelLeftOpen,
  Layers,
  Check,
} from 'lucide-react'
import {KVRow} from './components/kv-row'
import {AuthForm} from './components/auth-form'
import {SettingsForm} from './components/settings-form'
import {BodyEditor, type BodyType} from './components/body-editor'
import {JsonView} from './components/json-view'
import {HighlightedText, countMatches} from './components/highlighted-text'
import {Sidebar} from './components/sidebar'
import {SaveRequestDialog} from './components/save-request-dialog'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Textarea} from '@/components/ui/textarea'
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
import {appendRow, dropRow, emptyKV, kvToRecord, setRow, type KV} from './lib/kv'
import {applyAuth, emptyAuth, type AuthState} from './lib/auth'
import {defaultSettings, type ReqSettings} from './lib/settings'
import {encodeFormBody, parseUrlParams, rebuildUrlWithParams} from './lib/url-sync'
import {buildCurl} from './lib/curl-builder'
import {formatDuration, formatSize, statusChipClass} from './lib/formatters'
import {readDraft, writeDraft} from './lib/autosave'
import {
  emptyPayload,
  emptyRequest,
  emptyResult,
  initialHeaderRows,
  toStoredPayload,
  updatePayload,
  updateRequest,
  type Payload,
  type RequestTab,
} from './lib/model'

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const

const METHOD_HSL: {[key: string]: string} = {
  GET: '152 60% 52%',
  POST: '38 92% 58%',
  PUT: '212 90% 62%',
  DELETE: '0 84% 64%',
  PATCH: '265 85% 70%',
  HEAD: '200 30% 60%',
  OPTIONS: '200 30% 60%',
}

const methodColor = (m: string) => `hsl(${METHOD_HSL[m] ?? '84 78% 56%'})`

const genId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

const formatClock = (ms: number): string =>
  new Date(ms).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'})

// "Key: Value\nKey: Value" -> KV[]
function parseHeaderLines(raw: string): KV[] {
  const rows = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(':')
      if (idx === -1) return {Key: line, Value: ''}
      return {Key: line.slice(0, idx).trim(), Value: line.slice(idx + 1).trim()}
    })
  return rows.length ? rows : [emptyKV()]
}

function App() {
  // ── Two-level nested state ────────────────────────────────────
  const [requests, setRequests] = useState<RequestTab[]>([emptyRequest()])
  const [activeRequest, setActiveRequest] = useState(0)

  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // UI state
  const [requestSection, setRequestSection] = useState('headers')
  const [responseTab, setResponseTab] = useState('body')
  const [bodyView, setBodyView] = useState<'pretty' | 'raw'>('pretty')
  const [search, setSearch] = useState('')
  const [curlOpen, setCurlOpen] = useState(false)
  const [curlBody, setCurlBody] = useState('')
  const [saveOpen, setSaveOpen] = useState(false)

  // Persistence state
  const [collections, setCollections] = useState<main.Collection[]>([])
  const [history, setHistory] = useState<main.HistoryEntry[]>([])
  const [focusCollectionId, setFocusCollectionId] = useState<string | undefined>()
  const sessionSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Gate session writes until the initial load completes, so a slow load
  // can't be clobbered by an early persist of the empty default state.
  const hydratedRef = useRef(false)
  const [lastSaved, setLastSaved] = useState<number | null>(null)

  // ── Derived accessors for active request / payload ────────────
  const req = requests[activeRequest] ?? emptyRequest()
  const pIdx = req.activePayload
  const payload = req.payloads[pIdx] ?? emptyPayload()
  const method = req.method
  const url = req.url
  const result = payload.response ?? emptyResult()
  const hasResponse = Boolean(
    result.Body || result.Error || result.HeadersStr || result.Status
  )

  // ── Session persistence ───────────────────────────────────────
  function buildRequestState(r: RequestTab) {
    return {
      savedId: r.savedId ?? '',
      method: r.method,
      url: r.url,
      auth: r.auth,
      settings: r.settings,
      payloads: r.payloads.map(toStoredPayload),
      activePayload: r.activePayload,
    }
  }

  function persistSession(nextRequests?: RequestTab[], nextActive?: number) {
    const rs = nextRequests ?? requests
    const active = nextActive ?? activeRequest
    if (sessionSaveTimer.current) clearTimeout(sessionSaveTimer.current)
    sessionSaveTimer.current = setTimeout(() => {
      SaveSession({
        openRequests: rs.map(buildRequestState),
        activeRequest: active,
      } as any).catch(() => {})
    }, 800)
  }

  // Autosave whenever requests / activeRequest change (after initial hydration):
  // an instant localStorage draft + the durable Go store (debounced).
  useEffect(() => {
    if (!hydratedRef.current) return
    if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current)
    draftSaveTimer.current = setTimeout(() => {
      const ts = writeDraft({
        openRequests: requests.map(buildRequestState),
        activeRequest,
      })
      if (ts) setLastSaved(ts)
    }, 400)
    persistSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests, activeRequest])

  function payloadFromStored(p: any): Payload {
    return {
      headers: p?.headers?.length ? p.headers : initialHeaderRows(),
      params: p?.params?.length ? p.params : [emptyKV()],
      bodyType: (p?.bodyType as BodyType) || 'none',
      jsonBody: p?.jsonBody || '',
      rawBody: p?.rawBody || '',
      formRows: p?.formRows?.length ? p.formRows : [emptyKV()],
      response: p?.response ? main.RequestResult.createFrom(p.response) : emptyResult(),
    }
  }

  function requestFromStored(t: any): RequestTab {
    const payloads: Payload[] = t?.payloads?.length
      ? t.payloads.map(payloadFromStored)
      : [emptyPayload()]
    return {
      savedId: t?.savedId || undefined,
      method: t?.method || 'GET',
      url: t?.url || '',
      auth: (t?.auth as AuthState) || emptyAuth(),
      settings: (t?.settings as ReqSettings) || defaultSettings(),
      payloads,
      activePayload: Math.min(t?.activePayload || 0, payloads.length - 1),
    }
  }

  // ── On mount: restore session (localStorage draft first, then Go store) ──
  useEffect(() => {
    const draft = readDraft()
    if (draft?.openRequests?.length) {
      // Fast path: hydrate instantly from the local draft.
      const rs = draft.openRequests.map(requestFromStored)
      setRequests(rs)
      setActiveRequest(Math.min(draft.activeRequest || 0, rs.length - 1))
      setLastSaved(draft.savedAt)
      hydratedRef.current = true
    } else {
      LoadSession()
        .then((s: any) => {
          if (s?.openRequests?.length) {
            const rs = s.openRequests.map(requestFromStored)
            setRequests(rs)
            setActiveRequest(Math.min(s.activeRequest || 0, rs.length - 1))
          }
        })
        .catch(() => {})
        .finally(() => {
          hydratedRef.current = true
        })
    }

    ListCollections()
      .then((c) => setCollections((c as main.Collection[]) ?? []))
      .catch(() => {})

    ListHistory(50)
      .then((h) => setHistory((h as main.HistoryEntry[]) ?? []))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Request-level tab plumbing ────────────────────────────────
  const addRequest = () => {
    setRequests((prev) => [...prev, emptyRequest()])
    setActiveRequest(requests.length)
  }

  const closeRequest = (e: React.MouseEvent, index: number) => {
    e.stopPropagation()
    if (requests.length === 1) return
    const next = requests.filter((_, i) => i !== index)
    setRequests(next)
    setActiveRequest(
      activeRequest > index ? activeRequest - 1 : Math.min(activeRequest, next.length - 1)
    )
  }

  const switchRequest = (index: number) => setActiveRequest(index)

  // ── Payload-level tab plumbing (within active request) ────────
  const addPayload = () => {
    setRequests((prev) => {
      const r = prev[activeRequest]
      const cur = r.payloads[r.activePayload]
      const copy: Payload = {
        ...cur,
        response: emptyResult(),
        headers: cur.headers.map((x) => ({...x})),
        params: cur.params.map((x) => ({...x})),
        formRows: cur.formRows.map((x) => ({...x})),
      }
      return updateRequest(prev, activeRequest, {
        payloads: [...r.payloads, copy],
        activePayload: r.payloads.length,
      })
    })
  }

  const closePayload = (e: React.MouseEvent, index: number) => {
    e.stopPropagation()
    setRequests((prev) => {
      const r = prev[activeRequest]
      if (r.payloads.length === 1) return prev
      const nextPayloads = r.payloads.filter((_, i) => i !== index)
      const nextActive =
        r.activePayload > index
          ? r.activePayload - 1
          : Math.min(r.activePayload, nextPayloads.length - 1)
      return updateRequest(prev, activeRequest, {
        payloads: nextPayloads,
        activePayload: nextActive,
      })
    })
  }

  const switchPayload = (index: number) =>
    setRequests((prev) => updateRequest(prev, activeRequest, {activePayload: index}))

  // ── Request-level field handlers (shared across payloads) ─────
  const setMethod = (m: string) =>
    setRequests((prev) => updateRequest(prev, activeRequest, {method: m}))
  const onUrlChange = (newUrl: string) =>
    setRequests((prev) => updateRequest(prev, activeRequest, {url: newUrl}))
  const setAuth = (a: AuthState) =>
    setRequests((prev) => updateRequest(prev, activeRequest, {auth: a}))
  const setRequestSettings = (s: ReqSettings) =>
    setRequests((prev) => updateRequest(prev, activeRequest, {settings: s}))

  // ── Payload-level field handlers ──────────────────────────────
  const onHeaderChange = (idx: number, field: 'Key' | 'Value', value: string) =>
    setRequests((prev) =>
      updatePayload(prev, activeRequest, pIdx, {headers: setRow(payload.headers, idx, field, value)})
    )
  const onHeaderRemove = (idx: number) =>
    setRequests((prev) =>
      updatePayload(prev, activeRequest, pIdx, {headers: dropRow(payload.headers, idx)})
    )
  const onHeaderAdd = () =>
    setRequests((prev) =>
      updatePayload(prev, activeRequest, pIdx, {headers: appendRow(payload.headers)})
    )

  const onParamChange = (idx: number, field: 'Key' | 'Value', value: string) =>
    setRequests((prev) =>
      updatePayload(prev, activeRequest, pIdx, {params: setRow(payload.params, idx, field, value)})
    )
  const onParamRemove = (idx: number) =>
    setRequests((prev) =>
      updatePayload(prev, activeRequest, pIdx, {params: dropRow(payload.params, idx)})
    )
  const onParamAdd = () =>
    setRequests((prev) =>
      updatePayload(prev, activeRequest, pIdx, {params: appendRow(payload.params)})
    )

  const setBodyType = (t: BodyType) =>
    setRequests((prev) => updatePayload(prev, activeRequest, pIdx, {bodyType: t}))
  const setJsonBody = (s: string) =>
    setRequests((prev) => updatePayload(prev, activeRequest, pIdx, {jsonBody: s}))
  const setRawBody = (s: string) =>
    setRequests((prev) => updatePayload(prev, activeRequest, pIdx, {rawBody: s}))
  const setFormRowsForPayload = (rows: KV[]) =>
    setRequests((prev) => updatePayload(prev, activeRequest, pIdx, {formRows: rows}))

  // ── Build the final RequestSpec for the active payload ────────
  function buildSpec(): main.RequestSpec {
    const userHeaders = kvToRecord(payload.headers)
    const auth = applyAuth(req.auth)
    const mergedHeaders: Record<string, string> = {...userHeaders, ...auth.headers}

    let finalUrl = rebuildUrlWithParams(req.url, payload.params)
    if (auth.query.length) {
      try {
        const u = new URL(finalUrl)
        for (const [k, v] of auth.query) u.searchParams.append(k, v)
        finalUrl = u.toString()
      } catch {
        const q = auth.query
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
          .join('&')
        finalUrl = finalUrl.includes('?') ? `${finalUrl}&${q}` : `${finalUrl}?${q}`
      }
    }

    let body: main.BodySpec = main.BodySpec.createFrom({type: 'none', raw: ''})
    if (payload.bodyType === 'json') {
      const raw = payload.jsonBody
      if (raw && !mergedHeaders['Content-Type']) {
        mergedHeaders['Content-Type'] = 'application/json'
      }
      body = main.BodySpec.createFrom({type: 'json', raw})
    } else if (payload.bodyType === 'form') {
      const raw = encodeFormBody(payload.formRows)
      if (raw && !mergedHeaders['Content-Type']) {
        mergedHeaders['Content-Type'] = 'application/x-www-form-urlencoded'
      }
      body = main.BodySpec.createFrom({type: 'form', raw})
    } else if (payload.bodyType === 'raw') {
      body = main.BodySpec.createFrom({type: 'raw', raw: payload.rawBody})
    }

    const s = req.settings
    return main.RequestSpec.createFrom({
      method: req.method,
      url: finalUrl,
      headers: mergedHeaders,
      body,
      settings: {timeoutMs: s.timeoutMs, followRedirects: s.followRedirects, verifyTLS: s.verifyTLS},
    })
  }

  const storeResponse = (r: main.RequestResult) => {
    setRequests((prev) => updatePayload(prev, activeRequest, pIdx, {response: r}))
    setResponseTab(r.Body ? 'body' : r.HeadersStr ? 'headers' : 'body')
    setBodyView('pretty')
    setSearch('')
  }

  function makeRequest() {
    const spec = buildSpec()
    setLoading(true)
    SendBinding(spec)
      .then((r) => {
        storeResponse(r)
        AppendHistory({
          id: '',
          method: spec.method,
          url: spec.url,
          status: r.Status,
          statusText: r.StatusText,
          durationMs: r.DurationMs,
          sentAt: new Date().toISOString(),
        } as any)
          .then(() => {
            ListHistory(50).then((h) => setHistory((h as main.HistoryEntry[]) ?? [])).catch(() => {})
          })
          .catch(() => {})
      })
      .finally(() => setLoading(false))
  }

  function importCurl() {
    RunCurl(curlBody).then((r) => {
      const parsed = parseHeaderLines(r.ReqHeaders || '')
      const p = parseUrlParams(r.URL || '')
      setRequests((prev) =>
        prev.map((reqTab, i) => {
          if (i !== activeRequest) return reqTab
          const updatedPayload: Payload = {
            ...reqTab.payloads[reqTab.activePayload],
            headers: parsed.length ? parsed : initialHeaderRows(),
            params: p ?? [emptyKV()],
            response: r,
          }
          if (r.RequestBody) {
            updatedPayload.bodyType = 'raw'
            updatedPayload.rawBody = r.RequestBody
          }
          return {
            ...reqTab,
            method: r.Method || 'GET',
            url: r.URL || '',
            payloads: reqTab.payloads.map((pl, j) =>
              j === reqTab.activePayload ? updatedPayload : pl
            ),
          }
        })
      )
      setResponseTab(r.Body ? 'body' : 'headers')
      setBodyView('pretty')
      setSearch('')
      setCurlOpen(false)
      setCurlBody('')
    })
  }

  function handleExport() {
    Export(
      {
        method: req.method,
        url: req.url,
        headers: kvToRecord(payload.headers),
        body: payload.rawBody || payload.jsonBody || '',
      } as unknown as main.Request,
      payload.headers as unknown as Array<unknown>,
      [payload.rawBody || payload.jsonBody || ''],
      result
    )
  }

  function copyAsCurl() {
    const spec = buildSpec()
    const cmd = buildCurl({
      method: spec.method,
      url: spec.url,
      headers: spec.headers,
      body: spec.body.raw || undefined,
      bodyFlag: payload.bodyType === 'json' ? '--data-raw' : '-d',
    })
    navigator.clipboard.writeText(cmd)
  }

  function copyBody() {
    if (result.Body) navigator.clipboard.writeText(result.Body)
  }

  function saveBody() {
    if (result.Body) SaveTextFile('response.txt', result.Body)
  }

  // ── Load a saved request: switch to it if already open, else open a tab ──
  function loadRequestToTab(saved: main.SavedRequest) {
    const existing = requests.findIndex((r) => r.savedId && r.savedId === saved.id)
    if (existing !== -1) {
      setActiveRequest(existing)
      return
    }
    const newReq: RequestTab = {...requestFromStored(saved), savedId: saved.id}
    setRequests((prev) => [...prev, newReq])
    setActiveRequest(requests.length)
  }

  function loadHistoryToTab(entry: main.HistoryEntry) {
    setRequests((prev) =>
      updateRequest(prev, activeRequest, {method: entry.method, url: entry.url})
    )
  }

  // ── Collection / save-request handlers ───────────────────────
  async function handleNewCollection(name: string): Promise<string> {
    await SaveCollection({id: '', name, requests: []} as any)
    const updated = await ListCollections()
    setCollections((updated as main.Collection[]) ?? [])
    return (updated as main.Collection[])?.find((c) => c.name === name)?.id ?? ''
  }

  async function handleDeleteCollection(id: string) {
    await DeleteCollection(id)
    setCollections((prev) => prev.filter((c) => c.id !== id))
  }

  async function handleDeleteRequest(collectionId: string, reqId: string) {
    await DeleteRequestBinding(collectionId, reqId)
    const updated = await ListCollections()
    setCollections((updated as main.Collection[]) ?? [])
  }

  async function handleClearHistory() {
    await ClearHistory()
    setHistory([])
  }

  async function handleSaveRequest(name: string, collectionId: string) {
    // Reuse the tab's existing id so re-saving updates in place; otherwise mint one
    // up front so we can link the open tab to it (and avoid duplicates on re-save).
    const id = req.savedId || genId()
    const reqState = buildRequestState(req)
    await SaveRequestBinding(collectionId, {
      ...reqState,
      id,
      name,
      createdAt: '',
      updatedAt: '',
    } as any)
    // Link the active tab to the saved request.
    setRequests((prev) => updateRequest(prev, activeRequest, {savedId: id}))
    const updated = await ListCollections()
    setCollections((updated as main.Collection[]) ?? [])
    setFocusCollectionId(collectionId)
  }

  const matches = result.Body ? countMatches(result.Body, search) : 0

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      {sidebarOpen && (
        <Sidebar
          collections={collections}
          history={history}
          focusCollectionId={focusCollectionId}
          onLoadRequest={loadRequestToTab}
          onLoadHistory={loadHistoryToTab}
          onSaveRequest={() => setSaveOpen(true)}
          onNewTab={addRequest}
          onNewCollection={handleNewCollection}
          onDeleteCollection={handleDeleteCollection}
          onDeleteRequest={handleDeleteRequest}
          onClearHistory={handleClearHistory}
        />
      )}

      {/* ── Main area ────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col overflow-auto px-6 py-5 lg:px-8">
        {/* ── Top bar ─────────────────────────────────────────── */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen((p) => !p)}
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </Button>
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
          </div>
          <div className="flex items-center gap-2">
            {lastSaved && (
              <span
                className="mr-1 flex items-center gap-1.5 text-[0.7rem] font-medium text-muted-foreground"
                title={`Autosaved at ${formatClock(lastSaved)}`}
              >
                <Check className="h-3.5 w-3.5 text-primary" />
                Autosaved {formatClock(lastSaved)}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={() => setCurlOpen(true)}>
              <Code2 />
              Import cURL
            </Button>
            <Button variant="ghost" size="sm" onClick={copyAsCurl}>
              <Copy />
              Copy as cURL
            </Button>
            <Button variant="ghost" size="sm" onClick={handleExport}>
              <Download />
              Export
            </Button>
          </div>
        </header>

        <Separator className="my-5 bg-border/60" />

        {/* ── Request tabs (top level) ────────────────────────── */}
        <div className="mb-3 flex items-center gap-2">
          <div className="flex flex-1 items-center gap-1.5 overflow-x-auto pb-1">
            {requests.map((_, index) => {
              const active = index === activeRequest
              return (
                <button
                  key={index}
                  onClick={() => switchRequest(index)}
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
                  {requests.length > 1 && (
                    <span
                      role="button"
                      aria-label="Close request"
                      onClick={(e) => closeRequest(e, index)}
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
            onClick={addRequest}
            className="h-10 w-10 shrink-0 border-primary/30 text-primary hover:bg-primary/15 hover:text-primary"
            aria-label="New request"
          >
            <Plus />
          </Button>
        </div>

        {/* ── Request bar (shared URL + method) ───────────────── */}
        <div className="flex flex-col gap-2.5 rounded-xl border border-border/80 bg-card/60 p-2.5 backdrop-blur-sm sm:flex-row sm:items-center">
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger
              className="h-11 w-full font-mono font-bold sm:w-[130px]"
              style={{
                borderColor: methodColor(method),
                color: methodColor(method),
                boxShadow: `inset 0 0 0 1px ${methodColor(method)}, 0 0 18px -8px ${methodColor(method)}`,
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
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && makeRequest()}
            placeholder="https://api.example.com/v1/resource"
            className="h-11 flex-1 font-mono text-sm"
          />

          <Button
            onClick={makeRequest}
            disabled={loading || !url}
            size="lg"
            className="h-11 w-full sm:w-auto"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Send />}
            {loading ? 'Sending' : 'Send'}
          </Button>
        </div>

        {/* ── Payload tabs (within active request) ────────────── */}
        <div className="mt-4 flex items-center gap-2">
          <div className="flex items-center gap-1.5 pr-2 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <Layers className="h-3.5 w-3.5" />
            Payloads
          </div>
          <div className="flex flex-1 items-center gap-1.5 overflow-x-auto pb-1">
            {req.payloads.map((_, index) => {
              const active = index === pIdx
              return (
                <button
                  key={index}
                  onClick={() => switchPayload(index)}
                  className={[
                    'group flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[0.7rem] font-semibold transition-all',
                    active
                      ? 'border-primary/40 bg-primary/15 text-primary'
                      : 'border-border/70 bg-card/40 text-muted-foreground hover:border-border hover:text-foreground',
                  ].join(' ')}
                >
                  P{index + 1}
                  {req.payloads.length > 1 && (
                    <span
                      role="button"
                      aria-label="Close payload"
                      onClick={(e) => closePayload(e, index)}
                      className="-mr-0.5 grid h-4 w-4 place-items-center rounded text-muted-foreground/70 transition-colors hover:bg-destructive/20 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={addPayload}
            className="h-7 w-7 shrink-0 border-primary/30 text-primary hover:bg-primary/15 hover:text-primary"
            aria-label="New payload"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* ── Request editor (Headers / Params / Body / Auth / Settings) ── */}
        <section className="mt-3 rounded-xl border border-border/80 bg-card/50 p-4 backdrop-blur-sm">
          <Tabs value={requestSection} onValueChange={setRequestSection}>
            <TabsList className="mb-3 h-10 border-b border-border/60">
              <TabsTrigger
                value="headers"
                className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
              >
                <List className="mr-1.5 h-3.5 w-3.5" />
                Headers
              </TabsTrigger>
              <TabsTrigger
                value="params"
                className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
              >
                <Link2 className="mr-1.5 h-3.5 w-3.5" />
                Params
              </TabsTrigger>
              <TabsTrigger
                value="body"
                className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
              >
                <Braces className="mr-1.5 h-3.5 w-3.5" />
                Body
              </TabsTrigger>
              <TabsTrigger
                value="auth"
                className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
              >
                <KeyRound className="mr-1.5 h-3.5 w-3.5" />
                Auth
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
              >
                <SettingsIcon className="mr-1.5 h-3.5 w-3.5" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="headers" className="m-0">
              <div className="mb-2 flex items-center justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onHeaderAdd}
                  className="h-7 gap-1.5 px-2 text-xs text-primary hover:bg-primary/15 hover:text-primary"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              </div>
              <div className="flex flex-col gap-2">
                {payload.headers.map((row, idx) => (
                  <KVRow
                    key={idx}
                    row={row}
                    index={idx}
                    total={payload.headers.length}
                    keyPlaceholder="Header"
                    onChange={onHeaderChange}
                    onRemove={onHeaderRemove}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="params" className="m-0">
              <div className="mb-2 flex items-center justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onParamAdd}
                  className="h-7 gap-1.5 px-2 text-xs text-primary hover:bg-primary/15 hover:text-primary"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              </div>
              <div className="flex flex-col gap-2">
                {payload.params.map((row, idx) => (
                  <KVRow
                    key={idx}
                    row={row}
                    index={idx}
                    total={payload.params.length}
                    onChange={onParamChange}
                    onRemove={onParamRemove}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="body" className="m-0">
              <BodyEditor
                bodyType={payload.bodyType}
                onTypeChange={setBodyType}
                jsonBody={payload.jsonBody}
                onJsonChange={setJsonBody}
                rawBody={payload.rawBody}
                onRawChange={setRawBody}
                formRows={payload.formRows}
                onFormRowsChange={setFormRowsForPayload}
              />
            </TabsContent>

            <TabsContent value="auth" className="m-0">
              <p className="mb-3 text-xs text-muted-foreground">
                Shared across all payloads in this request.
              </p>
              <AuthForm auth={req.auth} onChange={setAuth} />
            </TabsContent>

            <TabsContent value="settings" className="m-0">
              <p className="mb-3 text-xs text-muted-foreground">
                Shared across all payloads in this request.
              </p>
              <SettingsForm settings={req.settings} onChange={setRequestSettings} />
            </TabsContent>
          </Tabs>
        </section>

        {/* ── Response ────────────────────────────────────────── */}
        <div className="mt-5 flex-1">
          {hasResponse ? (
            <div className="animate-fade-in">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-foreground">
                  Response
                </h2>
                <span className="font-mono text-[0.7rem] text-muted-foreground/70">
                  P{pIdx + 1}
                </span>
                {result.Status > 0 && (
                  <span
                    className={[
                      'inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-xs font-semibold',
                      statusChipClass(result.Status),
                    ].join(' ')}
                  >
                    {result.StatusText || result.Status}
                  </span>
                )}
                {result.DurationMs > 0 && (
                  <span className="font-mono text-xs text-muted-foreground">
                    · {formatDuration(result.DurationMs)}
                  </span>
                )}
                {result.SizeBytes > 0 && (
                  <span className="font-mono text-xs text-muted-foreground">
                    · {formatSize(result.SizeBytes)}
                  </span>
                )}
                {result.Error && (
                  <span className="inline-flex items-center rounded-md border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                    Error
                  </span>
                )}
              </div>

              <div className="overflow-hidden rounded-xl border border-border/80 bg-card/50 backdrop-blur-sm">
                <Tabs value={responseTab} onValueChange={setResponseTab}>
                  <div className="flex flex-col gap-2 border-b border-border/70 px-2 py-2 sm:flex-row sm:items-center sm:justify-between">
                    <TabsList className="h-9">
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

                    {responseTab === 'body' && result.Body && (
                      <div className="flex flex-wrap items-center gap-2">
                        <Tabs
                          value={bodyView}
                          onValueChange={(v) => setBodyView(v as 'pretty' | 'raw')}
                        >
                          <TabsList className="h-8 rounded-md border border-border/60 bg-card/40 p-0.5">
                            <TabsTrigger
                              value="pretty"
                              className="rounded-sm px-2 text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
                            >
                              Pretty
                            </TabsTrigger>
                            <TabsTrigger
                              value="raw"
                              className="rounded-sm px-2 text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
                            >
                              Raw
                            </TabsTrigger>
                          </TabsList>
                        </Tabs>

                        <div className="relative">
                          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search…"
                            className="h-8 w-44 pl-7 text-xs"
                          />
                          {search && (
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[0.65rem] text-muted-foreground">
                              {matches}
                            </span>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={copyBody}
                          aria-label="Copy body"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={saveBody}
                          aria-label="Save body"
                        >
                          <Save className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <TabsContent value="body" className="m-0">
                    <div className="max-h-[460px] overflow-auto bg-background/40 p-4">
                      {result.Body ? (
                        bodyView === 'pretty' && !search ? (
                          <JsonView data={result.Body} />
                        ) : (
                          <HighlightedText text={result.Body} query={search} />
                        )
                      ) : (
                        <p className="text-sm italic text-muted-foreground">No response body</p>
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
              <p className="text-base font-semibold text-muted-foreground">No response yet</p>
              <p className="mt-1 text-sm text-muted-foreground/70">
                Enter a URL and hit Send, or add payloads to compare variations.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* ── cURL import dialog ──────────────────────────────── */}
      <Dialog open={curlOpen} onOpenChange={setCurlOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-primary" />
              Import cURL
            </DialogTitle>
            <DialogDescription>
              Paste a cURL command — it runs immediately and fills the active payload.
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
            <Button variant="outline" onClick={() => setCurlOpen(false)}>
              Cancel
            </Button>
            <Button onClick={importCurl} disabled={!curlBody.trim()}>
              <Send />
              Import &amp; run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Save request dialog ─────────────────────────────── */}
      <SaveRequestDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        collections={collections}
        defaultName={`${method} ${url || 'request'}`}
        onSave={handleSaveRequest}
        onCreateCollection={handleNewCollection}
      />
    </div>
  )
}

export default App
