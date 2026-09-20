import type { Attachment, Message } from './message.js'
import type { EmotionAnalysis } from './emotion.js'
import type { ReplyStrategy, RiskAssessment } from './strategy.js'
import type { ReplySuggestion } from './reply.js'

export type { Attachment, Message, EmotionAnalysis, ReplyStrategy, RiskAssessment, ReplySuggestion }

export interface RelationshipMemory {
  otherName: string
  preferences: string[]
  commonPhrases: string[]
  communicationPatterns: string[]
  importantEvents: string[]
  knownTriggers: string[]
  favoriteTopics: string[]
  updatedAt: number
}

export interface CommunicationStyle {
  personality: string
  tone: string
  humor: 'low' | 'medium' | 'high'
  emojiUsage: 'low' | 'medium' | 'high'
  messageLength: 'short' | 'medium' | 'long'
  preferredStyle: string
}

export interface ConversationContext {
  currentMessage: Message | null
  recentMessages: Message[]
  attachments: Attachment[]
  conversationSummary: string
  relationshipMemory: RelationshipMemory
  userCommunicationStyle: CommunicationStyle
  otherCommunicationStyle: CommunicationStyle
}

export interface PipelineResult {
  emotion: EmotionAnalysis
  strategy: ReplyStrategy
  risk: RiskAssessment
  replies: ReplySuggestion[]
  replySource: ReplySuggestion['source']
  jevModel: string
  timings: Record<string, number>
}

export interface HistoryRecord {
  id: string
  at: number
  incoming: string
  emotion: string
  intensity: number
  intent: string
  relationshipState: string
  urgency: string
  replyText?: string
}