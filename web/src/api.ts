import { credentialHeaders } from './credentials'
import type { ProfileRequest } from './profile'
import type {
  AnalyzeResponse,
  Message,
  ObserveResponse,
  ReplyResponse,
  SendResponse,
} from './types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...credentialHeaders(),
      ...(init?.headers as Record<string, string> | undefined),
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(body || `请求失败（${res.status}）`)
  }
  return (await res.json()) as T
}

export const api = {
  analyze: (messages: Message[], profile: ProfileRequest) =>
    request<AnalyzeResponse>('/analyze', {
      method: 'POST',
      body: JSON.stringify({ messages, profile }),
    }),

  reply: (messages: Message[], variant: number, count: number, profile: ProfileRequest) =>
    request<ReplyResponse>('/reply', {
      method: 'POST',
      body: JSON.stringify({ messages, variant, count, profile }),
    }),

  send: (messages: Message[], text: string, simulateDomFailure: boolean) =>
    request<SendResponse>('/send', {
      method: 'POST',
      body: JSON.stringify({ messages, text, simulateDomFailure }),
    }),

  observe: (messages: Message[]) =>
    request<ObserveResponse>('/observe', {
      method: 'POST',
      body: JSON.stringify({ messages }),
    }),
}