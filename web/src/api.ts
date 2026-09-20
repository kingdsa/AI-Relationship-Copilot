import type {
  AnalyzeResponse,
  AppStateResponse,
  Message,
  ObserveResponse,
  ReplyResponse,
  SendResponse,
} from './types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(body || `请求失败（${res.status}）`)
  }
  return (await res.json()) as T
}

export const api = {
  getState: () => request<AppStateResponse>('/state'),

  analyze: (messages: Message[]) =>
    request<AnalyzeResponse>('/analyze', {
      method: 'POST',
      body: JSON.stringify({ messages }),
    }),

  reply: (messages: Message[], variant: number, count = 3) =>
    request<ReplyResponse>('/reply', {
      method: 'POST',
      body: JSON.stringify({ messages, variant, count }),
    }),

  send: (messages: Message[], text: string, historyId: string, simulateDomFailure: boolean) =>
    request<SendResponse>('/send', {
      method: 'POST',
      body: JSON.stringify({ messages, text, historyId, simulateDomFailure }),
    }),

  observe: (messages: Message[]) =>
    request<ObserveResponse>('/observe', {
      method: 'POST',
      body: JSON.stringify({ messages }),
    }),

  updateSettings: (patch: Record<string, unknown>) =>
    request<{ ok: boolean }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(patch),
    }),

  resetConversation: () =>
    request<{ ok: boolean }>('/reset-conversation', { method: 'POST' }),
}