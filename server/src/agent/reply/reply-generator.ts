import { extractJson, LlmClient } from '../../ai/client/llm-client.js'
import { buildReplyUserPrompt, REPLY_SYSTEM_PROMPT } from '../../ai/prompts/system.js'
import type { ReplySuggestion } from '../../types/reply.js'
import type { EmotionAnalysis } from '../../types/emotion.js'
import type { ReplyStrategy } from '../../types/strategy.js'
import type { ConversationContext } from '../../types/index.js'
import { composeReplies } from './composer.js'

interface LlmReplyPayload {
  candidates?: Array<{
    content?: string
    strategy?: string[]
    confidence?: number
  }>
}

export interface ReplyGeneratorOptions {
  variant: number
  count: number
}

export interface ReplyGeneratorOutput {
  replies: ReplySuggestion[]
  source: ReplySuggestion['source']
  warning?: string
}

/**
 * Reply Generator（PRD §15）：
 * 优先使用 LLM 生成自然语言回复；未配置或失败时降级为本地合成器。
 * 无论哪条路径，回复内容都由 JEV 的情绪与策略决策驱动。
 */
export class ReplyGenerator {
  constructor(private readonly llm: LlmClient | null) {}

  get llmConfigured(): boolean {
    return Boolean(this.llm?.configured)
  }

  get llmModel(): string | null {
    return this.llm?.configured ? this.llm.modelName : null
  }

  async generate(
    context: ConversationContext,
    emotion: EmotionAnalysis,
    strategy: ReplyStrategy,
    options: ReplyGeneratorOptions,
  ): Promise<ReplyGeneratorOutput> {
    if (this.llm?.configured) {
      try {
        const variantHint =
          options.variant > 0
            ? `\n\n这是第 ${options.variant + 1} 次生成，请换不同的表达方式和措辞，不要与上一次重复。`
            : ''
        const raw = await this.llm.chatJSON(
          REPLY_SYSTEM_PROMPT,
          buildReplyUserPrompt(context, emotion, strategy) +
            `\n\n请生成 ${options.count} 条候选回复。` +
            variantHint,
          context.attachments.filter((a) => a.type === 'image' && a.url).map((a) => a.url!),
        )
        const parsed = extractJson<LlmReplyPayload>(raw)
        const candidates = (parsed?.candidates ?? [])
          .filter((c) => typeof c.content === 'string' && c.content.trim().length > 0)
          .slice(0, options.count)
        if (candidates.length > 0) {
          return {
            replies: candidates.map((candidate, index) => ({
              content: candidate.content!.trim(),
              strategy:
                candidate.strategy && candidate.strategy.length > 0
                  ? candidate.strategy
                  : strategy.directives,
              confidence:
                typeof candidate.confidence === 'number'
                  ? Number(candidate.confidence.toFixed(2))
                  : Math.max(0.4, Number((emotion.confidence - index * 0.06).toFixed(2))),
              source: 'llm',
            })),
            source: 'llm',
          }
        }
        return {
          ...this.compose(context, emotion, strategy, options),
          warning: 'LLM 返回内容无法解析，已使用本地合成器。',
        }
      } catch (error) {
        return {
          ...this.compose(context, emotion, strategy, options),
          warning: `LLM 调用失败（${error instanceof Error ? error.message : String(error)}），已降级为本地合成器。`,
        }
      }
    }
    return this.compose(context, emotion, strategy, options)
  }

  private compose(
    context: ConversationContext,
    emotion: EmotionAnalysis,
    strategy: ReplyStrategy,
    options: ReplyGeneratorOptions,
  ): ReplyGeneratorOutput {
    return {
      replies: composeReplies({
        context,
        emotion,
        strategy,
        variant: options.variant,
        count: options.count,
      }),
      source: 'composer',
    }
  }
}