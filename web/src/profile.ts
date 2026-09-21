import {
  COMMUNICATION_STRATEGIES,
  DEFAULT_COMMUNICATION_STRATEGY,
  type CommunicationStrategyType,
  type CommunicationStyle,
  type HistoryRecord,
  type RelationshipMemory,
} from './types'

/**
 * 使用者画像：沟通风格 + 沟通策略 + 关系记忆 + 情绪时间线/分析历史。
 * 全部保存在使用者自己的浏览器 localStorage，随请求发给服务端计算，
 * 服务端不保存；多人共用同一部署时互不影响。
 */
export interface LocalProfile {
  userCommunicationStyle: CommunicationStyle
  otherCommunicationStyle: CommunicationStyle
  communicationStrategy: CommunicationStrategyType
  autoAnalyze: boolean
  relationshipMemory: RelationshipMemory
  history: HistoryRecord[]
}

export interface ProfileRequest {
  userCommunicationStyle: CommunicationStyle
  otherCommunicationStyle: CommunicationStyle
  communicationStrategy: CommunicationStrategyType
  relationshipMemory: RelationshipMemory
}

export const PROFILE_STORAGE_KEY = 'ai-relationship-copilot.profile.v1'

const HISTORY_LIMIT = 1000

export const defaultUserStyle: CommunicationStyle = {
  personality: '直白',
  tone: '自然',
  humor: 'medium',
  emojiUsage: 'low',
  messageLength: 'short',
  preferredStyle: 'natural',
}

export const defaultOtherStyle: CommunicationStyle = {
  personality: '细腻',
  tone: '自然',
  humor: 'medium',
  emojiUsage: 'medium',
  messageLength: 'short',
  preferredStyle: 'gentle',
}

export function defaultMemory(): RelationshipMemory {
  return {
    otherName: '她',
    preferences: [],
    commonPhrases: [],
    communicationPatterns: [],
    importantEvents: [],
    knownTriggers: [],
    favoriteTopics: [],
    updatedAt: Date.now(),
  }
}

export function defaultProfile(): LocalProfile {
  return {
    userCommunicationStyle: defaultUserStyle,
    otherCommunicationStyle: defaultOtherStyle,
    communicationStrategy: DEFAULT_COMMUNICATION_STRATEGY,
    autoAnalyze: true,
    relationshipMemory: defaultMemory(),
    history: [],
  }
}

const HUMOR = ['low', 'medium', 'high'] as const
const EMOJI = ['low', 'medium', 'high'] as const
const LENGTH = ['short', 'medium', 'long'] as const

function readText(value: unknown, fallback: string, max = 60): string {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : fallback
}

function readEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

function readList(value: unknown, limit = 50, itemMax = 80): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().slice(0, itemMax))
    .filter(Boolean)
    .slice(-limit)
}

function readStyle(value: unknown, fallback: CommunicationStyle): CommunicationStyle {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  return {
    personality: readText(raw.personality, fallback.personality),
    tone: readText(raw.tone, fallback.tone),
    humor: readEnum(raw.humor, HUMOR, fallback.humor),
    emojiUsage: readEnum(raw.emojiUsage, EMOJI, fallback.emojiUsage),
    messageLength: readEnum(raw.messageLength, LENGTH, fallback.messageLength),
    preferredStyle: readText(raw.preferredStyle, fallback.preferredStyle),
  }
}

function readMemory(value: unknown): RelationshipMemory {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  return {
    otherName: readText(raw.otherName, '她', 30),
    preferences: readList(raw.preferences),
    commonPhrases: readList(raw.commonPhrases),
    communicationPatterns: readList(raw.communicationPatterns),
    importantEvents: readList(raw.importantEvents),
    knownTriggers: readList(raw.knownTriggers),
    favoriteTopics: readList(raw.favoriteTopics),
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
  }
}

function readHistory(value: unknown): HistoryRecord[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .filter((item) => typeof item.id === 'string' && typeof item.at === 'number')
    .map<HistoryRecord>((item) => ({
      id: item.id as string,
      at: item.at as number,
      incoming: typeof item.incoming === 'string' ? item.incoming.slice(0, 2000) : '',
      emotion: typeof item.emotion === 'string' ? item.emotion : '',
      intensity: typeof item.intensity === 'number' ? Math.min(1, Math.max(0, item.intensity)) : 0,
      intent: typeof item.intent === 'string' ? item.intent : '',
      relationshipState: typeof item.relationshipState === 'string' ? item.relationshipState : '',
      urgency: typeof item.urgency === 'string' ? item.urgency : '',
      replyText: typeof item.replyText === 'string' ? item.replyText : undefined,
    }))
    .slice(-HISTORY_LIMIT)
}

export function loadProfile(): LocalProfile {
  const fallback = defaultProfile()
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return {
      userCommunicationStyle: readStyle(parsed.userCommunicationStyle, defaultUserStyle),
      otherCommunicationStyle: readStyle(parsed.otherCommunicationStyle, defaultOtherStyle),
      communicationStrategy: readEnum(
        parsed.communicationStrategy,
        COMMUNICATION_STRATEGIES,
        DEFAULT_COMMUNICATION_STRATEGY,
      ),
      autoAnalyze: parsed.autoAnalyze !== false,
      relationshipMemory: readMemory(parsed.relationshipMemory),
      history: readHistory(parsed.history),
    }
  } catch {
    return fallback
  }
}

export function saveProfile(profile: LocalProfile): void {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))
  } catch {
    /* localStorage 不可用时仅本次会话生效 */
  }
}

/** 发给服务端的最小画像（不含自动分析开关与历史，服务端用不到） */
export function profileRequest(profile: LocalProfile): ProfileRequest {
  return {
    userCommunicationStyle: profile.userCommunicationStyle,
    otherCommunicationStyle: profile.otherCommunicationStyle,
    communicationStrategy: profile.communicationStrategy,
    relationshipMemory: profile.relationshipMemory,
  }
}

/** 分析/生成回复后：写入合并后的关系记忆 + 追加情绪时间线记录（按 id 去重） */
export function applyAnalysisResult(
  profile: LocalProfile,
  result: { relationshipMemory: RelationshipMemory; historyRecord: HistoryRecord },
): LocalProfile {
  const exists = profile.history.some((record) => record.id === result.historyRecord.id)
  const history = exists
    ? profile.history.map((record) =>
        record.id === result.historyRecord.id ? { ...record, ...result.historyRecord } : record,
      )
    : [...profile.history, result.historyRecord].slice(-HISTORY_LIMIT)

  return {
    ...profile,
    relationshipMemory: result.relationshipMemory,
    history,
  }
}

/** 发送回复后，把回复文本挂到对应的时间线记录上 */
export function attachHistoryReply(
  profile: LocalProfile,
  historyId: string,
  replyText: string,
): LocalProfile {
  if (!historyId) return profile
  return {
    ...profile,
    history: profile.history.map((record) =>
      record.id === historyId ? { ...record, replyText } : record,
    ),
  }
}

export function clearHistory(profile: LocalProfile): LocalProfile {
  return { ...profile, history: [] }
}