import { randomUUID } from 'node:crypto'
import { conversationHistory } from '../../memory/conversation-history.js'
import { relationshipMemory } from '../../memory/relationship-memory.js'
import type { EmotionAnalysis } from '../../types/emotion.js'
import type { HistoryRecord } from '../../types/index.js'

const PREFERENCE_PATTERNS = [
  /我(?:最|很|超|特别)?喜欢([^，。！？,.!?\n]{1,18})/g,
  /我(?:最|很|超|特别)?爱([^，。！？,.!?\n]{1,18})/g,
  /我想(?:要|吃|去|买)([^，。！？,.!?\n]{1,18})/g,
  /你(?:最|很|超|特别)?喜欢([^，。！？,.!?\n]{1,18})/g,
  /你(?:最|很|超|特别)?爱([^，。！？,.!?\n]{1,18})/g,
]

const TRIGGER_PATTERNS = [
  /我(?:最|很|超|特别)?讨厌([^，。！？,.!?\n]{1,18})/g,
  /我(?:最|很|超|特别)?不喜欢([^，。！？,.!?\n]{1,18})/g,
  /我受不了([^，。！？,.!?\n]{1,18})/g,
  /我(?:最|很|超|特别)?害怕([^，。！？,.!?\n]{1,18})/g,
  /别(?:再|总是|老是|又)([^，。！？,.!?\n]{1,18})/g,
]

const EVENT_KEYWORDS = [
  '生日',
  '纪念日',
  '考试',
  '面试',
  '加班',
  '出差',
  '生病',
  '发烧',
  '感冒',
  '搬家',
  '旅行',
  '旅游',
  '姨妈',
  '生理期',
  '年会',
  '答辩',
]

function extract(patternList: RegExp[], text: string, prefix: string): string[] {
  const found: string[] = []
  for (const pattern of patternList) {
    for (const match of text.matchAll(pattern)) {
      const value = match[1]?.trim().replace(/^[了的]+/, '').replace(/[了的]+$/, '')
      if (value && value.length >= 2) found.push(`${prefix}${value}`)
    }
  }
  return found
}

export function extractMemoryCandidates(text: string): {
  preferences: string[]
  knownTriggers: string[]
  importantEvents: string[]
} {
  return {
    preferences: extract(PREFERENCE_PATTERNS, text, ''),
    knownTriggers: extract(TRIGGER_PATTERNS, text, ''),
    importantEvents: EVENT_KEYWORDS.filter((k) => text.includes(k)).map(
      (k) => `${new Date().toLocaleDateString('zh-CN')} 提到：${k}`,
    ),
  }
}

/**
 * Memory Builder（PRD §17）：
 * 从最新消息里抽取可复用的关系记忆，并写入情绪时间线。
 * 注意：历史模式只作为参考，不当作绝对规则。
 */
export async function recordAnalysis(params: {
  incoming: string
  /** 用于抽取记忆的文本（默认取 incoming，可传入最近几条她的消息） */
  memoryText?: string
  emotion: EmotionAnalysis
}): Promise<HistoryRecord> {
  const record: HistoryRecord = {
    id: randomUUID(),
    at: Date.now(),
    incoming: params.incoming,
    emotion: params.emotion.emotion,
    intensity: params.emotion.intensity,
    intent: params.emotion.intent,
    relationshipState: params.emotion.relationshipState,
    urgency: params.emotion.urgency,
  }
  await conversationHistory.add(record)

  const candidates = extractMemoryCandidates(params.memoryText || params.incoming)
  if (
    candidates.preferences.length > 0 ||
    candidates.knownTriggers.length > 0 ||
    candidates.importantEvents.length > 0
  ) {
    await relationshipMemory.update(candidates)
  }

  return record
}