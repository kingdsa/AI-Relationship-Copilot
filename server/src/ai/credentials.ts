import type { Request } from 'express'

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

export const DEFAULT_JEV_BASE_URL = 'https://api.typesafe.ai/v1'
export const DEFAULT_JEV_MODEL = 'jev-latest'

function readHeader(req: Request, name: string): string {
  const raw = req.header(name)
  if (!raw) return ''
  try {
    return decodeURIComponent(raw).trim()
  } catch {
    return raw.trim()
  }
}

/**
 * 凭据来自请求头（由前端从自己的 localStorage 带上），服务端不保存、不缓存。
 * 每个请求按调用者自己的 Key / Base URL 构建 JEV 与 LLM 客户端。
 */
export function credentialsFromRequest(req: Request): Credentials {
  return {
    jev: {
      apiKey: readHeader(req, 'x-jev-api-key'),
      baseUrl: readHeader(req, 'x-jev-base-url') || DEFAULT_JEV_BASE_URL,
      model: readHeader(req, 'x-jev-model') || DEFAULT_JEV_MODEL,
    },
    llm: {
      baseUrl: readHeader(req, 'x-llm-base-url'),
      apiKey: readHeader(req, 'x-llm-api-key'),
      model: readHeader(req, 'x-llm-model'),
      vision: readHeader(req, 'x-llm-vision') === '1',
    },
  }
}

export function jevReady(credentials: Credentials): boolean {
  return Boolean(credentials.jev.apiKey && credentials.jev.baseUrl)
}

export function llmReady(credentials: Credentials): boolean {
  return Boolean(credentials.llm.apiKey && credentials.llm.baseUrl && credentials.llm.model)
}