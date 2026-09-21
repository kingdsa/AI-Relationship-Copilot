import type { ConversationContext } from '../../types/index.js'
import type { EmotionAnalysis } from '../../types/emotion.js'
import type { CommunicationStrategyType, ReplyStrategy, ReplyStrategyType } from '../../types/strategy.js'
import type { ReplySuggestion } from '../../types/reply.js'

interface ComposerInput {
  context: ConversationContext
  emotion: EmotionAnalysis
  strategy: ReplyStrategy
  variant: number
  count: number
}

const OPENERS: Record<string, string[]> = {
  委屈: ['感觉你有点不开心', '我看出来你心里不太舒服', '你是不是觉得我没把你放在心上'],
  失望: ['让你失望了，这事是我不好', '我知道这次没达到你的期待', '感觉你对我有点失望'],
  难过: ['感觉你今天心情不太好', '你好像不太开心，我有点心疼', '怎么啦，看你这样我心里也不好受'],
  生气: ['我知道你现在在生我的气', '感觉你在生气，这个我认', '你有火就冲我发，别憋着'],
  冷淡: ['你这一下子变冷淡，我心里咯噔一下', '感觉你不太想理我了', '是不是我哪句话让你不舒服了'],
  焦虑: ['感觉你有点不安', '别慌，有我在呢', '你是不是在担心什么事'],
  烦躁: ['你今天好像有点烦躁', '感觉你心情不太顺', '谁惹你了，跟我说说'],
  撒娇: ['看出来了，你是在等我哄你吧', '又开始跟我闹小脾气了哈', '行行行，都听你的'],
  开心: ['看你这么开心，我也跟着高兴', '今天心情不错呀', '这么开心，快跟我说说'],
  兴奋: ['哇，这么兴奋，发生什么好事了', '看你这么激动我也来劲了', '快说快说，我等不及了'],
  期待: ['看你这么期待，我一定不掉链子', '你是不是已经盼很久啦', '放心，这事我记着呢'],
  暧昧: ['你这么一说，我心跳都快了', '别撩我，我可是很认真的', '这话我爱听，多说点'],
  害羞: ['你还害羞了，好可爱', '别不好意思呀', '看你这样，我也想笑'],
  疑惑: ['你是不是没太明白我的意思', '感觉你有点疑惑，我再说清楚点', '有什么想问的直接问我'],
  无奈: ['我知道你挺无奈的', '这事确实让你为难了', '你的难处我懂'],
  疲惫: ['今天是不是很累', '感觉你累坏了，心疼', '辛苦了，先歇会儿'],
  平静: ['嗯嗯，我在', '收到，我来了', '我在听呢'],
  尴尬: ['刚才那下确实有点尴尬哈哈', '别尴尬，我没往心里去', '没事没事，这有什么'],
}

const CORES: Record<ReplyStrategyType, string[]> = {
  comfort: [
    '先别管别的，你现在的心情最重要',
    '不管发生什么，我都站你这边',
    '你先别自己扛着，跟我说说好不好',
  ],
  apology: [
    '这次是我没做好，我跟你道歉',
    '是我疏忽了，对不起，让你不舒服了',
    '刚才那句话是我说错了，我收回',
  ],
  explanation: [
    '我跟你解释一下当时的情况，不是你想的那样',
    '事情是这样的，我一五一十跟你说',
    '我来说清楚，免得你多想',
  ],
  care: [
    '你先跟我说说是怎么了，我听着',
    '别自己憋着，有什么都跟我说',
    '我在呢，你慢慢说，不着急',
  ],
  companionship: [
    '我陪着你，你慢慢说，不着急',
    '别一个人待着，我在这儿呢',
    '你想说话我就听着，你不想说我就在旁边陪着',
  ],
  humor: [
    '要不我先自罚三杯奶茶，你看行不行',
    '我错了，我认罚，今晚家务我全包',
    '这事要是评比的话，我一定是"最不会说话奖"得主',
  ],
  flirting: [
    '其实我一直想你，就是没好意思说',
    '跟你聊天这件事，我从来都不嫌多',
    '你知不知道你这样我很容易多想',
  ],
  question: [
    '你跟我说说，你是怎么想的',
    '那你希望我怎么做，我按你说的来',
    '你现在最在意的是哪一点',
  ],
  topic_change: [
    '先不说这些糟心事了，我跟你讲个好玩的事',
    '别想它了，晚上想吃点什么，我陪你',
    '换个话题，你还记得上次那个事吗',
  ],
  reassurance: [
    '你放心，这事我会认真处理好',
    '有我在，别怕，天塌不下来',
    '我答应你的事，肯定算数',
  ],
  celebration: [
    '这必须庆祝一下',
    '太棒了，我比你还高兴',
    '值得！今天得好好纪念一下',
  ],
  normal_reply: [
    '好呀，听你的',
    '嗯嗯，我知道了',
    '行，那就这么定',
  ],
}

const CLOSERS: Record<string, string[]> = {
  希望陪伴: ['我在呢，你慢慢说', '今晚哪儿也不去，就陪你', '想聊多久都行'],
  寻求关注: ['我一直都在，别瞎想', '你在我这儿永远排第一', '有事没事都可以找我'],
  寻求安慰: ['不开心就靠过来，我抱着你', '难过就哭出来，我不笑你', '有情绪很正常，我接得住'],
  希望解释: ['你有什么想问的尽管问，我都告诉你', '我不瞒你，你想知道什么我都说', '我解释到你明白为止'],
  希望解决问题: ['咱们一起想办法，别你一个人扛', '这事我来跟进，明天给你结果', '你把需求告诉我，我去办'],
  表达不满: ['你说得对，我改', '这事我听你的，别有下次', '你要是不舒服就直说，我照做'],
  寻求建议: ['我的想法是，你先别急，咱们一步步来', '要不这样，我给你分析分析'],
  主动分享: ['然后呢然后呢，继续讲', '这个我也感兴趣，多说说'],
  询问问题: ['这样可以吗', '你觉得呢', '方便的话我现在就去做'],
  撒娇: ['好好好，都依你', '你说什么都对', '行，我全听你的'],
  道歉: ['没事的，我没往心里去', '咱们这就翻篇，好不好', '不用道歉，我懂你'],
  试探: ['你不用猜，我直接告诉你我的想法', '我在意你，这点不用怀疑'],
  拒绝: ['好，我尊重你的想法', '行，那我不勉强你', '没关系，你的感受最重要'],
  结束话题: ['好，那先这样，早点休息', '行，不聊了，你去忙吧', '好，晚点再说，记得喝水'],
}

const EMPTY_FALLBACK = '嗯嗯，我在听'

type Polarity = 'negative' | 'positive' | 'neutral'
type CloserGroup = 'solution' | 'emotion' | 'default'

interface ModeVoice {
  openers: Record<Polarity, string[]>
  cores: Partial<Record<ReplyStrategyType, string[]>> & { default: string[] }
  closers: Record<CloserGroup, string[]>
}

const POSITIVE_EMOTIONS = new Set(['开心', '兴奋', '期待', '暧昧', '害羞', '撒娇', '平静'])
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
const SOLUTION_INTENTS = new Set(['希望解决问题', '寻求建议', '询问问题', '希望解释'])
const EMOTION_INTENTS = new Set([
  '希望陪伴',
  '寻求关注',
  '寻求安慰',
  '表达不满',
  '撒娇',
  '试探',
  '道歉',
])

/** 普通朋友：自然、礼貌、有分寸，不暧昧也不冷淡 */
const FRIEND_VOICE: ModeVoice = {
  openers: {
    negative: ['怎么了？', '听着是有点不顺', '还好吧？'],
    positive: ['可以啊', '不错呀', '挺好的'],
    neutral: ['嗯嗯', '在的', '收到'],
  },
  cores: {
    comfort: ['要不你说说，我帮你参谋参谋', '别自己憋着，聊聊呗'],
    care: ['你先说说，我听着呢', '需要我帮什么忙就说'],
    apology: ['行，这次算我疏忽了', '是我没考虑周到，下次注意'],
    explanation: ['我给你说下当时的情况', '不是你想的那样，我解释一下'],
    question: ['你具体怎么想的？', '你打算怎么办？'],
    reassurance: ['放心，这事我记着呢', '答应你的事我肯定办'],
    default: ['行，听你的', '那我按你说的来', '嗯嗯，知道了'],
  },
  closers: {
    solution: ['需要我搭把手就说一声', '有事随时找我'],
    emotion: ['想说就说说，我听着', '先别想太多，顾好自己'],
    default: ['那先这样？', '回头再聊', '好，就这样'],
  },
}

/** 嫉恶如仇：冷淡、有界限、不讨好，对讨厌的人点破问题 */
const HOSTILE_VOICE: ModeVoice = {
  openers: {
    negative: ['又来这套？', '有话直说吧', '你这样，我就直说了'],
    positive: ['哦，是吗', '行吧'],
    neutral: ['说事吧', '有事说事'],
  },
  cores: {
    comfort: ['这个我共情不了', '这事我不想接'],
    apology: ['别，这话我受不起', '道歉就不必了，我记性好'],
    explanation: ['不用解释，你的意思我明白', '解释就免了，我看的是行为'],
    question: ['你自己觉得这样说得过去？', '你觉得合适吗？'],
    default: ['不用绕，直接说', '我知道你什么意思', '就这样吧，没什么好聊的'],
  },
  closers: {
    solution: ['你自己看着办', '别把我算进去', '这事我不参与'],
    emotion: ['行，我收到了', '明白了'],
    default: ['就这样', '不聊了', '到这儿吧'],
  },
}

/** 忍无可忍：把不满和底线直接说出来，语气严厉但不辱骂 */
const ANGRY_VOICE: ModeVoice = {
  openers: {
    negative: ['我真是受够了', '这话我忍很久了', '你能不能讲点道理'],
    positive: ['随你吧，我懒得管了', '行，你开心就好'],
    neutral: ['我现在没心情跟你绕', '那今天就把话说清楚'],
  },
  cores: {
    comfort: ['别指望我再哄你', '这次我不打算惯着了'],
    apology: ['该道歉的是你吧', '你先想想自己做了什么'],
    explanation: ['我不解释了，解释多少次都一样', '该说的我早说过了'],
    question: ['你扪心自问一下，这样合适吗？', '你到底想怎么样？'],
    default: ['别再来这一套了', '这是我的底线，你听清楚', '我话就说到这儿'],
  },
  closers: {
    solution: ['你自己想清楚再来找我', '这事必须有个说法'],
    emotion: ['我不想再说了', '你冷静完再说吧'],
    default: ['就这样', '我不奉陪了', '先这样吧'],
  },
}

const MODE_VOICES: Partial<Record<CommunicationStrategyType, ModeVoice>> = {
  normal_friend: FRIEND_VOICE,
  righteous_anger: HOSTILE_VOICE,
  no_more_patience: ANGRY_VOICE,
}

function polarityOf(emotion: string): Polarity {
  if (NEGATIVE_EMOTIONS.has(emotion)) return 'negative'
  if (POSITIVE_EMOTIONS.has(emotion)) return 'positive'
  return 'neutral'
}

function closerGroupOf(intent: string): CloserGroup {
  if (SOLUTION_INTENTS.has(intent)) return 'solution'
  if (EMOTION_INTENTS.has(intent)) return 'emotion'
  return 'default'
}

interface VoicePools {
  openers: string[]
  cores: string[]
  closers: string[]
  /** 是否允许"～"这类软化装饰 */
  soft: boolean
}

function pickPools(
  strategy: ReplyStrategy,
  emotion: EmotionAnalysis,
): VoicePools {
  const voice = MODE_VOICES[strategy.communicationStrategy]
  if (!voice) {
    return {
      openers: OPENERS[emotion.emotion] ?? OPENERS.平静,
      cores: CORES[strategy.primary] ?? CORES.normal_reply,
      closers: CLOSERS[emotion.intent] ?? CLOSERS.主动分享,
      soft: true,
    }
  }
  return {
    openers: voice.openers[polarityOf(emotion.emotion)],
    cores: voice.cores[strategy.primary] ?? voice.cores.default,
    closers: voice.closers[closerGroupOf(emotion.intent)],
    soft: false,
  }
}

function rotate<T>(items: T[], offset: number): T[] {
  if (items.length === 0) return items
  const index = ((offset % items.length) + items.length) % items.length
  return [...items.slice(index), ...items.slice(0, index)]
}

function pick(list: string[] | undefined, offset: number): string {
  if (!list || list.length === 0) return ''
  return rotate(list, offset)[0]
}

function decoration(emojiUsage: string, variant: number): string {
  if (emojiUsage === 'high') return variant % 2 === 0 ? '～' : ''
  if (emojiUsage === 'medium') return variant % 3 === 0 ? '～' : ''
  return ''
}

function joinParts(parts: string[], style: string): string {
  const filtered = parts.map((part) => part.trim()).filter(Boolean)
  if (filtered.length === 0) return EMPTY_FALLBACK
  const joined = filtered.reduce((acc, part) => {
    if (!acc) return part
    return /[。！？～]$/.test(acc) ? `${acc}${part}` : `${acc}，${part}`
  }, '')
  const chars = joined.replace(/[，。！？～\s]/g, '').length
  if (style === 'short' && chars > 46 && filtered.length > 1) {
    return `${filtered[0]}。`
  }
  if (style === 'medium' && filtered.length > 2) {
    return `${filtered.slice(0, 2).join('，')}。`
  }
  const endsWithPunctuation = /[。！？～]$/.test(joined)
  return endsWithPunctuation ? joined : `${joined}。`
}

/**
 * 本地回复合成器（未配置 LLM 时使用）。
 * 仍然由 JEV 的情绪/策略决策驱动，只是表达用模板组合完成。
 */
export function composeReplies(input: ComposerInput): ReplySuggestion[] {
  const { emotion, strategy, context, variant } = input
  const pools = pickPools(strategy, emotion)
  const closerPool = pools.closers
  const style = context.userCommunicationStyle.messageLength
  const emoji = pools.soft ? context.userCommunicationStyle.emojiUsage : 'low'

  const openers = rotate(pools.openers, variant * 2)
  const cores = rotate(pools.cores, variant)
  const closers = rotate(closerPool, variant * 3)

  const drafts: string[] = [
    joinParts([openers[0], cores[0], closers[0]], style),
    joinParts([cores[1] ?? cores[0], closers[1] ?? ''], 'short'),
    joinParts([openers[1] ?? '', cores[2] ?? cores[0], closers[2] ?? ''], style),
  ]

  const seen = new Set<string>()
  const unique = drafts.filter((draft) => {
    if (seen.has(draft)) return false
    seen.add(draft)
    return true
  })

  return unique.slice(0, input.count).map((content, index) => {
    const base = content.replace(/[。～]+$/, '')
    const suffix = decoration(emoji, index + variant) || (/[！？]$/.test(base) ? '' : '。')
    return {
      content: base ? `${base}${suffix}` : EMPTY_FALLBACK,
      strategy: [...strategy.directives.slice(0, 3), ...strategy.avoid.slice(0, 2)],
      confidence: Math.max(0.35, Math.min(0.8, strategy.confidence - index * 0.08)),
      source: 'composer' as const,
    }
  })
}

export type { ComposerInput }