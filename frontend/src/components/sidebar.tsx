import {useState} from 'react'
import {
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Folder,
  Clock,
  Plus,
  Trash2,
  BookMarked,
  FileText,
} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {Separator} from '@/components/ui/separator'
import {cn} from '@/lib/utils'
import type {Collection, HistoryEntry, SavedRequest} from '@/lib/store-types'
import {formatDuration, statusChipClass} from '@/lib/formatters'

interface SidebarProps {
  collections: Collection[]
  history: HistoryEntry[]
  onLoadRequest: (req: SavedRequest) => void
  onLoadHistory: (entry: HistoryEntry) => void
  onNewCollection: (name: string) => void
  onDeleteCollection: (id: string) => void
  onDeleteRequest: (collectionId: string, reqId: string) => void
  onClearHistory: () => void
  onSaveRequest: () => void
}

const METHOD_COLOR: Record<string, string> = {
  GET: 'text-emerald-400',
  POST: 'text-amber-400',
  PUT: 'text-blue-400',
  DELETE: 'text-red-400',
  PATCH: 'text-purple-400',
  HEAD: 'text-slate-400',
  OPTIONS: 'text-slate-400',
}

function MethodBadge({method}: {method: string}) {
  return (
    <span className={cn('shrink-0 font-mono text-[0.65rem] font-bold', METHOD_COLOR[method] ?? 'text-muted-foreground')}>
      {method}
    </span>
  )
}

export function Sidebar({
  collections,
  history,
  onLoadRequest,
  onLoadHistory,
  onNewCollection,
  onDeleteCollection,
  onDeleteRequest,
  onClearHistory,
  onSaveRequest,
}: SidebarProps) {
  const [collectionsOpen, setCollectionsOpen] = useState(true)
  const [historyOpen, setHistoryOpen] = useState(true)
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set())
  const [newCollectionName, setNewCollectionName] = useState('')
  const [creatingCollection, setCreatingCollection] = useState(false)

  const toggleCollection = (id: string) => {
    setExpandedCollections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleNewCollection = () => {
    const name = newCollectionName.trim()
    if (!name) return
    onNewCollection(name)
    setNewCollectionName('')
    setCreatingCollection(false)
  }

  return (
    <aside className="flex w-[240px] shrink-0 flex-col border-r border-border/60 bg-card/30">
      {/* Save button */}
      <div className="p-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5 border-primary/30 text-primary hover:bg-primary/15 hover:text-primary"
          onClick={onSaveRequest}
        >
          <BookMarked className="h-3.5 w-3.5" />
          Save Request
        </Button>
      </div>

      <Separator className="bg-border/50" />

      <div className="flex flex-1 flex-col gap-0 overflow-hidden">
        {/* Collections section */}
        <div className="flex flex-col">
          <button
            onClick={() => setCollectionsOpen((p) => !p)}
            className="flex items-center gap-1.5 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
          >
            {collectionsOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            Collections
            <span className="ml-auto font-mono text-[0.65rem] font-normal text-muted-foreground/60">
              {collections.length}
            </span>
          </button>

          {collectionsOpen && (
            <div className="pb-1">
              {collections.length === 0 && !creatingCollection && (
                <p className="px-4 py-2 text-xs italic text-muted-foreground/60">
                  No collections yet
                </p>
              )}

              {collections.map((col) => {
                const expanded = expandedCollections.has(col.id)
                return (
                  <div key={col.id}>
                    <div className="group flex items-center gap-1 px-2 py-1">
                      <button
                        onClick={() => toggleCollection(col.id)}
                        className="flex flex-1 items-center gap-1.5 rounded px-1.5 py-1 text-left text-xs hover:bg-primary/10 hover:text-foreground"
                      >
                        {expanded ? (
                          <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                        ) : (
                          <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                        )}
                        <span className="truncate font-medium text-foreground/80">
                          {col.name}
                        </span>
                        <span className="ml-auto shrink-0 font-mono text-[0.6rem] text-muted-foreground/50">
                          {col.requests.length}
                        </span>
                      </button>
                      <button
                        onClick={() => onDeleteCollection(col.id)}
                        className="hidden h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground/50 hover:bg-destructive/20 hover:text-destructive group-hover:flex"
                        aria-label="Delete collection"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    {expanded && (
                      <div className="ml-4 border-l border-border/40 pl-1">
                        {col.requests.length === 0 && (
                          <p className="px-3 py-1.5 text-[0.7rem] italic text-muted-foreground/50">
                            Empty
                          </p>
                        )}
                        {col.requests.map((req) => (
                          <div key={req.id} className="group flex items-center gap-1 px-1">
                            <button
                              onClick={() => onLoadRequest(req)}
                              className="flex flex-1 items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-primary/10"
                            >
                              <MethodBadge method={req.method} />
                              <span className="truncate text-[0.7rem] text-foreground/70">
                                {req.name}
                              </span>
                            </button>
                            <button
                              onClick={() => onDeleteRequest(col.id, req.id)}
                              className="hidden h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground/50 hover:bg-destructive/20 hover:text-destructive group-hover:flex"
                              aria-label="Delete request"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {creatingCollection ? (
                <div className="flex items-center gap-1 px-3 py-1">
                  <input
                    autoFocus
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleNewCollection()
                      if (e.key === 'Escape') {
                        setCreatingCollection(false)
                        setNewCollectionName('')
                      }
                    }}
                    placeholder="Collection name"
                    className="flex-1 rounded border border-border/60 bg-background/60 px-2 py-1 text-xs outline-none focus:border-primary/60"
                  />
                  <button
                    onClick={handleNewCollection}
                    className="shrink-0 rounded px-1.5 py-1 text-xs text-primary hover:bg-primary/15"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setCreatingCollection(true)}
                  className="flex w-full items-center gap-1.5 px-4 py-1.5 text-xs text-muted-foreground/60 hover:text-primary"
                >
                  <Plus className="h-3 w-3" />
                  New collection
                </button>
              )}
            </div>
          )}
        </div>

        <Separator className="bg-border/40" />

        {/* History section */}
        <div className="flex min-h-0 flex-1 flex-col">
          <button
            onClick={() => setHistoryOpen((p) => !p)}
            className="flex items-center gap-1.5 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
          >
            {historyOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <Clock className="h-3 w-3" />
            History
            {history.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onClearHistory()
                }}
                className="ml-auto text-[0.65rem] text-muted-foreground/50 hover:text-destructive"
              >
                Clear
              </button>
            )}
          </button>

          {historyOpen && (
            <div className="flex-1 overflow-y-auto pb-2">
              {history.length === 0 && (
                <p className="px-4 py-2 text-xs italic text-muted-foreground/60">
                  No history yet
                </p>
              )}
              {history.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => onLoadHistory(entry)}
                  className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-primary/10"
                >
                  <div className="flex items-center gap-2">
                    <MethodBadge method={entry.method} />
                    {entry.status > 0 && (
                      <span
                        className={cn(
                          'rounded px-1 font-mono text-[0.6rem] font-semibold',
                          statusChipClass(entry.status)
                        )}
                      >
                        {entry.status}
                      </span>
                    )}
                    {entry.durationMs > 0 && (
                      <span className="ml-auto font-mono text-[0.6rem] text-muted-foreground/50">
                        {formatDuration(entry.durationMs)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-2.5 w-2.5 shrink-0 text-muted-foreground/40" />
                    <span className="truncate text-[0.68rem] text-muted-foreground/60">
                      {entry.url}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
