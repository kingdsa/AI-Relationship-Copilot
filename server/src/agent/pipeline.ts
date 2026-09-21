import { createHash } from 'node:crypto'
import { JevClient, JevError } from '../ai/client/jev-client.js'
import { LlmClient } from '../ai/client/llm-client.js'
import type { Credentials } from '../ai/credentials.js'
import type { Message } from '../types/message.js'
import type { EmotionAnalysis } from '../types/emotion.js'
import type {
  ConversationContext,
  HistoryRecord,
  PipelineResult,
  RelationshipMemory,
} from '../types/index.js'
import type { ReplyStrategy, RiskAssessment } from '../types/strategy.js'
import { buildContext } from './context/context-builder.js'
import { buildHistoryRecord } from './context/memory-builder.js'
import type { UserProfile } from './context/profile.js'
import { EmotionEngine } from './emotion/emotion-engine.js'
import { StrategyEngine, composeStrategy } from './strategy/strategy-engine.js'
import { assessRisk } from './strategy/risk-control.js'
import { ReplyGenerator } from './reply/reply-generator.js'
import { SimulatorBrowserAgent } from './observer/simulator-agent.js'
import { JevExecutor } from './executor/jev-executor.js'

export interface AnalysisBundle {
  context: ConversationContext
  emotion: EmotionAnalysis
  strategy: ReplyStrategy
  risk: RiskAssessment
  jevModel: string
  timings: Record<string, number>
  historyId: string
  /** 供前端写入自己的 localStorage */
  historyRecord: HistoryRecord
  relationshipMemory: RelationshipMemory
}

interface CachedEntry {
  /** 同一份分析会同时登记"请求前画像"与"记忆合并后画像"两种签名，便于随后的 reply 命中 */
  signatures: string[]
  bundle: AnalysisBundle
}

const MAX_CACHE = 40
const analysisCache: CachedEntry[] = []

const browserAgent = new SimulatorBrowserAgent()
const executor = new JevExecutor(browserAgent)

/**
 * JEV / LLM 客户端按请求即时构建：凭据由调用方通过请求头传入（前端 localStorage），
 * 服务端不保存密钥，多人共用时各用各的 Key 与 Base URL。
 */
function makeJevClient(credentials: Credentials): JevClient {
  return new JevClient({
    apiKey: credentials.jev.apiKey,
    baseUrl: credentials.jev.baseUrl,
    model: credentials.jev.model,
  })
}

function makeReplyGenerator(credentials: Credentials): ReplyGenerator {
  const llm = credentials.llm.apiKey
    ? new LlmClient({
        baseUrl: credentials.llm.baseUrl,
        apiKey: credentials.llm.apiKey,
        model: credentials.llm.model,
        vision: credentials.llm.vision,
      })
    : null
  return new ReplyGenerator(llm?.configured ? llm : null)
}

/**
 * 缓存指纹：密钥 + 画像（风格/记忆）一起参与，避免不同使用者
 * 或不同记忆状态互相命中缓存。
 */
function fingerprint(credentials: Credentials, profile: UserProfile): string {
  return createHash('sha256')
    .update(
      [
        credentials.jev.baseUrl,
        credentials.jev.model,
        credentials.jev.apiKey,
        JSON.stringify(profile),
      ].join('\n'),
    )
    .digest('hex')
    .slice(0, 16)
}

function signatureOf(messages: Message[], credentials: Credentials, profile: UserProfile): string {
  const last = messages[messages.length - 1]
  return `${fingerprint(credentials, profile)}:${messages.length}:${last?.role ?? ''}:${last?.content ?? ''}`
}

function findCached(signature: string): AnalysisBundle | null {
  for (let index = analysisCache.length - 1; index >= 0; index -= 1) {
    if (analysisCache[index].signatures.includes(signature)) return analysisCache[index].bundle
  }
  return null
}

function remember(signatures: string[], bundle: AnalysisBundle): void {
  analysisCache.push({ signatures: Array.from(new Set(signatures)), bundle })
  while (analysisCache.length > MAX_CACHE) analysisCache.shift()
}

export async function runAnalysis(
  messages: Message[],
  credentials: Credentials,
  profile: UserProfile,
): Promise<AnalysisBundle> {
  const signature = signatureOf(messages, credentials, profile)
  const cached = findCached(signature)
  if (cached) return cached

  const jev = makeJevClient(credentials)
  if (!jev.configured) {
    throw new JevError('尚未配置 JEV API Key，请点击右上角「设置」手动输入')
  }
  const emotionEngine = new EmotionEngine(jev)
  const strategyEngine = new StrategyEngine(jev)

  const timings: Record<string, number> = {}
  const t0 = Date.now()
  const context = buildContext(messages, profile)
  timings.context = Date.now() - t0

  const t1 = Date.now()
  const [emotionResult, strategyRaw] = await Promise.all([
    emotionEngine.analyze(context),
    strategyEngine.ask(context),
  ])
  timings.jev = Date.now() - t1

  const emotion = emotionResult.analysis
  const strategy = composeStrategy(strategyRaw, emotion, profile.communicationStrategy)
  const risk = assessRisk(strategyRaw, emotion.confidence, profile.communicationStrategy)

  const t2 = Date.now()
  const { record, memory } = buildHistoryRecord({
    incoming: context.currentMessage?.content ?? '',
    memoryText: context.recentMessages
      .filter((m) => m.role === 'other')
      .slice(-2)
      .map((m) => m.content)
      .join('\n'),
    emotion,
    memory: profile.relationshipMemory,
  })
  timings.memory = Date.now() - t2

  const bundle: AnalysisBundle = {
    context,
    emotion,
    strategy,
    risk,
    jevModel: emotionResult.raw.model,
    timings,
    historyId: record.id,
    historyRecord: record,
    relationshipMemory: memory,
  }

  const mergedProfile: UserProfile = { ...profile, relationshipMemory: memory }
  remember([signature, signatureOf(messages, credentials, mergedProfile)], bundle)
  return bundle
}

export interface GenerateRepliesOptions {
  variant: number
  count: number
}

export async function generateReplies(
  bundle: AnalysisBundle,
  options: GenerateRepliesOptions,
  credentials: Credentials,
): Promise<PipelineResult & { warning?: string }> {
  const generator = makeReplyGenerator(credentials)
  const t0 = Date.now()
  const output = await generator.generate(
    bundle.context,
    bundle.emotion,
    bundle.strategy,
    options,
  )
  const timings = { ...bundle.timings, reply: Date.now() - t0 }

  return {
    emotion: bundle.emotion,
    strategy: bundle.strategy,
    risk: bundle.risk,
    replies: output.replies,
    replySource: output.source,
    jevModel: bundle.jevModel,
    timings,
    warning: output.warning,
  }
}

export function getExecutor(): JevExecutor {
  return executor
}

export function getBrowserAgent(): SimulatorBrowserAgent {
  return browserAgent
}

export type { PipelineResult }