import type {KV} from './kv'
import type {AuthState} from './auth'
import type {BodyType} from '@/components/body-editor'
import type {ReqSettings} from './settings'

export interface TabState {
  method: string
  url: string
  headers: KV[]
  params: KV[]
  auth: AuthState
  bodyType: BodyType
  jsonBody: string
  rawBody: string
  formRows: KV[]
  settings: ReqSettings
}

export interface SavedRequest extends TabState {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface Collection {
  id: string
  name: string
  requests: SavedRequest[]
}

export interface HistoryEntry {
  id: string
  method: string
  url: string
  status: number
  statusText: string
  durationMs: number
  sentAt: string
}

export interface Session {
  openTabs: TabState[]
  activeTab: number
}
