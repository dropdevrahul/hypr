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
import {addRowAt, emptyKV, kvToRecord, removeRowAt, updateRowsAt, type KV} from './lib/kv'
import {applyAuth, emptyAuth, type AuthState} from './lib/auth'
import {defaultSettings, type ReqSettings} from './lib/settings'
import {encodeFormBody, parseUrlParams, rebuildUrlWithParams} from './lib/url-sync'
import {buildCurl} from './lib/curl-builder'
import {formatDuration, formatSize, statusChipClass} from './lib/formatters'
import type {Collection, HistoryEntry, SavedRequest, Session, TabState} from './lib/store-types'

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

const emptyResult = () => new main.RequestResult()

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

const initialHeaderRows = (): KV[] => [emptyKV(), emptyKV(), emptyKV()]

function App() {
  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Per-tab parallel arrays (all must stay in lockstep)
  const [methods, setMethods] = useState<string[]>(['GET'])
  const [urls, setUrls] = useState<string[]>([''])
  const [headers, setHeaders] = useState<KV[][]>([initialHeaderRows()])
  const [params, setParams] = useState<KV[][]>([[emptyKV()]])
  const [bodyTypes, setBodyTypes] = useState<BodyType[]>(['none'])
  const [jsonBodies, setJsonBodies] = useState<string[]>([''])
  const [rawBodies, setRawBodies] = useState<string[]>([''])
  const [formRows, setFormRows] = useState<KV[][]>([[emptyKV()]])
  const [auths, setAuths] = useState<AuthState[]>([emptyAuth()])
  const [settings, setSettings] = useState<ReqSettings[]>([defaultSettings()])
  const [responses, setResponses] = useState<main.RequestResult[]>([emptyResult()])

  // UI state
  const [requestSection, setRequestSection] = useState('headers')
  const [responseTab, setResponseTab] = useState('body')
  const [bodyView, setBodyView] = useState<'pretty' | 'raw'>('pretty')
  const [search, setSearch] = useState('')
  const [curlOpen, setCurlOpen] = useState(false)
  const [curlBody, setCurlBody] = useState('')
  const [saveOpen, setSaveOpen] = useState(false)

  // Persistence state
  const [collections, setCollections] = useState<Collection[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const sessionSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Derived values for active tab ─────────────────────────────
  const method = methods[activeTab] ?? 'GET'
  const url = urls[activeTab] ?? ''
  const result = responses[activeTab] ?? emptyResult()
  const hasResponse = Boolean(result.Body || result.Error || result.HeadersStr || result.Status)

  // ── Session helpers ───────────────────────────────────────────
  function buildTabState(i: number): TabState {
    return {
      method: methods[i] ?? 'GET',
      url: urls[i] ?? '',
      headers: headers[i] ?? initialHeaderRows(),
      params: params[i] ?? [emptyKV()],
      auth: auths[i] ?? emptyAuth(),
      bodyType: bodyTypes[i] ?? 'none',
      jsonBody: jsonBodies[i] ?? '',
      rawBody: rawBodies[i] ?? '',
      formRows: formRows[i] ?? [emptyKV()],
      settings: settings[i] ?? defaultSettings(),
    }
  }

  function persistSession(overrideActiveTab?: number) {
    if (sessionSaveTimer.current) clearTimeout(sessionSaveTimer.current)
    sessionSaveTimer.current = setTimeout(() => {
      const tabCount = methods.length
      const openTabs = Array.from({length: tabCount}, (_, i) => buildTabState(i))
      const session: Session = {openTabs, activeTab: overrideActiveTab ?? activeTab}
      SaveSession(session).catch(() => {})
    }, 800)
  }

  function restoreSession(session: Session) {
    const tabs = session.openTabs
    if (!tabs?.length) return
    setMethods(tabs.map((t) => t.method || 'GET'))
    setUrls(tabs.map((t) => t.url || ''))
    setHeaders(tabs.map((t) => (t.headers?.length ? t.headers : initialHeaderRows())))
    setParams(tabs.map((t) => (t.params?.length ? t.params : [emptyKV()])))
    setAuths(tabs.map((t) => t.auth || emptyAuth()))
    setBodyTypes(tabs.map((t) => (t.bodyType as BodyType) || 'none'))
    setJsonBodies(tabs.map((t) => t.jsonBody || ''))
    setRawBodies(tabs.map((t) => t.rawBody || ''))
    setFormRows(tabs.map((t) => (t.formRows?.length ? t.formRows : [emptyKV()])))
    setSettings(tabs.map((t) => t.settings || defaultSettings()))
    setResponses(tabs.map(() => emptyResult()))
    setActiveTab(Math.min(session.activeTab || 0, tabs.length - 1))
  }

  // ── On mount: load session + collections + history ─────────────
  useEffect(() => {
    LoadSession()
      .then((s) => {
        if (s?.openTabs?.length) restoreSession(s)
      })
      .catch(() => {})

    ListCollections()
      .then((c) => setCollections(c ?? []))
      .catch(() => {})

    ListHistory(50)
      .then((h) => setHistory(h ?? []))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Tab plumbing ──────────────────────────────────────────────
  const addNewTab = () => {
    const n = methods.length
    setMethods([...methods, 'GET'])
    setUrls([...urls, ''])
    setHeaders([...headers, initialHeaderRows()])
    setParams([...params, [emptyKV()]])
    setBodyTypes([...bodyTypes, 'none'])
    setJsonBodies([...jsonBodies, ''])
    setRawBodies([...rawBodies, ''])
    setFormRows([...formRows, [emptyKV()]])
    setAuths([...auths, emptyAuth()])
    setSettings([...settings, defaultSettings()])
    setResponses([...responses, emptyResult()])
    setActiveTab(n)
    persistSession(n)
  }

  const closeTab = (e: React.MouseEvent, index: number) => {
    e.stopPropagation()
    if (methods.length === 1) return
    const drop = <T,>(arr: T[]) => arr.filter((_, i) => i !== index)
    setMethods(drop(methods))
    setUrls(drop(urls))
    setHeaders(drop(headers))
    setParams(drop(params))
    setBodyTypes(drop(bodyTypes))
    setJsonBodies(drop(jsonBodies))
    setRawBodies(drop(rawBodies))
    setFormRows(drop(formRows))
    setAuths(drop(auths))
    setSettings(drop(settings))
    setResponses(drop(responses))
    const next = activeTab >= index && activeTab > 0 ? activeTab - 1 : activeTab
    if (activeTab >= index && activeTab > 0) setActiveTab(next)
    persistSession(next)
  }

  const switchTab = (i: number) => {
    setActiveTab(i)
    persistSession(i)
  }

  // ── Method / URL handlers ─────────────────────────────────────
  const setMethod = (m: string) => {
    const n = [...methods]
    n[activeTab] = m
    setMethods(n)
  }

  const onUrlChange = (newUrl: string) => {
    const n = [...urls]
    n[activeTab] = newUrl
    setUrls(n)
    const parsed = parseUrlParams(newUrl)
    if (parsed) {
      const np = [...params]
      np[activeTab] = parsed
      setParams(np)
    }
  }

  // ── Header handlers ───────────────────────────────────────────
  const onHeaderChange = (idx: number, field: 'Key' | 'Value', value: string) =>
    setHeaders(updateRowsAt(headers, activeTab, idx, field, value))
  const onHeaderRemove = (idx: number) => setHeaders(removeRowAt(headers, activeTab, idx))
  const onHeaderAdd = () => setHeaders(addRowAt(headers, activeTab))

  // ── Params handlers (with URL sync) ───────────────────────────
  const onParamChange = (idx: number, field: 'Key' | 'Value', value: string) => {
    const next = updateRowsAt(params, activeTab, idx, field, value)
    setParams(next)
    const nu = [...urls]
    nu[activeTab] = rebuildUrlWithParams(url, next[activeTab])
    setUrls(nu)
  }
  const onParamRemove = (idx: number) => {
    const next = removeRowAt(params, activeTab, idx)
    setParams(next)
    const nu = [...urls]
    nu[activeTab] = rebuildUrlWithParams(url, next[activeTab])
    setUrls(nu)
  }
  const onParamAdd = () => setParams(addRowAt(params, activeTab))

  // ── Body / auth / settings handlers ───────────────────────────
  const setBodyType = (t: BodyType) => {
    const n = [...bodyTypes]; n[activeTab] = t; setBodyTypes(n)
  }
  const setJsonBody = (s: string) => {
    const n = [...jsonBodies]; n[activeTab] = s; setJsonBodies(n)
  }
  const setRawBody = (s: string) => {
    const n = [...rawBodies]; n[activeTab] = s; setRawBodies(n)
  }
  const setFormRowsForTab = (rows: KV[]) => {
    const n = [...formRows]; n[activeTab] = rows; setFormRows(n)
  }
  const setAuth = (a: AuthState) => {
    const n = [...auths]; n[activeTab] = a; setAuths(n)
  }
  const setSettingsForTab = (s: ReqSettings) => {
    const n = [...settings]; n[activeTab] = s; setSettings(n)
  }

  // ── Build the final RequestSpec for the active tab ────────────
  function buildSpec(): main.RequestSpec {
    const userHeaders = kvToRecord(headers[activeTab])
    const auth = applyAuth(auths[activeTab])
    const mergedHeaders: Record<string, string> = {...userHeaders, ...auth.headers}

    let finalUrl = rebuildUrlWithParams(url, params[activeTab])
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

    const bodyType = bodyTypes[activeTab]
    let body: main.BodySpec = main.BodySpec.createFrom({type: 'none', raw: ''})

    if (bodyType === 'json') {
      const raw = jsonBodies[activeTab]
      if (raw && !mergedHeaders['Content-Type']) {
        mergedHeaders['Content-Type'] = 'application/json'
      }
      body = main.BodySpec.createFrom({type: 'json', raw})
    } else if (bodyType === 'form') {
      const raw = encodeFormBody(formRows[activeTab])
      if (raw && !mergedHeaders['Content-Type']) {
        mergedHeaders['Content-Type'] = 'application/x-www-form-urlencoded'
      }
      body = main.BodySpec.createFrom({type: 'form', raw})
    } else if (bodyType === 'raw') {
      body = main.BodySpec.createFrom({type: 'raw', raw: rawBodies[activeTab]})
    }

    const s = settings[activeTab]
    return main.RequestSpec.createFrom({
      method,
      url: finalUrl,
      headers: mergedHeaders,
      body,
      settings: {timeoutMs: s.timeoutMs, followRedirects: s.followRedirects, verifyTLS: s.verifyTLS},
    })
  }

  const storeResponse = (r: main.RequestResult) => {
    const next = [...responses]
    next[activeTab] = r
    setResponses(next)
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
        // Append to history (fire-and-forget)
        AppendHistory({
          id: '',
          method: spec.method,
          url: spec.url,
          status: r.Status,
          statusText: r.StatusText,
          durationMs: r.DurationMs,
          sentAt: new Date().toISOString(),
        }).then(() => {
          ListHistory(50).then((h) => setHistory(h ?? [])).catch(() => {})
        }).catch(() => {})
        persistSession()
      })
      .finally(() => setLoading(false))
  }

  function importCurl() {
    RunCurl(curlBody).then((r) => {
      const nm = [...methods]; nm[activeTab] = r.Method || 'GET'; setMethods(nm)
      const nu = [...urls]; nu[activeTab] = r.URL || ''; setUrls(nu)
      const parsed = parseHeaderLines(r.ReqHeaders || '')
      const nh = [...headers]
      nh[activeTab] = parsed.length ? parsed : initialHeaderRows()
      setHeaders(nh)
      if (r.RequestBody) {
        setBodyType('raw')
        setRawBody(r.RequestBody)
      }
      const p = parseUrlParams(r.URL || '')
      if (p) {
        const np = [...params]; np[activeTab] = p; setParams(np)
      }
      storeResponse(r)
      setCurlOpen(false)
      setCurlBody('')
    })
  }

  function handleExport() {
    Export(
      {method, url, headers: kvToRecord(headers[activeTab]), body: rawBodies[activeTab] || jsonBodies[activeTab] || ''} as unknown as main.Request,
      headers as unknown as Array<unknown>,
      rawBodies,
      result
    )
  }

  function copyAsCurl() {
    const spec = buildSpec()
    const bodyType = bodyTypes[activeTab]
    const cmd = buildCurl({
      method: spec.method,
      url: spec.url,
      headers: spec.headers,
      body: spec.body.raw || undefined,
      bodyFlag: bodyType === 'json' ? '--data-raw' : '-d',
    })
    navigator.clipboard.writeText(cmd)
  }

  function copyBody() {
    if (result.Body) navigator.clipboard.writeText(result.Body)
  }

  function saveBody() {
    if (result.Body) SaveTextFile('response.txt', result.Body)
  }

  // ── Load a saved request into the active tab ──────────────────
  function loadRequestToTab(req: SavedRequest) {
    const i = activeTab
    setMethods((p) => { const n = [...p]; n[i] = req.method || 'GET'; return n })
    setUrls((p) => { const n = [...p]; n[i] = req.url || ''; return n })
    setHeaders((p) => { const n = [...p]; n[i] = req.headers?.length ? req.headers : initialHeaderRows(); return n })
    setParams((p) => { const n = [...p]; n[i] = req.params?.length ? req.params : [emptyKV()]; return n })
    setAuths((p) => { const n = [...p]; n[i] = req.auth || emptyAuth(); return n })
    setBodyTypes((p) => { const n = [...p]; n[i] = (req.bodyType as BodyType) || 'none'; return n })
    setJsonBodies((p) => { const n = [...p]; n[i] = req.jsonBody || ''; return n })
    setRawBodies((p) => { const n = [...p]; n[i] = req.rawBody || ''; return n })
    setFormRows((p) => { const n = [...p]; n[i] = req.formRows?.length ? req.formRows : [emptyKV()]; return n })
    setSettings((p) => { const n = [...p]; n[i] = req.settings || defaultSettings(); return n })
  }

  function loadHistoryToTab(entry: HistoryEntry) {
    setMethods((p) => { const n = [...p]; n[activeTab] = entry.method; return n })
    setUrls((p) => { const n = [...p]; n[activeTab] = entry.url; return n })
  }

  // ── Collection / save-request handlers ───────────────────────
  async function handleNewCollection(name: string): Promise<string> {
    const col: Collection = {id: '', name, requests: []}
    await SaveCollection(col)
    const updated = await ListCollections()
    setCollections(updated ?? [])
    return updated?.find((c) => c.name === name)?.id ?? ''
  }

  async function handleDeleteCollection(id: string) {
    await DeleteCollection(id)
    setCollections((prev) => prev.filter((c) => c.id !== id))
  }

  async function handleDeleteRequest(collectionId: string, reqId: string) {
    await DeleteRequestBinding(collectionId, reqId)
    const updated = await ListCollections()
    setCollections(updated ?? [])
  }

  async function handleClearHistory() {
    await ClearHistory()
    setHistory([])
  }

  async function handleSaveRequest(name: string, collectionId: string) {
    const tab = buildTabState(activeTab)
    const req: SavedRequest = {
      ...tab,
      id: '',
      name,
      createdAt: '',
      updatedAt: '',
    }
    await SaveRequestBinding(collectionId, req)
    const updated = await ListCollections()
    setCollections(updated ?? [])
  }

  const matches = result.Body ? countMatches(result.Body, search) : 0

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      {sidebarOpen && (
        <Sidebar
          collections={collections}
          history={history}
          onLoadRequest={loadRequestToTab}
          onLoadHistory={loadHistoryToTab}
          onSaveRequest={() => setSaveOpen(true)}
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

        {/* ── Request bar ─────────────────────────────────────── */}
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

        {/* ── Request tabs ────────────────────────────────────── */}
        <div className="mt-5 flex items-center gap-2">
          <div className="flex flex-1 items-center gap-1.5 overflow-x-auto pb-1">
            {methods.map((_, index) => {
              const active = index === activeTab
              return (
                <button
                  key={index}
                  onClick={() => switchTab(index)}
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
                  {methods.length > 1 && (
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

        {/* ── Request editor (Headers / Params / Body / Auth / Settings) ── */}
        <section className="mt-4 rounded-xl border border-border/80 bg-card/50 p-4 backdrop-blur-sm">
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
                {headers[activeTab].map((row, idx) => (
                  <KVRow
                    key={idx}
                    row={row}
                    index={idx}
                    total={headers[activeTab].length}
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
                {params[activeTab].map((row, idx) => (
                  <KVRow
                    key={idx}
                    row={row}
                    index={idx}
                    total={params[activeTab].length}
                    onChange={onParamChange}
                    onRemove={onParamRemove}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="body" className="m-0">
              <BodyEditor
                bodyType={bodyTypes[activeTab]}
                onTypeChange={setBodyType}
                jsonBody={jsonBodies[activeTab]}
                onJsonChange={setJsonBody}
                rawBody={rawBodies[activeTab]}
                onRawChange={setRawBody}
                formRows={formRows[activeTab]}
                onFormRowsChange={setFormRowsForTab}
              />
            </TabsContent>

            <TabsContent value="auth" className="m-0">
              <AuthForm auth={auths[activeTab]} onChange={setAuth} />
            </TabsContent>

            <TabsContent value="settings" className="m-0">
              <SettingsForm settings={settings[activeTab]} onChange={setSettingsForTab} />
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
                Enter a URL and hit Send, or import a cURL command to get started.
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
