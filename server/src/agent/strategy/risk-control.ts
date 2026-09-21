import { readNoul } from '../../ai/client/jev-client.js'
import { RISK_QUESTIONS } from '../../ai/schemas/questions.js'
import type { SystemOneResponse } from '../../types/jev.js'
import type { CommunicationStrategyType, RiskAssessment } from '../../types/strategy.js'
import {
  COMMUNICATION_STRATEGY_LABELS,
  DEFAULT_COMMUNICATION_STRATEGY,
} from '../../types/strategy.js'

export const RISK_THRESHOLD = 0.5

/**
 * 风险控制（PRD §30）：以下情况禁止自动发送，只生成建议 + 人工确认。
 * 第一阶段本身强制人工确认，这里负责把风险明确告诉用户。
 */
export function assessRisk(
  raw: SystemOneResponse,
  emotionConfidence: number,
  communicationStrategy: CommunicationStrategyType = DEFAULT_COMMUNICATION_STRATEGY,
): RiskAssessment {
  const sensitiveTopics: string[] = []
  const reasons: string[] = []
  let maxRisk = 0

  for (const risk of RISK_QUESTIONS) {
    const value = readNoul(raw, risk.key, 0)
    maxRisk = Math.max(maxRisk, value)
    if (value >= RISK_THRESHOLD) {
      sensitiveTopics.push(risk.label)
      reasons.push(`检测到可能涉及「${risk.label}」（JEV 概率 ${(value * 100).toFixed(0)}%）`)
    }
  }

  let level: RiskAssessment['level'] = 'none'
  if (maxRisk >= 0.7 || sensitiveTopics.length >= 2) {
    level = 'high'
  } else if (sensitiveTopics.length > 0) {
    level = 'watch'
  }

  if (emotionConfidence < 0.7) {
    reasons.push(`情绪分析置信度 ${emotionConfidence.toFixed(2)} < 0.7，需人工确认`)
    if (level === 'none') level = 'watch'
  }

  if (
    communicationStrategy === 'righteous_anger' ||
    communicationStrategy === 'no_more_patience'
  ) {
    const label = COMMUNICATION_STRATEGY_LABELS[communicationStrategy]
    reasons.push(`当前沟通策略为「${label}」，措辞偏强硬，可能明显影响关系，发送前请确认`)
    if (level === 'none') level = 'watch'
  }

  const autoSendAllowed = level === 'none' && emotionConfidence >= 0.7

  return {
    level,
    reasons,
    sensitiveTopics,
    autoSendAllowed,
    // 第一阶段必须人工确认（PRD 原则 5）
    requiresConfirmation: true,
  }
}