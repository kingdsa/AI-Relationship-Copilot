import type { Message } from '../../types/message.js'
import { renderScreenshot } from './screenshot.js'
import {
  DomLocateError,
  VisualLocateError,
  type ActionStep,
  type BrowserAgent,
  type ElementRef,
  type PageState,
} from './page-observer.js'

/**
 * 模拟浏览器 Agent：把前端聊天框当作"聊天页面"。
 * 方法与真实 JEV 浏览器自动化一一对应（observe / screenshot / extract / type / click），
 * 后续替换实现即可接入真实页面。
 */
export class SimulatorBrowserAgent implements BrowserAgent {
  async observe(messages: Message[]): Promise<PageState> {
    return {
      url: 'https://chat.example.com/wechat',
      title: '微信 · 和她',
      observedAt: Date.now(),
      input: {
        selector: '#chat-input textarea',
        label: '聊天输入框',
        description: '页面底部的消息输入区域',
      },
      sendButton: {
        selector: '#chat-input button.send',
        label: '发送按钮',
        description: '输入框右侧的发送按钮',
      },
      messageContainer: {
        selector: '#message-list .bubble',
        label: '消息列表',
        description: '当前会话的消息容器',
      },
      visibleMessageCount: messages.length,
    }
  }

  async getScreenshot(messages: Message[]): Promise<string> {
    return renderScreenshot(messages)
  }

  async extractMessages(messages: Message[]): Promise<Message[]> {
    return messages
  }

  async findInput(
    page: PageState,
    options?: { simulateDomFailure?: boolean },
  ): Promise<ElementRef> {
    if (options?.simulateDomFailure) {
      throw new DomLocateError(`DOM 定位失败：未找到 ${page.input.selector}`)
    }
    return page.input
  }

  async typeText(element: ElementRef, text: string): Promise<ActionStep> {
    if (!text.trim()) {
      return {
        at: Date.now(),
        step: '输入文本',
        detail: '文本为空，已跳过',
        ok: false,
      }
    }
    return {
      at: Date.now(),
      step: '输入文本',
      detail: `在「${element.label}」输入：${text.slice(0, 60)}${text.length > 60 ? '…' : ''}`,
      ok: true,
    }
  }

  async click(element: ElementRef): Promise<ActionStep> {
    return {
      at: Date.now(),
      step: '点击发送',
      detail: `点击「${element.label}」（${element.selector}）`,
      ok: true,
    }
  }
}

export { DomLocateError, VisualLocateError }
export type { ActionStep, BrowserAgent, ElementRef, PageState }