import type { Credentials } from './credentials'

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