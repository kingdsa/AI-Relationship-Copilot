import { Router } from 'express'
import type { NextFunction, Request, Response } from 'express'
import { randomUUID } from 'node:crypto'
import {
  generateReplies,
  getBrowserAgent,
  getExecutor,
  runAnalysis,
} from '../agent/pipeline.js'
import { sanitizeProfile } from '../agent/context/profile.js'
import { credentialsFromRequest, jevReady, llmReady } from '../ai/credentials.js'
import type { Attachment, Message } from '../types/message.js'

/**
 * 服务端尽量无状态：
 * - 凭据来自请求头（前端 localStorage）
 * - 沟通风格 / 关系记忆 / 情绪时间线来自请求体（前端 localStorage）
 * 服务端只计算并返回结果，不保存任何使用者数据。
 */
export const api = Router()

/** Express 4 不会捕获 async 抛错，统一转发给错误中间件，避免进程退出 */
function handle(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next)
  }
}

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

api.get('/health', (req: Request, res: Response) => {
  const credentials = credentialsFromRequest(req)
  res.json({
    ok: true,
    jev: { configured: jevReady(credentials), model: credentials.jev.model },
    llm: {
      configured: llmReady(credentials),
      model: credentials.llm.model || null,
    },
  })
})

api.post('/observe', handle(async (req: Request, res: Response) => {
  const messages = sanitizeMessages(req.body?.messages)
  const agent = getBrowserAgent()
  const [page, screenshot, extracted] = await Promise.all([
    agent.observe(messages),
    agent.getScreenshot(messages),
    agent.extractMessages(messages),
  ])
  res.json({ page, screenshot, extracted })
}))

api.post('/analyze', handle(async (req: Request, res: Response) => {
  const messages = sanitizeMessages(req.body?.messages)
  if (messages.length === 0) {
    res.status(422).json({ error: 'messages 不能为空' })
    return
  }
  const credentials = credentialsFromRequest(req)
  if (!jevReady(credentials)) {
    res.status(409).json({ error: '尚未配置 JEV API Key，请点击右上角「设置」手动输入后再试' })
    return
  }
  const profile = sanitizeProfile(req.body?.profile)
  const bundle = await runAnalysis(messages, credentials, profile)
  res.json({
    emotion: bundle.emotion,
    strategy: bundle.strategy,
    risk: bundle.risk,
    jevModel: bundle.jevModel,
    timings: bundle.timings,
    historyId: bundle.historyId,
    historyRecord: bundle.historyRecord,
    relationshipMemory: bundle.relationshipMemory,
  })
}))

api.post('/reply', handle(async (req: Request, res: Response) => {
  const messages = sanitizeMessages(req.body?.messages)
  if (messages.length === 0) {
    res.status(422).json({ error: 'messages 不能为空' })
    return
  }
  const credentials = credentialsFromRequest(req)
  if (!jevReady(credentials)) {
    res.status(409).json({ error: '尚未配置 JEV API Key，请点击右上角「设置」手动输入后再试' })
    return
  }
  const variant = parseIntParam(req.body?.variant, 0, 0, 20)
  const count = parseIntParam(req.body?.count, 3, 1, 3)
  const profile = sanitizeProfile(req.body?.profile)
  const bundle = await runAnalysis(messages, credentials, profile)
  const result = await generateReplies(bundle, { variant, count }, credentials)
  res.json({
    ...result,
    historyId: bundle.historyId,
    historyRecord: bundle.historyRecord,
    relationshipMemory: bundle.relationshipMemory,
  })
}))

api.post('/send', handle(async (req: Request, res: Response) => {
  const messages = sanitizeMessages(req.body?.messages)
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : ''
  if (!text) {
    res.status(422).json({ error: 'text 不能为空' })
    return
  }
  const result = await getExecutor().send(text, messages, {
    simulateDomFailure: Boolean(req.body?.simulateDomFailure),
  })
  res.json(result)
}))