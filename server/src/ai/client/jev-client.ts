import type {
  ChoiceAnswer,
  NoulAnswer,
  ScoreAnswer,
  SystemOneQuestion,
  SystemOneResponse,
} from '../../types/jev.js'

export interface JevClientOptions {
  apiKey: string
  baseUrl: string
  model: string
  timeoutMs?: number
  maxRetries?: number
}

export class JevError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message)
    this.name = 'JevError'
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * JEV（TypeSafe System One）客户端。
 * JEV 不生成文本，只返回类型化决策：noul(是非概率) / choice(分类) / score(评分)。
 * 业务层只依赖本客户端，不直接依赖具体模型（PRD §33）。
 */
export class JevClient {
  constructor(private readonly options: JevClientOptions) {}

  get configured(): boolean {
    return Boolean(this.options.apiKey)
  }

  get model(): string {
    return this.options.model
  }

  async ask(
    state: unknown,
    questions: Record<string, SystemOneQuestion>,
  ): Promise<SystemOneResponse> {
    if (!this.configured) {
      throw new JevError('JEV_API_KEY 未配置')
    }
    const maxRetries = this.options.maxRetries ?? 3
    const timeoutMs = this.options.timeoutMs ?? 45_000
    const url = `${this.options.baseUrl.replace(/\/$/, '')}/systemone`

    let lastError: unknown
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.options.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ model: this.options.model, state, questions }),
          signal: controller.signal,
        })
        if (!res.ok) {
          const body = await res.text().catch(() => '')
          const retryable = res.status === 429 || res.status === 529 || res.status >= 500
          if (retryable && attempt < maxRetries) {
            await sleep(400 * 2 ** attempt)
            continue
          }
          throw new JevError(`JEV 请求失败（${res.status}）: ${body.slice(0, 500)}`, res.status)
        }
        return (await res.json()) as SystemOneResponse
      } catch (error) {
        lastError = error
        if (error instanceof JevError) throw error
        if (attempt < maxRetries) {
          await sleep(400 * 2 ** attempt)
          continue
        }
        throw new JevError(
          `JEV 请求异常: ${error instanceof Error ? error.message : String(error)}`,
        )
      } finally {
        clearTimeout(timer)
      }
    }
    throw lastError instanceof Error ? lastError : new JevError('JEV 请求失败')
  }
}

export function readNoul(
  response: SystemOneResponse,
  key: string,
  fallback = 0,
): number {
  const answer = response.answers[key]
  if (!answer || answer.type !== 'noul') return fallback
  return (answer as NoulAnswer).noul
}

export function readChoice(
  response: SystemOneResponse,
  key: string,
): ChoiceAnswer | undefined {
  const answer = response.answers[key]
  if (!answer || answer.type !== 'choice') return undefined
  return answer as ChoiceAnswer
}

export function readScore(
  response: SystemOneResponse,
  key: string,
): ScoreAnswer | undefined {
  const answer = response.answers[key]
  if (!answer || answer.type !== 'score') return undefined
  return answer as ScoreAnswer
}