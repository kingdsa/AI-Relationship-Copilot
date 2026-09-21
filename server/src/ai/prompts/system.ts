import type { ConversationContext } from '../../types/index.js'
import type { EmotionAnalysis } from '../../types/emotion.js'
import type { ReplyStrategy } from '../../types/strategy.js'
import { COMMUNICATION_STRATEGY_GUIDES } from '../../types/strategy.js'

/**
 * PRD §18 核心 System Prompt。
 * 用于 LLM 回复生成（当配置了 LLM 时）。
 */
export const REPLY_SYSTEM_PROMPT = `你是一个恋爱关系聊天辅助 AI。

你的任务不是机械理解文字，而是结合上下文理解对方当前可能的情绪、意图和沟通需求。

你必须综合考虑：

1. 当前消息
2. 最近聊天记录
3. 消息发送顺序
4. 消息间隔
5. 表情
6. 图片
7. 历史沟通模式
8. 双方关系状态

不要仅根据单句话判断情绪。例如"没事""随便""哦""你忙吧"都不能直接判断为某种固定情绪。

你收到的输入已经包含 JEV（决策模型）对情绪、意图、关系状态和回复策略的结构化判断，你要做的是：
- 尊重 JEV 的策略判断，把它翻译成自然、真诚的中文回复
- 严格遵循「沟通策略（人设）」：用户手动选择了以什么身份/态度回复（暖心男友 / 普通朋友 / 嫉恶如仇 / 忍无可忍），语气、用词、亲密程度都以人设为准；人设与 JEV 策略冲突时，以人设为准（例如"忍无可忍"时不要温柔安抚）
- 让回复像是"用户本人"说出来的，而不是客服或情感博主
- 避免说教、避免长篇大论、避免模板腔
- 不要假装确定，不确定时用更温和的表达

输出必须为 JSON，格式：

{
  "candidates": [
    {
      "content": "回复内容1",
      "strategy": ["这条回复使用的策略点"],
      "confidence": 0.0
    }
  ]
}

要求：
- 生成 1~3 条候选回复，风格各有差异（例如：一条更温柔、一条更直接、一条更简短）
- 每条回复都是可以直接发给对方的中文消息，不要包含引号、说明文字或括号备注
- 回复中不要出现"我建议""作为AI"这类字眼`

export function buildContextForModel(context: ConversationContext): string {
  const lines: string[] = []
  if (context.relationshipMemory.otherName) {
    lines.push(`【对方称呼】${context.relationshipMemory.otherName}`)
  }
  lines.push(
    `【用户沟通风格】${JSON.stringify(context.userCommunicationStyle, null, 2)}`,
  )
  if (context.relationshipMemory.knownTriggers.length > 0) {
    lines.push(`【已知雷区】${context.relationshipMemory.knownTriggers.join('；')}`)
  }
  if (context.relationshipMemory.preferences.length > 0) {
    lines.push(`【对方偏好】${context.relationshipMemory.preferences.join('；')}`)
  }
  return lines.join('\n')
}

export function buildMessagesTranscript(context: ConversationContext): string {
  const lines = context.recentMessages.map((m) => {
    const who = m.role === 'other' ? '对方' : '用户'
    const time = new Date(m.timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
    const attach = m.attachments?.length
      ? `[附件：${m.attachments.map((a) => a.description || a.type).join('、')}]`
      : ''
    return `[${time}] ${who}：${m.content}${attach}`
  })
  return lines.join('\n')
}

export function buildCommunicationStrategySection(strategy: ReplyStrategy): string {
  const guide = COMMUNICATION_STRATEGY_GUIDES[strategy.communicationStrategy]
  return [
    `# 沟通策略（人设）：${guide.label}`,
    guide.tone,
    '这个口径下要做到：',
    ...guide.directives.map((item) => `- ${item}`),
    '这个口径下要避免：',
    ...guide.avoid.map((item) => `- ${item}`),
    '措辞尺度：可以有立场和火气，但不要辱骂、不要人身攻击、不要威胁。',
  ].join('\n')
}

export function buildReplyUserPrompt(
  context: ConversationContext,
  emotion: EmotionAnalysis,
  strategy: ReplyStrategy,
): string {
  return [
    '# 最近聊天记录（按时间顺序，最后一条是对方最新消息）',
    buildMessagesTranscript(context),
    '',
    '# JEV 结构化判断',
    JSON.stringify(
      {
        emotion: emotion.emotion,
        emotion_confidence: emotion.confidence,
        emotion_intensity: emotion.intensity,
        attitude: emotion.attitude,
        intent: emotion.intent,
        relationship_state: emotion.relationshipState,
        urgency: emotion.urgency,
        reply_strategy: strategy.directives.concat(
          strategy.avoid.map((a) => `注意：${a}`),
        ),
        primary_strategy: strategy.primary,
        communication_strategy: strategy.communicationStrategy,
      },
      null,
      2,
    ),
    '',
    buildCommunicationStrategySection(strategy),
    '',
    '# 用户画像与关系记忆',
    buildContextForModel(context),
    '',
    '请生成 1~3 条候选回复（JSON 输出）。',
  ].join('\n')
}