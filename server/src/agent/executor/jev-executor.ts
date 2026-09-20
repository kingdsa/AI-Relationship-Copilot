import type { Message } from '../../types/message.js'
import {
  DomLocateError,
  type ActionStep,
  type BrowserAgent,
  type PageState,
} from '../observer/page-observer.js'

export interface SendResult {
  ok: boolean
  steps: ActionStep[]
  page: PageState
  screenshot: string
  usedVisualFallback: boolean
  error?: string
}

/**
 * JEV Executor（PRD §22）：
 * 定位输入框 → 输入文本 → 定位发送按钮 → 点击发送。
 * DOM 定位失败时降级为截图 + 视觉定位（此处模拟该兜底路径）。
 */
export class JevExecutor {
  constructor(private readonly agent: BrowserAgent) {}

  async send(
    text: string,
    messages: Message[],
    options: { simulateDomFailure?: boolean } = {},
  ): Promise<SendResult> {
    const steps: ActionStep[] = []
    const page = await this.agent.observe(messages)
    steps.push({
      at: Date.now(),
      step: '观察页面',
      detail: `Observe：${page.title}，可见 ${page.visibleMessageCount} 条消息`,
      ok: true,
    })

    const extracted = await this.agent.extractMessages(messages)
    steps.push({
      at: Date.now(),
      step: '提取聊天记录',
      detail: `Extract：共 ${extracted.length} 条消息（对方 ${extracted.filter((m) => m.role === 'other').length} 条）`,
      ok: true,
    })

    let usedVisualFallback = false
    let input = page.input
    try {
      input = await this.agent.findInput(page, options)
      steps.push({
        at: Date.now(),
        step: '定位输入框',
        detail: `DOM 定位成功：${input.selector}`,
        ok: true,
      })
    } catch (error) {
      if (!(error instanceof DomLocateError)) throw error
      usedVisualFallback = true
      steps.push({
        at: Date.now(),
        step: 'DOM 定位失败',
        detail: error.message,
        ok: false,
      })
      steps.push({
        at: Date.now(),
        step: '获取页面截图',
        detail: 'Screenshot：截取当前聊天页面用于视觉定位',
        ok: true,
      })
      steps.push({
        at: Date.now(),
        step: '视觉定位输入框',
        detail: `JEV 视觉定位成功：${input.description}`,
        ok: true,
      })
    }

    const typed = await this.agent.typeText(input, text)
    steps.push(typed)

    const clicked = await this.agent.click(page.sendButton)
    steps.push(clicked)

    const screenshot = await this.agent.getScreenshot([
      ...messages,
      {
        id: 'outgoing',
        role: 'user',
        content: text,
        timestamp: Date.now(),
      },
    ])

    return {
      ok: typed.ok && clicked.ok,
      steps,
      page,
      screenshot,
      usedVisualFallback,
    }
  }
}