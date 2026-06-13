export interface ReqSettings {
  timeoutMs: number
  followRedirects: boolean
  verifyTLS: boolean
}

export const defaultSettings = (): ReqSettings => ({
  timeoutMs: 0, // 0 = backend default (50s)
  followRedirects: true,
  verifyTLS: true,
})
