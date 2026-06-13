import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {AuthState, AuthType, ApiKeyTarget} from '@/lib/auth'

interface AuthFormProps {
  auth: AuthState
  onChange: (next: AuthState) => void
}

export function AuthForm({auth, onChange}: AuthFormProps) {
  const setType = (type: AuthType) => onChange({...auth, type})
  const set = (patch: Partial<AuthState>) => onChange({...auth, ...patch})

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="auth-type">Type</Label>
        <Select value={auth.type} onValueChange={(v) => setType(v as AuthType)}>
          <SelectTrigger id="auth-type" className="h-9 w-full sm:w-[240px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="bearer">Bearer token</SelectItem>
            <SelectItem value="basic">Basic auth</SelectItem>
            <SelectItem value="apikey">API key</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {auth.type === 'bearer' && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bearer-token">Token</Label>
          <Input
            id="bearer-token"
            type="password"
            value={auth.token}
            onChange={(e) => set({token: e.target.value})}
            placeholder="eyJhbGciOi..."
            className="h-9 font-mono text-[0.8125rem]"
          />
        </div>
      )}

      {auth.type === 'basic' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="basic-user">Username</Label>
            <Input
              id="basic-user"
              value={auth.user}
              onChange={(e) => set({user: e.target.value})}
              className="h-9 font-mono text-[0.8125rem]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="basic-pass">Password</Label>
            <Input
              id="basic-pass"
              type="password"
              value={auth.pass}
              onChange={(e) => set({pass: e.target.value})}
              className="h-9 font-mono text-[0.8125rem]"
            />
          </div>
        </div>
      )}

      {auth.type === 'apikey' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_140px]">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="apikey-name">Name</Label>
            <Input
              id="apikey-name"
              value={auth.apiKeyName}
              onChange={(e) => set({apiKeyName: e.target.value})}
              placeholder="X-API-Key"
              className="h-9 font-mono text-[0.8125rem]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="apikey-value">Value</Label>
            <Input
              id="apikey-value"
              type="password"
              value={auth.apiKeyValue}
              onChange={(e) => set({apiKeyValue: e.target.value})}
              className="h-9 font-mono text-[0.8125rem]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="apikey-target">Add to</Label>
            <Select
              value={auth.apiKeyTarget}
              onValueChange={(v) => set({apiKeyTarget: v as ApiKeyTarget})}
            >
              <SelectTrigger id="apikey-target" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="header">Header</SelectItem>
                <SelectItem value="query">Query</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {auth.type === 'none' && (
        <p className="text-xs italic text-muted-foreground">
          No authentication will be added to the request.
        </p>
      )}
    </div>
  )
}
