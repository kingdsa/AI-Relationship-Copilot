import { randomUUID } from 'node:crypto'
import type { RelationshipMemory } from '../../types/index.js'
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

export interface MemoryCandidates {
  preferences: string[]
  knownTriggers: string[]
  importantEvents: string[]
}

export function extractMemoryCandidates(text: string): MemoryCandidates {
  return {
    preferences: extract(PREFERENCE_PATTERNS, text, ''),
    knownTriggers: extract(TRIGGER_PATTERNS, text, ''),
    importantEvents: EVENT_KEYWORDS.filter((k) => text.includes(k)).map(
      (k) => `${new Date().toLocaleDateString('zh-CN')} 提到：${k}`,
    ),
  }
}

function mergeUnique(base: string[], incoming: string[], limit = 50): string[] {
  const set = new Set(base.map((s) => s.trim()).filter(Boolean))
  for (const item of incoming) {
    const value = item.trim()
    if (value) set.add(value)
  }
  return Array.from(set).slice(-limit)
}

export function mergeIntoMemory(
  memory: RelationshipMemory,
  candidates: MemoryCandidates,
): RelationshipMemory {
  return {
    ...memory,
    preferences: mergeUnique(memory.preferences, candidates.preferences),
    knownTriggers: mergeUnique(memory.knownTriggers, candidates.knownTriggers),
    importantEvents: mergeUnique(memory.importantEvents, candidates.importantEvents),
    updatedAt: Date.now(),
  }
}

/**
 * Memory Builder（PRD §17）：从最新消息里抽取可复用的关系记忆，
 * 并生成一条情绪时间线记录。这里只做纯计算，持久化由前端 localStorage 完成。
 */
export function buildHistoryRecord(params: {
  incoming: string
  /** 用于抽取记忆的文本（默认取 incoming，可传入最近几条她的消息） */
  memoryText?: string
  emotion: EmotionAnalysis
  memory: RelationshipMemory
}): { record: HistoryRecord; memory: RelationshipMemory } {
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

  const candidates = extractMemoryCandidates(params.memoryText || params.incoming)
  const memory = mergeIntoMemory(params.memory, candidates)

  return { record, memory }
}