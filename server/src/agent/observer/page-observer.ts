import type { Message } from '../../types/message.js'

export interface ElementRef {
  selector: string
  label: string
  description: string
}

export interface PageState {
  url: string
  title: string
  observedAt: number
  input: ElementRef
  sendButton: ElementRef
  messageContainer: ElementRef
  visibleMessageCount: number
}

export interface ActionStep {
  at: number
  step: string
  detail: string
  ok: boolean
}

/**
 * JEV 层抽象（PRD §34）：业务代码只依赖这个接口。
 * 当前使用模拟实现（SimulatorBrowserAgent），
 * 将来接入真实 JEV 浏览器自动化时只需替换实现。
 */
export interface BrowserAgent {
  observe(messages: Message[]): Promise<PageState>
  getScreenshot(messages: Message[]): Promise<string>
  extractMessages(messages: Message[]): Promise<Message[]>
  findInput(page: PageState, options?: { simulateDomFailure?: boolean }): Promise<ElementRef>
  typeText(element: ElementRef, text: string): Promise<ActionStep>
  click(element: ElementRef): Promise<ActionStep>
}

export class DomLocateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DomLocateError'
  }
}

export class VisualLocateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'VisualLocateError'
  }
}