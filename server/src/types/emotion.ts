export const EMOTIONS = [
  '开心',
  '兴奋',
  '期待',
  '平静',
  '疑惑',
  '尴尬',
  '害羞',
  '委屈',
  '失望',
  '难过',
  '生气',
  '焦虑',
  '冷淡',
  '烦躁',
  '撒娇',
  '暧昧',
  '无奈',
  '疲惫',
] as const

export type Emotion = (typeof EMOTIONS)[number]

export const EMOTION_RUBRICS: Record<Emotion, string> = {
  开心: '轻松愉快，正向情绪外露',
  兴奋: '情绪高涨，迫不及待分享',
  期待: '对某件事抱有盼望，等待对方回应',
  平静: '情绪稳定，无明显波动',
  疑惑: '不理解、不确定，在等解释',
  尴尬: '有点不自在，场面略显窘迫',
  害羞: '被夸或被撩到，含蓄不直说',
  委屈: '觉得自己被忽略或受了点委屈，希望被心疼',
  失望: '期待落空，情绪往下走',
  难过: '明显低落、伤心',
  生气: '明显不满、带有指责或攻击性',
  焦虑: '担心、不安、反复确认',
  冷淡: '语气疏离，不想多聊',
  烦躁: '不耐烦，容易被点燃',
  撒娇: '故意闹点小情绪，想被哄',
  暧昧: '有意拉近距离，带点调情',
  无奈: '没办法、只能接受，略带怨念',
  疲惫: '累、没精力，需要被照顾',
}

export const ATTITUDES = [
  '温柔亲近',
  '热情',
  '平淡',
  '撒娇',
  '试探',
  '玩笑打趣',
  '认真严肃',
  '冷淡',
  '疏离',
  '不满',
  '攻击',
] as const

export const INTENTS = [
  '主动分享',
  '寻求关注',
  '寻求安慰',
  '表达不满',
  '表达开心',
  '寻求建议',
  '询问问题',
  '撒娇',
  '试探',
  '道歉',
  '拒绝',
  '结束话题',
  '希望陪伴',
  '希望解释',
  '希望解决问题',
] as const

export const RELATIONSHIP_STATES = [
  'normal',
  'happy',
  'intimate',
  'slightly_unhappy',
  'conflict',
  'cold',
  'reconciliation',
] as const

export const RELATIONSHIP_STATE_LABELS: Record<(typeof RELATIONSHIP_STATES)[number], string> = {
  normal: '正常平稳',
  happy: '开心甜蜜',
  intimate: '亲密',
  slightly_unhappy: '轻微不开心',
  conflict: '冲突矛盾',
  cold: '冷战',
  reconciliation: '和好修复',
}

export type Urgency = 'low' | 'medium' | 'high'

export interface EmotionAnalysis {
  emotion: string
  confidence: number
  intensity: number
  attitude: string
  intent: string
  relationshipState: string
  relationshipStateLabel: string
  urgency: Urgency
  emotionProbabilities: Record<string, number>
  contextSufficient: boolean
  /** 需要更多上下文时的说明 */
  notes: string[]
}