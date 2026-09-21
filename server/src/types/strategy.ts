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

/** 使用者手动选择的沟通策略（人设口径），决定回复的整体语气与立场 */
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

export interface CommunicationStrategyGuide {
  label: string
  /** 给 LLM 的人设口径说明 */
  tone: string
  /** 该口径下必须做的（追加到策略清单） */
  directives: string[]
  /** 该口径下不建议做的（追加到避免清单，不带"不要"二字） */
  avoid: string[]
  /** 需要从自动策略清单里剔除的关键词（避免与口径冲突，如"表达在意"） */
  suppress: string[]
}

export const COMMUNICATION_STRATEGY_GUIDES: Record<
  CommunicationStrategyType,
  CommunicationStrategyGuide
> = {
  warm_boyfriend: {
    label: '暖心男友',
    tone: '以男朋友的身份回应：温柔、在意对方感受、主动靠近，先接住情绪再谈事情。',
    directives: ['整体维持暖心男友的温柔口径', '回复里让对方感受到被在乎'],
    avoid: ['冷淡、敷衍或公事公办'],
    suppress: [],
  },
  normal_friend: {
    label: '普通朋友',
    tone: '以普通朋友的身份回应：自然、礼貌、有分寸，不暧昧、不过度亲密，也不刻意冷淡。',
    directives: ['整体维持普通朋友的自然分寸感', '就事论事，不过度介入对方情绪'],
    avoid: ['暧昧、调情或过度承诺', '过度嘘寒问暖显得越界'],
    suppress: ['表达在意', '想念', '亲密', '调情'],
  },
  righteous_anger: {
    label: '嫉恶如仇',
    tone: '面对讨厌的人：态度冷、界限清楚、不讨好、不共情、不解释过多；可以点破对方的问题，但不谩骂、不人身攻击。',
    directives: ['整体维持冷淡但有界限的口径', '直接点破对方的问题，不顺着对方'],
    avoid: ['讨好、服软或主动道歉', '共情式安抚与嘘寒问暖', '翻来覆去解释自己'],
    suppress: ['先回应对方情绪', '表达在意', '想念', '幽默', '陪伴', '表达空间', '情绪被接住', '安抚'],
  },
  no_more_patience: {
    label: '忍无可忍',
    tone: '已经忍到极限：直接表达强烈不满、把底线和态度说清楚，语气严厉、有火气；可以质问和警告，但不辱骂、不人身攻击、不威胁。',
    directives: ['直接把不满和底线说出来，不再绕弯', '语气严厉，让对方意识到这次真的越界了'],
    avoid: ['继续哄、继续退让', '长篇说教式的讲道理', '阴阳怪气式的冷嘲热讽'],
    suppress: [
      '先回应对方情绪',
      '表达在意',
      '想念',
      '幽默',
      '陪伴',
      '表达空间',
      '情绪被接住',
      '安抚',
      '温柔',
      '讲道理',
    ],
  },
}

export interface ReplyStrategy {
  primary: ReplyStrategyType
  primaryLabel: string
  /** 使用者选择的沟通策略（人设口径） */
  communicationStrategy: CommunicationStrategyType
  communicationStrategyLabel: string
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