export interface LlmConfig {
  baseUrl: string
  apiKey: string
  model: string
  /** 该模型是否支持图片输入（多模态） */
  vision?: boolean
  timeoutMs?: number
}

export class LlmError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message)
    this.name = 'LlmError'
  }
}

/**
 * OpenAI 兼容的文本生成客户端（"AI" 部分）。
 * JEV 负责决策，本客户端负责把决策表达成自然语言。
 */
export class LlmClient {
  constructor(private readonly config: LlmConfig) {}

  get configured(): boolean {
    return Boolean(this.config.apiKey && this.config.baseUrl && this.config.model)
  }

  get modelName(): string {
    return this.config.model
  }

  get visionEnabled(): boolean {
    return Boolean(this.config.vision)
  }

  async chatJSON(system: string, user: string, images?: string[]): Promise<string> {
    if (!this.configured) throw new LlmError('LLM 未配置')
    const base = this.config.baseUrl.replace(/\/$/, '')
    const url = base.endsWith('/chat/completions') ? base : `${base}/chat/completions`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs ?? 60_000)

    const effectiveImages = this.visionEnabled ? (images ?? []).slice(0, 3) : []
    const userContent =
      effectiveImages.length > 0
        ? [
            { type: 'text', text: user },
            ...effectiveImages.map((imageUrl) => ({
              type: 'image_url',
              image_url: { url: imageUrl },
            })),
          ]
        : user

    const payload = {
      model: this.config.model,
      temperature: 0.8,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
    }

    try {
      let res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      if (res.status === 400) {
        // 部分兼容端点不支持 response_format，降级重试
        const retryPayload = { ...payload, response_format: undefined }
        res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(retryPayload),
          signal: controller.signal,
        })
      }
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new LlmError(`LLM 请求失败（${res.status}）: ${body.slice(0, 500)}`, res.status)
      }
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>
      }
      const content = data.choices?.[0]?.message?.content
      if (!content) throw new LlmError('LLM 返回内容为空')
      return content
    } finally {
      clearTimeout(timer)
    }
  }
}

/** 从可能包含 markdown 代码块的文本中提取 JSON */
export function extractJson<T>(raw: string): T | null {
  const trimmed = raw.trim()
  const direct = tryParse<T>(trimmed)
  if (direct) return direct
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) {
    const parsed = tryParse<T>(fenced[1].trim())
    if (parsed) return parsed
  }
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) {
    const parsed = tryParse<T>(trimmed.slice(start, end + 1))
    if (parsed) return parsed
  }
  return null
}

function tryParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}