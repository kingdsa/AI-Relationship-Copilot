import type { CommunicationStyle, RelationshipMemory } from '../../types/index.js'
import {
  COMMUNICATION_STRATEGIES,
  DEFAULT_COMMUNICATION_STRATEGY,
  type CommunicationStrategyType,
} from '../../types/strategy.js'

/**
 * 使用者画像（沟通风格 + 沟通策略 + 关系记忆）由前端 localStorage 持有，
 * 随每个请求传入；服务端不保存，只做校验、补默认值与合并。
 */
export interface UserProfile {
  userCommunicationStyle: CommunicationStyle
  otherCommunicationStyle: CommunicationStyle
  /** 使用者手动选择的沟通策略（暖心男友/普通朋友/嫉恶如仇/忍无可忍） */
  communicationStrategy: CommunicationStrategyType
  relationshipMemory: RelationshipMemory
}

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

export function defaultRelationshipMemory(): RelationshipMemory {
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

export const defaultProfile = (): UserProfile => ({
  userCommunicationStyle: defaultUserStyle,
  otherCommunicationStyle: defaultOtherStyle,
  communicationStrategy: DEFAULT_COMMUNICATION_STRATEGY,
  relationshipMemory: defaultRelationshipMemory(),
})

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

function sanitizeStyle(value: unknown, fallback: CommunicationStyle): CommunicationStyle {
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

function sanitizeMemory(value: unknown): RelationshipMemory {
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

export function sanitizeProfile(input: unknown): UserProfile {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  return {
    userCommunicationStyle: sanitizeStyle(raw.userCommunicationStyle, defaultUserStyle),
    otherCommunicationStyle: sanitizeStyle(raw.otherCommunicationStyle, defaultOtherStyle),
    communicationStrategy: readEnum(
      raw.communicationStrategy,
      COMMUNICATION_STRATEGIES,
      DEFAULT_COMMUNICATION_STRATEGY,
    ),
    relationshipMemory: sanitizeMemory(raw.relationshipMemory),
  }
}