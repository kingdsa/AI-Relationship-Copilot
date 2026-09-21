export interface JevCredentials {
  apiKey: string
  baseUrl: string
  model: string
}

export interface LlmCredentials {
  baseUrl: string
  apiKey: string
  model: string
  vision: boolean
}

export interface Credentials {
  jev: JevCredentials
  llm: LlmCredentials
}

const STORAGE_KEY = 'ai-relationship-copilot.credentials.v1'

export const DEFAULT_JEV_BASE_URL = 'https://api.typesafe.ai/v1'
export const DEFAULT_JEV_MODEL = 'jev-latest'

export function emptyCredentials(): Credentials {
  return {
    jev: { apiKey: '', baseUrl: DEFAULT_JEV_BASE_URL, model: DEFAULT_JEV_MODEL },
    llm: { baseUrl: '', apiKey: '', model: '', vision: false },
  }
}

/**
 * 凭据只保存在使用者自己的浏览器（localStorage），随每个请求通过请求头发给服务端，
 * 服务端不落盘、不读取环境变量，因此在多人共用部署时每个人用的都是自己的 Key。
 */
export function loadCredentials(): Credentials {
  const fallback = emptyCredentials()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<Credentials>
    return {
      jev: {
        apiKey: typeof parsed.jev?.apiKey === 'string' ? parsed.jev.apiKey : '',
        baseUrl: parsed.jev?.baseUrl?.trim() || DEFAULT_JEV_BASE_URL,
        model: parsed.jev?.model?.trim() || DEFAULT_JEV_MODEL,
      },
      llm: {
        baseUrl: typeof parsed.llm?.baseUrl === 'string' ? parsed.llm.baseUrl : '',
        apiKey: typeof parsed.llm?.apiKey === 'string' ? parsed.llm.apiKey : '',
        model: typeof parsed.llm?.model === 'string' ? parsed.llm.model : '',
        vision: Boolean(parsed.llm?.vision),
      },
    }
  } catch {
    return fallback
  }
}

export function saveCredentials(credentials: Credentials): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials))
  } catch {
    /* localStorage 不可用时仅本次会话生效 */
  }
}

export function isJevConfigured(credentials: Credentials): boolean {
  return Boolean(credentials.jev.apiKey && credentials.jev.baseUrl)
}

export function isLlmConfigured(credentials: Credentials): boolean {
  return Boolean(credentials.llm.apiKey && credentials.llm.baseUrl && credentials.llm.model)
}

/** 请求头只能携带 ASCII，这里统一 percent-encode，服务端会解码 */
function encodeHeader(value: string): string {
  return encodeURIComponent(value)
}

export function credentialHeaders(credentials: Credentials = loadCredentials()): Record<string, string> {
  return {
    'X-Jev-Api-Key': encodeHeader(credentials.jev.apiKey),
    'X-Jev-Base-Url': encodeHeader(credentials.jev.baseUrl),
    'X-Jev-Model': encodeHeader(credentials.jev.model),
    'X-Llm-Api-Key': encodeHeader(credentials.llm.apiKey),
    'X-Llm-Base-Url': encodeHeader(credentials.llm.baseUrl),
    'X-Llm-Model': encodeHeader(credentials.llm.model),
    'X-Llm-Vision': credentials.llm.vision ? '1' : '0',
  }
}