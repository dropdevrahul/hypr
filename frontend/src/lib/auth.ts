export type AuthType = 'none' | 'bearer' | 'basic' | 'apikey'
export type ApiKeyTarget = 'header' | 'query'

export interface AuthState {
  type: AuthType
  token: string // bearer
  user: string // basic
  pass: string // basic
  apiKeyName: string
  apiKeyValue: string
  apiKeyTarget: ApiKeyTarget
}

export const emptyAuth = (): AuthState => ({
  type: 'none',
  token: '',
  user: '',
  pass: '',
  apiKeyName: '',
  apiKeyValue: '',
  apiKeyTarget: 'header',
})

// Compute the Authorization (or API-key) header and any extra query params to inject.
export function applyAuth(auth: AuthState): {
  headers: Record<string, string>
  query: Array<[string, string]>
} {
  const headers: Record<string, string> = {}
  const query: Array<[string, string]> = []

  switch (auth.type) {
    case 'bearer':
      if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`
      break
    case 'basic':
      if (auth.user || auth.pass)
        headers['Authorization'] = `Basic ${btoa(`${auth.user}:${auth.pass}`)}`
      break
    case 'apikey':
      if (auth.apiKeyName) {
        if (auth.apiKeyTarget === 'header') headers[auth.apiKeyName] = auth.apiKeyValue
        else query.push([auth.apiKeyName, auth.apiKeyValue])
      }
      break
  }

  return {headers, query}
}
