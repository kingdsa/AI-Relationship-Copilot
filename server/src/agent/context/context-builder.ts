import { config } from '../../config.js'
import { relationshipMemory } from '../../memory/relationship-memory.js'
import { settingsStore } from '../../memory/user-profile.js'
import type { Attachment, ConversationContext, Message } from '../../types/index.js'

function summarize(messages: Message[]): string {
  if (messages.length === 0) return '暂无聊天记录'
  const otherCount = messages.filter((m) => m.role === 'other').length
  const userCount = messages.length - otherCount
  const spanMs = messages[messages.length - 1].timestamp - messages[0].timestamp
  const spanMin = Math.max(1, Math.round(spanMs / 60_000))
  const lastOther = [...messages].reverse().find((m) => m.role === 'other')
  return [
    `共 ${messages.length} 条消息（对方 ${otherCount} 条 / 我 ${userCount} 条），时间跨度约 ${spanMin} 分钟。`,
    lastOther ? `对方最新一条："${lastOther.content}"。` : '',
  ]
    .filter(Boolean)
    .join(' ')
}

/**
 * Context Builder（PRD §7）：把页面/消息/记忆/风格整理成统一上下文。
 */
export async function buildContext(messages: Message[]): Promise<ConversationContext> {
  const recentMessages = messages.slice(-config.recentMessageLimit)
  const [memory, settings] = await Promise.all([
    relationshipMemory.get(),
    settingsStore.get(),
  ])

  const attachments: Attachment[] = recentMessages.flatMap((m) => m.attachments ?? [])
  const lastMessage = recentMessages[recentMessages.length - 1] ?? null

  return {
    currentMessage: lastMessage,
    recentMessages,
    attachments,
    conversationSummary: summarize(recentMessages),
    relationshipMemory: memory,
    userCommunicationStyle: settings.userCommunicationStyle,
    otherCommunicationStyle: settings.otherCommunicationStyle,
  }
}

/**
 * 构造发给 JEV 的 state：包含消息顺序、时间间隔、双方画像与关系记忆。
 * JEV 支持 string / object / array，这里用结构化对象表达更多上下文。
 */
export function buildJevState(context: ConversationContext): Record<string, unknown> {
  const messages = context.recentMessages.map((m, index, arr) => {
    const prev = arr[index - 1]
    return {
      role: m.role === 'other' ? '对方' : '用户(我)',
      content: m.content,
      time: new Date(m.timestamp).toISOString(),
      gap_seconds: prev ? Math.round((m.timestamp - prev.timestamp) / 1000) : null,
      attachments: m.attachments?.map((a) => a.description || a.type) ?? [],
    }
  })

  return {
    task: '恋爱关系聊天辅助：判断对方情绪、态度、意图、关系状态、紧急度与回复策略',
    relationship_memory: {
      other_name: context.relationshipMemory.otherName,
      preferences: context.relationshipMemory.preferences,
      common_phrases: context.relationshipMemory.commonPhrases,
      communication_patterns: context.relationshipMemory.communicationPatterns,
      important_events: context.relationshipMemory.importantEvents,
      known_triggers: context.relationshipMemory.knownTriggers,
      favorite_topics: context.relationshipMemory.favoriteTopics,
    },
    user_style: context.userCommunicationStyle,
    other_style: context.otherCommunicationStyle,
    conversation_summary: context.conversationSummary,
    messages,
  }
}