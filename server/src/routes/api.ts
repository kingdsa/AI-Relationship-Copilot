import { Router } from 'express'
import type { Request, Response } from 'express'
import { randomUUID } from 'node:crypto'
import {
  generateReplies,
  getBrowserAgent,
  getExecutor,
  invalidateAnalysisCache,
  jevStatus,
  llmStatus,
  runAnalysis,
} from '../agent/pipeline.js'
import { conversationHistory } from '../memory/conversation-history.js'
import { relationshipMemory } from '../memory/relationship-memory.js'
import { settingsStore } from '../memory/user-profile.js'
import type { Attachment, Message } from '../types/message.js'

export const api = Router()

function sanitizeMessages(input: unknown): Message[] {
  if (!Array.isArray(input)) return []
  return input
    .filter((m): m is Record<string, unknown> => Boolean(m) && typeof m === 'object')
    .map<Message>((m) => {
      const attachments = Array.isArray(m.attachments)
        ? (m.attachments as Array<Record<string, unknown>>)
            .slice(0, 3)
            .map<Attachment>((a) => ({
              id: typeof a.id === 'string' ? a.id : randomUUID(),
              type: (a.type === 'image' || a.type === 'emoji' ? a.type : 'image') as Attachment['type'],
              url: typeof a.url === 'string' ? a.url : undefined,
              description: typeof a.description === 'string' ? a.description : '图片附件',
            }))
        : undefined
      return {
        id: typeof m.id === 'string' ? m.id : randomUUID(),
        role: m.role === 'user' ? 'user' : 'other',
        content: typeof m.content === 'string' ? m.content.slice(0, 2000) : '',
        timestamp: typeof m.timestamp === 'number' ? m.timestamp : Date.now(),
        attachments,
      }
    })
    .filter((m) => m.content.trim().length > 0 || (m.attachments?.length ?? 0) > 0)
    .slice(-60)
}

function parseIntParam(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.round(parsed)))
}

api.get('/health', async (_req: Request, res: Response) => {
  const [llm, jev] = await Promise.all([llmStatus(), jevStatus()])
  res.json({
    ok: true,
    jev,
    llm,
  })
})

api.get('/state', async (_req: Request, res: Response) => {
  const [memory, settings, history, llm, jev] = await Promise.all([
    relationshipMemory.get(),
    settingsStore.getPublic(),
    conversationHistory.list(50),
    llmStatus(),
    jevStatus(),
  ])
  res.json({
    memory,
    settings,
    history,
    jev,
    llm,
  })
})

api.put('/settings', async (req: Request, res: Response) => {
  const body = req.body ?? {}
  const patch: Parameters<typeof settingsStore.update>[0] = {}

  if (body.userCommunicationStyle && typeof body.userCommunicationStyle === 'object') {
    patch.userCommunicationStyle = body.userCommunicationStyle
  }
  if (body.otherCommunicationStyle && typeof body.otherCommunicationStyle === 'object') {
    patch.otherCommunicationStyle = body.otherCommunicationStyle
  }
  if (typeof body.autoAnalyze === 'boolean') {
    patch.autoAnalyze = body.autoAnalyze
  }
  if (typeof body.clearLlm === 'boolean') {
    patch.clearLlm = body.clearLlm
  }
  if (typeof body.clearJev === 'boolean') {
    patch.clearJev = body.clearJev
  }
  if (body.jev && typeof body.jev === 'object') {
    const jev = body.jev as Record<string, unknown>
    patch.jev = {
      baseUrl: typeof jev.baseUrl === 'string' ? jev.baseUrl.trim() : '',
      // 前端提交空字符串表示不修改已保存的 key
      apiKey: typeof jev.apiKey === 'string' ? jev.apiKey.trim() : '',
      model: typeof jev.model === 'string' ? jev.model.trim() : '',
    }
  }
  if (body.llm && typeof body.llm === 'object') {
    const llm = body.llm as Record<string, unknown>
    patch.llm = {
      baseUrl: typeof llm.baseUrl === 'string' ? llm.baseUrl.trim() : '',
      // 前端提交空字符串表示不修改已保存的 key
      apiKey: typeof llm.apiKey === 'string' ? llm.apiKey.trim() : '',
      model: typeof llm.model === 'string' ? llm.model.trim() : '',
      vision: Boolean(llm.vision),
    }
  }

  await settingsStore.update(patch)

  if (body.relationshipMemory && typeof body.relationshipMemory === 'object') {
    await relationshipMemory.update(body.relationshipMemory)
  }

  invalidateAnalysisCache()
  res.json({ ok: true })
})

api.post('/observe', async (req: Request, res: Response) => {
  const messages = sanitizeMessages(req.body?.messages)
  const agent = getBrowserAgent()
  const [page, screenshot, extracted] = await Promise.all([
    agent.observe(messages),
    agent.getScreenshot(messages),
    agent.extractMessages(messages),
  ])
  res.json({ page, screenshot, extracted })
})

api.post('/analyze', async (req: Request, res: Response) => {
  const messages = sanitizeMessages(req.body?.messages)
  if (messages.length === 0) {
    res.status(422).json({ error: 'messages 不能为空' })
    return
  }
  const jev = await jevStatus()
  if (!jev.configured) {
    res.status(409).json({ error: '尚未配置 JEV API Key，请点击右上角「设置」手动输入后再试' })
    return
  }
  const bundle = await runAnalysis(messages)
  res.json({
    emotion: bundle.emotion,
    strategy: bundle.strategy,
    risk: bundle.risk,
    jevModel: bundle.jevModel,
    timings: bundle.timings,
    historyId: bundle.historyId,
  })
})

api.post('/reply', async (req: Request, res: Response) => {
  const messages = sanitizeMessages(req.body?.messages)
  if (messages.length === 0) {
    res.status(422).json({ error: 'messages 不能为空' })
    return
  }
  const jev = await jevStatus()
  if (!jev.configured) {
    res.status(409).json({ error: '尚未配置 JEV API Key，请点击右上角「设置」手动输入后再试' })
    return
  }
  const variant = parseIntParam(req.body?.variant, 0, 0, 20)
  const count = parseIntParam(req.body?.count, 3, 1, 3)
  const bundle = await runAnalysis(messages)
  const result = await generateReplies(bundle, { variant, count })
  res.json(result)
})

api.post('/send', async (req: Request, res: Response) => {
  const messages = sanitizeMessages(req.body?.messages)
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : ''
  if (!text) {
    res.status(422).json({ error: 'text 不能为空' })
    return
  }
  const result = await getExecutor().send(text, messages, {
    simulateDomFailure: Boolean(req.body?.simulateDomFailure),
  })
  await conversationHistory.attachReply(String(req.body?.historyId ?? ''), text)
  res.json(result)
})

api.post('/reset-conversation', async (_req: Request, res: Response) => {
  await conversationHistory.clear()
  res.json({ ok: true })
})

api.post('/memory', async (req: Request, res: Response) => {
  const patch = req.body && typeof req.body === 'object' ? req.body : {}
  const memory = await relationshipMemory.update(patch)
  invalidateAnalysisCache()
  res.json({ ok: true, memory })
})