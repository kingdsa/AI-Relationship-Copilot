export const REPLY_STRATEGIES = [
  'comfort',
  'apology',
  'explanation',
  'care',
  'companionship',
  'humor',
  'flirting',
  'question',
  'topic_change',
  'reassurance',
  'celebration',
  'normal_reply',
] as const

export type ReplyStrategyType = (typeof REPLY_STRATEGIES)[number]

export const STRATEGY_LABELS: Record<ReplyStrategyType, string> = {
  comfort: '安慰',
  apology: '道歉',
  explanation: '解释',
  care: '主动关心',
  companionship: '陪伴',
  humor: '幽默调侃',
  flirting: '亲密调情',
  question: '提问引导',
  topic_change: '转移话题',
  reassurance: '安抚肯定',
  celebration: '庆祝分享喜悦',
  normal_reply: '正常回应',
}

export interface ReplyStrategy {
  primary: ReplyStrategyType
  primaryLabel: string
  /** 应该做的事（展示给用户） */
  directives: string[]
  /** 不建议做的事（展示给用户） */
  avoid: string[]
  confidence: number
}

export interface RiskAssessment {
  level: 'none' | 'watch' | 'high'
  reasons: string[]
  sensitiveTopics: string[]
  /** 第一阶段始终需要人工确认；此字段表达风险允许程度 */
  autoSendAllowed: boolean
  requiresConfirmation: boolean
}