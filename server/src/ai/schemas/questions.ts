import type { SystemOneQuestion } from '../../types/jev.js'
import {
  ATTITUDES,
  EMOTIONS,
  EMOTION_RUBRICS,
  INTENTS,
  RELATIONSHIP_STATE_LABELS,
  RELATIONSHIP_STATES,
} from '../../types/emotion.js'
import { REPLY_STRATEGIES, STRATEGY_LABELS } from '../../types/strategy.js'

const ATTITUDE_RUBRICS: Record<(typeof ATTITUDES)[number], string> = {
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
}

const INTENT_RUBRICS: Record<(typeof INTENTS)[number], string> = {
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
}

export const RISK_QUESTIONS: Array<{ key: string; label: string; instructions: string }> = [
  {
    key: 'risk_breakup',
    label: '分手 / 关系破裂相关',
    instructions:
      'Does the conversation involve breaking up, ultimatums about the relationship, or talk of ending it?',
  },
  {
    key: 'risk_money',
    label: '金钱相关',
    instructions: 'Does the conversation involve money, borrowing, debts, or significant spending?',
  },
  {
    key: 'risk_health',
    label: '健康相关',
    instructions: 'Does the conversation involve health issues, illness, or medical concerns?',
  },
  {
    key: 'risk_family',
    label: '家庭重大问题',
    instructions: 'Does the conversation involve serious family issues or family conflicts?',
  },
  {
    key: 'risk_legal',
    label: '法律问题',
    instructions: 'Does the conversation involve legal issues, contracts, or disputes?',
  },
  {
    key: 'risk_promise',
    label: '重大承诺',
    instructions:
      'Is the other person asking for a major promise or long-term commitment (marriage, moving in, big decisions)?',
  },
  {
    key: 'risk_conflict',
    label: '严重争吵升级',
    instructions: 'Is a serious quarrel escalating right now, with strong negative emotion?',
  },
  {
    key: 'risk_misunderstanding',
    label: '明显误解',
    instructions:
      'Is there an obvious misunderstanding that could do damage if it is not clarified?',
  },
]

export const STRATEGY_QUESTIONS: Array<{
  key: string
  directive: string
  avoid: string
  instructions: string
}> = [
  {
    key: 'should_care_first',
    directive: '先回应对方情绪，再谈其他',
    avoid: '',
    instructions:
      "Should the reply first acknowledge or comfort the other person's emotion before anything else?",
  },
  {
    key: 'should_avoid_explaining',
    directive: '',
    avoid: '不要立即解释原因或为自己辩解',
    instructions:
      'Should the reply avoid immediately explaining or justifying the user\'s own behaviour?',
  },
  {
    key: 'should_avoid_reasoning',
    directive: '',
    avoid: '不要讲道理、不要争对错',
    instructions:
      'Should the reply avoid reasoning, arguing, or lecturing the other person about right and wrong?',
  },
  {
    key: 'should_avoid_why_question',
    directive: '',
    avoid: '不要反问对方"你怎么了/为什么生气"',
    instructions:
      "Should the reply avoid asking the other person to explain why they feel bad (e.g. 'why are you upset')?",
  },
  {
    key: 'should_give_space',
    directive: '给对方表达空间，不追问、不压迫',
    avoid: '',
    instructions:
      'Should the reply give the other person room to express themselves, instead of pressing them?',
  },
  {
    key: 'should_ask_question',
    directive: '用开放式提问引导对方多说一点',
    avoid: '',
    instructions:
      'Would it help to ask an open question that invites the other person to talk more?',
  },
  {
    key: 'should_express_missing',
    directive: '主动表达在意或想念',
    avoid: '',
    instructions:
      'Would it be appropriate to express affection, missing, or how much the user cares?',
  },
  {
    key: 'should_use_humor',
    directive: '适当幽默或调侃缓和气氛',
    avoid: '',
    instructions:
      'Would light humor or playful teasing be appropriate and helpful in this situation?',
  },
  {
    key: 'should_be_short',
    directive: '回复简短一点，不要长篇大论',
    avoid: '',
    instructions:
      'Should the reply be kept short and simple instead of long and elaborate?',
  },
]

export function buildSystemOneQuestions(): Record<string, SystemOneQuestion> {
  const questions: Record<string, SystemOneQuestion> = {
    emotion: {
      type: 'choice',
      instructions:
        "Given the whole conversation (order, gaps, wording, emoji), what is the other person's dominant emotion in the latest messages? Do not judge from a single word alone; words like '哦', '没事', '随便' can mean different things depending on context.",
      criteria: Object.fromEntries(EMOTIONS.map((e) => [e, EMOTION_RUBRICS[e]])),
    },
    intensity: {
      type: 'score',
      instructions: "How intense is the other person's emotion right now?",
      criteria: ['几乎没有', '轻微', '中等', '明显', '强烈'],
    },
    attitude: {
      type: 'choice',
      instructions: "What is the other person's tone / attitude toward the user?",
      criteria: Object.fromEntries(ATTITUDES.map((a) => [a, ATTITUDE_RUBRICS[a]])),
    },
    intent: {
      type: 'choice',
      instructions:
        'What does the other person most likely want from the user right now (their underlying intent)?',
      criteria: Object.fromEntries(INTENTS.map((i) => [i, INTENT_RUBRICS[i]])),
    },
    relationship_state: {
      type: 'choice',
      instructions: 'What is the current state of the relationship between the two people?',
      criteria: Object.fromEntries(
        RELATIONSHIP_STATES.map((s) => [s, RELATIONSHIP_STATE_LABELS[s]]),
      ),
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
    strategy_primary: {
      type: 'choice',
      instructions: 'Which single reply strategy is best for the user right now?',
      criteria: Object.fromEntries(
        REPLY_STRATEGIES.map((s) => [s, STRATEGY_LABELS[s]]),
      ),
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