import type { SystemOneQuestion, SystemOneResponse } from '../../types/jev.js'
import type { EmotionAnalysis, Urgency } from '../../types/emotion.js'
import { RELATIONSHIP_STATE_LABELS } from '../../types/emotion.js'
import {
  JevClient,
  readChoice,
  readNoul,
  readScore,
} from '../../ai/client/jev-client.js'
import type { ConversationContext } from '../../types/index.js'
import { buildJevState } from '../context/context-builder.js'

const URGENCY_VALUES: Urgency[] = ['low', 'medium', 'high']

function emotionQuestions(): Record<string, SystemOneQuestion> {
  return {
    emotion: {
      type: 'choice',
      instructions:
        "Given the whole conversation (order, timing gaps, wording, emoji, attachments), what is the other person's dominant emotion in the latest messages? Do not judge from a single word alone: '哦', '没事', '随便', '你忙吧' can mean very different things depending on context.",
      criteria: {
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
      },
    },
    intensity: {
      type: 'score',
      instructions: "How intense is the other person's emotion right now?",
      criteria: ['几乎没有', '轻微', '中等', '明显', '强烈'],
    },
    attitude: {
      type: 'choice',
      instructions: "What is the other person's tone / attitude toward the user?",
      criteria: {
        温柔亲近: '语气柔软，带亲近感',
        热情: '主动、积极、情绪外放',
        平淡: '不咸不淡，公事公办',
        撒娇: '故意示弱或闹小情绪，想被哄',
        试探: '旁敲侧击，想看对方反应',
        玩笑打趣: '带玩笑性质的轻松语气',
        认真严肃: '在谈正事或表达重要态度',
        冷淡: '疏离、惜字如金',
        疏离: '明显拉开距离，不想靠近',
        不满: '有情绪但还没爆发，带指责意味',
        攻击: '带刺、直接冲撞',
      },
    },
    intent: {
      type: 'choice',
      instructions:
        'What does the other person most likely want from the user right now (their underlying intent)?',
      criteria: {
        主动分享: '分享日常或见闻，希望有人接话',
        寻求关注: '希望被注意到、被在乎',
        寻求安慰: '希望得到情绪安抚',
        表达不满: '对某件事或某句话不满意',
        表达开心: '分享喜悦，希望一起开心',
        寻求建议: '在请教怎么办',
        询问问题: '在问一个具体问题，期待直接回答',
        撒娇: '想被哄、被宠',
        试探: '想确认对方在不在意自己',
        道歉: '在示好或缓和关系',
        拒绝: '在表达不同意或不接受',
        结束话题: '想收尾，不想继续聊了',
        希望陪伴: '希望对方陪自己',
        希望解释: '希望对方说明原因',
        希望解决问题: '希望把问题真正解决掉',
      },
    },
    relationship_state: {
      type: 'choice',
      instructions: 'What is the current state of the relationship between the two people?',
      criteria: {
        normal: '正常平稳',
        happy: '开心甜蜜',
        intimate: '亲密',
        slightly_unhappy: '轻微不开心',
        conflict: '冲突矛盾',
        cold: '冷战',
        reconciliation: '和好修复',
      },
    },
    urgency: {
      type: 'choice',
      instructions: 'How urgent is it for the user to reply?',
      criteria: {
        low: '可以稍后回复，不着急',
        medium: '最好尽快回应，拖着会更糟',
        high: '需要立即回应，否则关系会明显变差',
      },
    },
    context_sufficient: {
      type: 'noul',
      instructions:
        'Is there enough context in the conversation to make a reliable judgment about the emotion and intent? Answer low if the conversation is too short or ambiguous.',
      criteria: { true: '上下文足够', false: '上下文不足，需要更多信息' },
    },
  }
}

export interface EmotionEngineResult {
  analysis: EmotionAnalysis
  raw: SystemOneResponse
}

/**
 * Emotion Engine（PRD §8）：只依赖 JEV 的类型化决策，不做自由文本判断。
 */
export class EmotionEngine {
  constructor(private readonly jev: JevClient) {}

  async analyze(context: ConversationContext): Promise<EmotionEngineResult> {
    const raw = await this.jev.ask(buildJevState(context), emotionQuestions())
    return { analysis: parseEmotion(raw), raw }
  }
}

export function parseEmotion(raw: SystemOneResponse): EmotionAnalysis {
  const emotionAnswer = readChoice(raw, 'emotion')
  const intensityAnswer = readScore(raw, 'intensity')
  const attitudeAnswer = readChoice(raw, 'attitude')
  const intentAnswer = readChoice(raw, 'intent')
  const stateAnswer = readChoice(raw, 'relationship_state')
  const urgencyAnswer = readChoice(raw, 'urgency')
  const contextSufficient = readNoul(raw, 'context_sufficient', 0.5) >= 0.5

  const relationshipState = stateAnswer?.choice ?? 'normal'
  let confidence = emotionAnswer?.confidence ?? 0.5
  const notes: string[] = []

  if (!contextSufficient) {
    confidence = Math.min(confidence, 0.5)
    notes.push('上下文不足：JEV 认为当前信息量不够，判断置信度已下调。')
  }
  if (confidence < 0.7) {
    notes.push('情绪判断置信度偏低（< 0.7），建议人工确认后再发送。')
  }

  const urgencyRaw = urgencyAnswer?.choice ?? 'medium'
  const urgency: Urgency = URGENCY_VALUES.includes(urgencyRaw as Urgency)
    ? (urgencyRaw as Urgency)
    : 'medium'

  return {
    emotion: emotionAnswer?.choice ?? '平静',
    confidence: Number(confidence.toFixed(2)),
    intensity: Number(((intensityAnswer?.score ?? 1) / 4).toFixed(2)),
    attitude: attitudeAnswer?.choice ?? '平淡',
    intent: intentAnswer?.choice ?? '主动分享',
    relationshipState,
    relationshipStateLabel:
      RELATIONSHIP_STATE_LABELS[relationshipState as keyof typeof RELATIONSHIP_STATE_LABELS] ??
      relationshipState,
    urgency,
    emotionProbabilities: emotionAnswer?.probabilities ?? {},
    contextSufficient,
    notes,
  }
}