import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import type {ReqSettings} from '@/lib/settings'

interface SettingsFormProps {
  settings: ReqSettings
  onChange: (next: ReqSettings) => void
}

function Toggle({
  id,
  checked,
  onCheckedChange,
  label,
  desc,
}: {
  id: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
  label: string
  desc: string
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start justify-between gap-4 rounded-md border border-border/60 bg-background/40 px-3 py-2.5"
    >
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]"
      />
    </label>
  )
}

export function SettingsForm({settings, onChange}: SettingsFormProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="timeout-ms">Timeout (ms)</Label>
        <Input
          id="timeout-ms"
          type="number"
          min={0}
          value={settings.timeoutMs || ''}
          onChange={(e) =>
            onChange({...settings, timeoutMs: parseInt(e.target.value, 10) || 0})
          }
          placeholder="50000 (default)"
          className="h-9 w-full font-mono text-[0.8125rem] sm:w-[240px]"
        />
        <p className="text-xs text-muted-foreground">
          0 uses the default of 50 seconds.
        </p>
      </div>

      <Toggle
        id="follow-redirects"
        checked={settings.followRedirects}
        onCheckedChange={(v) => onChange({...settings, followRedirects: v})}
        label="Follow redirects"
        desc="Automatically follow 3xx responses."
      />

      <Toggle
        id="verify-tls"
        checked={settings.verifyTLS}
        onCheckedChange={(v) => onChange({...settings, verifyTLS: v})}
        label="Verify TLS certificates"
        desc="Disable to allow self-signed certificates."
      />
    </div>
  )
}
