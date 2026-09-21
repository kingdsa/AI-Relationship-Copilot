import type { Credentials } from './credentials'

/** 沟通策略（人设口径）：使用者手动选择，决定回复的整体语气与立场 */
export const COMMUNICATION_STRATEGIES = [
  'warm_boyfriend',
  'normal_friend',
  'righteous_anger',
  'no_more_patience',
] as const

export type CommunicationStrategyType = (typeof COMMUNICATION_STRATEGIES)[number]

export const DEFAULT_COMMUNICATION_STRATEGY: CommunicationStrategyType = 'warm_boyfriend'

export const COMMUNICATION_STRATEGY_LABELS: Record<CommunicationStrategyType, string> = {
  warm_boyfriend: '暖心男友',
  normal_friend: '普通朋友',
  righteous_anger: '嫉恶如仇',
  no_more_patience: '忍无可忍',
}

export const COMMUNICATION_STRATEGY_HINTS: Record<CommunicationStrategyType, string> = {
  warm_boyfriend: '以男朋友的身份：温柔、在乎、主动关心，先接住情绪',
  normal_friend: '以普通朋友的身份：自然、礼貌、有分寸，不暧昧也不冷淡',
  righteous_anger: '对讨厌的人：冷淡、有界限、点破问题，不讨好',
  no_more_patience: '已经忍到极限：把不满和底线直接说出来，语气严厉',
}

export interface Attachment {
  id: string
  type: 'image' | 'emoji' | 'file' | 'link'
  url?: string
  description?: string
}

export interface Message {
  id: string
  role: 'user' | 'other'
  content: string
  timestamp: number
  attachments?: Attachment[]
  viaJev?: boolean
}

export interface EmotionAnalysis {
  emotion: string
  confidence: number
  intensity: number
  attitude: string
  intent: string
  relationshipState: string
  relationshipStateLabel: string
  urgency: 'low' | 'medium' | 'high'
  emotionProbabilities: Record<string, number>
  contextSufficient: boolean
  notes: string[]
}

export interface ReplyStrategyView {
  primary: string
  primaryLabel: string
  communicationStrategy: CommunicationStrategyType
  communicationStrategyLabel: string
  directives: string[]
  avoid: string[]
  confidence: number
}

export interface RiskAssessment {
  level: 'none' | 'watch' | 'high'
  reasons: string[]
  sensitiveTopics: string[]
  autoSendAllowed: boolean
  requiresConfirmation: boolean
}

export interface ReplySuggestion {
  content: string
  strategy: string[]
  confidence: number
  source: 'llm' | 'composer'
}

export interface AnalyzeResponse {
  emotion: EmotionAnalysis
  strategy: ReplyStrategyView
  risk: RiskAssessment
  jevModel: string
  timings: Record<string, number>
  historyId: string
  /** 服务端合并后的关系记忆与本次时间线记录，由前端写入 localStorage */
  relationshipMemory: RelationshipMemory
  historyRecord: HistoryRecord
}

export interface ReplyResponse {
  emotion: EmotionAnalysis
  strategy: ReplyStrategyView
  risk: RiskAssessment
  replies: ReplySuggestion[]
  replySource: 'llm' | 'composer'
  jevModel: string
  timings: Record<string, number>
  warning?: string
  historyId: string
  relationshipMemory: RelationshipMemory
  historyRecord: HistoryRecord
}

export interface ActionStep {
  at: number
  step: string
  detail: string
  ok: boolean
}

export interface SendResponse {
  ok: boolean
  steps: ActionStep[]
  screenshot: string
  usedVisualFallback: boolean
  page: {
    url: string
    title: string
    visibleMessageCount: number
    input: { selector: string; label: string }
    sendButton: { selector: string; label: string }
  }
}

export interface ObserveResponse {
  page: SendResponse['page'] & { observedAt: number }
  screenshot: string
  extracted: Message[]
}

export interface CommunicationStyle {
  personality: string
  tone: string
  humor: 'low' | 'medium' | 'high'
  emojiUsage: 'low' | 'medium' | 'high'
  messageLength: 'short' | 'medium' | 'long'
  preferredStyle: string
}

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

/** 设置面板的一次保存：凭据与画像都进 localStorage，不经过服务端 */
export interface SettingsSavePayload {
  credentials?: Credentials
  userCommunicationStyle?: CommunicationStyle
  otherCommunicationStyle?: CommunicationStyle
  autoAnalyze?: boolean
  relationshipMemory?: RelationshipMemory
}