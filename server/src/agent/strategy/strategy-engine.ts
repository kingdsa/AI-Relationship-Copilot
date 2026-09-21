import { JevClient, readNoul } from '../../ai/client/jev-client.js'
import { RISK_QUESTIONS, STRATEGY_QUESTIONS } from '../../ai/schemas/questions.js'
import type { SystemOneQuestion, SystemOneResponse } from '../../types/jev.js'
import type { EmotionAnalysis } from '../../types/emotion.js'
import type {
  CommunicationStrategyType,
  ReplyStrategy,
  ReplyStrategyType,
  RiskAssessment,
} from '../../types/strategy.js'
import {
  COMMUNICATION_STRATEGY_GUIDES,
  COMMUNICATION_STRATEGY_LABELS,
  DEFAULT_COMMUNICATION_STRATEGY,
  REPLY_STRATEGIES,
  STRATEGY_LABELS,
} from '../../types/strategy.js'
import type { ConversationContext } from '../../types/index.js'
import { buildJevState } from '../context/context-builder.js'
import { assessRisk } from './risk-control.js'

const DECISION_THRESHOLD = 0.5

const NEGATIVE_EMOTIONS = new Set([
  '委屈',
  '失望',
  '难过',
  '生气',
  '焦虑',
  '冷淡',
  '烦躁',
  '无奈',
  '疲惫',
])

function strategyQuestions(): Record<string, SystemOneQuestion> {
  const questions: Record<string, SystemOneQuestion> = {
    strategy_primary: {
      type: 'choice',
      instructions:
        'Which single reply strategy is best for the user right now, given the emotion and intent of the other person?',
      criteria: Object.fromEntries(REPLY_STRATEGIES.map((s) => [s, STRATEGY_LABELS[s]])),
    },
  }
  for (const q of STRATEGY_QUESTIONS) {
    questions[q.key] = { type: 'noul', instructions: q.instructions }
  }
  for (const r of RISK_QUESTIONS) {
    questions[r.key] = { type: 'noul', instructions: r.instructions }
  }
  return questions
}

export interface StrategyEngineResult {
  strategy: ReplyStrategy
  risk: RiskAssessment
  raw: SystemOneResponse
}

/**
 * Strategy Engine（PRD §13/§14）：
 * 用 JEV 的 noul 决策回答"要不要这样做/要不要避免那样做"，在代码里组织成策略清单。
 */
export class StrategyEngine {
  constructor(private readonly jev: JevClient) {}

  /** 只发起 JEV 决策请求，便于与 Emotion Engine 并行执行 */
  async ask(context: ConversationContext): Promise<SystemOneResponse> {
    return this.jev.ask(buildJevState(context), strategyQuestions())
  }

  async decide(
    context: ConversationContext,
    emotion: EmotionAnalysis,
    communicationStrategy: CommunicationStrategyType = DEFAULT_COMMUNICATION_STRATEGY,
  ): Promise<StrategyEngineResult> {
    const raw = await this.ask(context)
    return {
      strategy: composeStrategy(raw, emotion, communicationStrategy),
      risk: assessRisk(raw, emotion.confidence, communicationStrategy),
      raw,
    }
  }
}

export function composeStrategy(
  raw: SystemOneResponse,
  emotion: EmotionAnalysis,
  communicationStrategy: CommunicationStrategyType = DEFAULT_COMMUNICATION_STRATEGY,
): ReplyStrategy {
  const primaryAnswer = raw.answers.strategy_primary
  const primaryRaw =
    primaryAnswer && primaryAnswer.type === 'choice' ? primaryAnswer.choice : 'normal_reply'
  const primary: ReplyStrategyType = (REPLY_STRATEGIES as readonly string[]).includes(primaryRaw)
    ? (primaryRaw as ReplyStrategyType)
    : 'normal_reply'

  const guide = COMMUNICATION_STRATEGY_GUIDES[communicationStrategy]
  const directives: string[] = [
    `主策略：${STRATEGY_LABELS[primary]}`,
    `沟通策略：${guide.label}`,
    ...guide.directives,
  ]
  const avoid: string[] = [...guide.avoid]

  const suppressed = (text: string) =>
    guide.suppress.some((pattern) => text.includes(pattern))

  for (const q of STRATEGY_QUESTIONS) {
    const value = readNoul(raw, q.key, 0)
    if (value < DECISION_THRESHOLD) continue
    if (q.directive && !suppressed(q.directive)) directives.push(q.directive)
    if (q.avoid && !suppressed(q.avoid)) avoid.push(q.avoid)
  }

  const coldMode =
    communicationStrategy === 'righteous_anger' ||
    communicationStrategy === 'no_more_patience'

  if (!coldMode && emotion.intensity >= 0.6 && NEGATIVE_EMOTIONS.has(emotion.emotion)) {
    directives.push('对方情绪强度较高：先把情绪接住，再谈事情本身')
  }
  if (emotion.intent === '希望解决问题') {
    directives.push('情绪被接住之后，给出具体行动或方案，而不只是口头安慰')
  }
  if (emotion.intent === '询问问题') {
    directives.push('先直接回答对方的问题，不要绕')
  }
  if (emotion.urgency === 'high') {
    directives.push('尽快回复，不要让消息久等')
  }
  if (emotion.relationshipState === 'cold' || emotion.relationshipState === 'conflict') {
    avoid.push('不要翻旧账，只谈当下这一件事')
  }
  if (emotion.relationshipState === 'reconciliation' && !coldMode) {
    directives.push('顺着对方给的台阶下，态度要软')
  }

  const confidence = primaryAnswer && primaryAnswer.type === 'choice' ? primaryAnswer.confidence : 0.5

  return {
    primary,
    primaryLabel: STRATEGY_LABELS[primary],
    communicationStrategy,
    communicationStrategyLabel: COMMUNICATION_STRATEGY_LABELS[communicationStrategy],
    directives: Array.from(new Set(directives)),
    avoid: Array.from(new Set(avoid)),
    confidence: Number(confidence.toFixed(2)),
  }
}