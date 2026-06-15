import {type KV, emptyKV} from './kv'
import {type AuthState, emptyAuth} from './auth'
import {type ReqSettings, defaultSettings} from './settings'
import {type BodyType} from '@/components/body-editor'
import {main} from '../../wailsjs/go/models'

// A Payload is one variation tested against the parent request's URL/method/auth/settings.
// Each payload carries its own headers, params, body, and last response.
export interface Payload {
  headers: KV[]
  params: KV[]
  bodyType: BodyType
  jsonBody: string
  rawBody: string
  formRows: KV[]
  response: main.RequestResult
}

// A RequestTab is a top-level request: method/url/auth/settings are SHARED across
// all of its payloads. savedId links it to a SavedRequest (empty = unsaved scratch).
export interface RequestTab {
  savedId?: string
  method: string
  url: string
  auth: AuthState
  settings: ReqSettings
  payloads: Payload[]
  activePayload: number
}

export const emptyResult = () => new main.RequestResult()

export const initialHeaderRows = (): KV[] => [emptyKV(), emptyKV(), emptyKV()]

export const emptyPayload = (): Payload => ({
  headers: initialHeaderRows(),
  params: [emptyKV()],
  bodyType: 'none',
  jsonBody: '',
  rawBody: '',
  formRows: [emptyKV()],
  response: emptyResult(),
})

export const emptyRequest = (): RequestTab => ({
  savedId: undefined,
  method: 'GET',
  url: '',
  auth: emptyAuth(),
  settings: defaultSettings(),
  payloads: [emptyPayload()],
  activePayload: 0,
})

// Immutable nested updaters.
export function updateRequest(
  requests: RequestTab[],
  ri: number,
  patch: Partial<RequestTab>
): RequestTab[] {
  return requests.map((r, i) => (i === ri ? {...r, ...patch} : r))
}

export function updatePayload(
  requests: RequestTab[],
  ri: number,
  pi: number,
  patch: Partial<Payload>
): RequestTab[] {
  return requests.map((r, i) => {
    if (i !== ri) return r
    return {...r, payloads: r.payloads.map((p, j) => (j === pi ? {...p, ...patch} : p))}
  })
}

export function toStoredPayload(p: Payload) {
  const hasResponse = Boolean(
    p.response?.Body ||
      p.response?.HeadersStr ||
      p.response?.Error ||
      p.response?.Status ||
      p.response?.StatusText
  )

  return {
    headers: p.headers,
    params: p.params,
    bodyType: p.bodyType,
    jsonBody: p.jsonBody,
    rawBody: p.rawBody,
    formRows: p.formRows,
    response: hasResponse ? p.response : undefined,
  }
}
