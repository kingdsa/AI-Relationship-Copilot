import { JevClient, JevError } from '../ai/client/jev-client.js'
import { LlmClient } from '../ai/client/llm-client.js'
import { settingsStore } from '../memory/user-profile.js'
import type { Message } from '../types/message.js'
import type { EmotionAnalysis } from '../types/emotion.js'
import type { ConversationContext, PipelineResult } from '../types/index.js'
import type { ReplyStrategy, RiskAssessment } from '../types/strategy.js'
import { buildContext } from './context/context-builder.js'
import { recordAnalysis } from './context/memory-builder.js'
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
}

interface CachedEntry {
  signature: string
  bundle: AnalysisBundle
}

const MAX_CACHE = 20
const analysisCache: CachedEntry[] = []

const browserAgent = new SimulatorBrowserAgent()
const executor = new JevExecutor(browserAgent)

/**
 * JEV 客户端按当前设置即时构建：API Key 由用户在界面手动输入，
 * 保存于 data/settings.json，不从代码或前端回显。
 */
async function makeJevClient(): Promise<JevClient> {
  const settings = await settingsStore.get()
  return new JevClient({
    apiKey: settings.jev.apiKey,
    baseUrl: settings.jev.baseUrl,
    model: settings.jev.model,
  })
}

async function makeReplyGenerator(): Promise<ReplyGenerator> {
  const settings = await settingsStore.get()
  const llm = settings.llm.apiKey
    ? new LlmClient({
        baseUrl: settings.llm.baseUrl,
        apiKey: settings.llm.apiKey,
        model: settings.llm.model,
        vision: settings.llm.vision,
      })
    : null
  return new ReplyGenerator(llm?.configured ? llm : null)
}

export function invalidateAnalysisCache(): void {
  analysisCache.length = 0
}

function signatureOf(messages: Message[]): string {
  const last = messages[messages.length - 1]
  return `${messages.length}:${last?.role ?? ''}:${last?.content ?? ''}`
}

export async function runAnalysis(messages: Message[]): Promise<AnalysisBundle> {
  const signature = signatureOf(messages)
  const cached = analysisCache.find((entry) => entry.signature === signature)
  if (cached) return cached.bundle

  const jev = await makeJevClient()
  if (!jev.configured) {
    throw new JevError('尚未配置 JEV API Key，请点击右上角「设置」手动输入')
  }
  const emotionEngine = new EmotionEngine(jev)
  const strategyEngine = new StrategyEngine(jev)

  const timings: Record<string, number> = {}
  const t0 = Date.now()
  const context = await buildContext(messages)
  timings.context = Date.now() - t0

  const t1 = Date.now()
  const [emotionResult, strategyRaw] = await Promise.all([
    emotionEngine.analyze(context),
    strategyEngine.ask(context),
  ])
  timings.jev = Date.now() - t1

  const emotion = emotionResult.analysis
  const strategy = composeStrategy(strategyRaw, emotion)
  const risk = assessRisk(strategyRaw, emotion.confidence)

  const t2 = Date.now()
  const record = await recordAnalysis({
    incoming: context.currentMessage?.content ?? '',
    memoryText: context.recentMessages
      .filter((m) => m.role === 'other')
      .slice(-2)
      .map((m) => m.content)
      .join('\n'),
    emotion,
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
  }

  analysisCache.push({ signature, bundle })
  if (analysisCache.length > MAX_CACHE) analysisCache.shift()
  return bundle
}

export interface GenerateRepliesOptions {
  variant: number
  count: number
}

export async function generateReplies(
  bundle: AnalysisBundle,
  options: GenerateRepliesOptions,
): Promise<PipelineResult & { warning?: string }> {
  const generator = await makeReplyGenerator()
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

export async function jevStatus(): Promise<{
  configured: boolean
  model: string
}> {
  const settings = await settingsStore.get()
  return {
    configured: Boolean(settings.jev.apiKey && settings.jev.baseUrl),
    model: settings.jev.model,
  }
}

export async function llmStatus(): Promise<{ configured: boolean; model: string | null }> {
  const generator = await makeReplyGenerator()
  return { configured: generator.llmConfigured, model: generator.llmModel }
}

export type { PipelineResult }