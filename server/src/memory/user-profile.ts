import path from 'node:path'
import { config } from '../config.js'
import type { CommunicationStyle } from '../types/index.js'
import { JsonStore } from './store.js'

export interface PersistedSettings {
  userCommunicationStyle: CommunicationStyle
  otherCommunicationStyle: CommunicationStyle
  /** JEV（TypeSafe System One）：必须由用户在界面手动输入 API Key */
  jev: { baseUrl: string; apiKey: string; model: string }
  llm: { baseUrl: string; apiKey: string; model: string; vision: boolean }
  autoAnalyze: boolean
}

const defaultUserStyle: CommunicationStyle = {
  personality: '直白',
  tone: '自然',
  humor: 'medium',
  emojiUsage: 'low',
  messageLength: 'short',
  preferredStyle: 'natural',
}

const defaultOtherStyle: CommunicationStyle = {
  personality: '细腻',
  tone: '自然',
  humor: 'medium',
  emojiUsage: 'medium',
  messageLength: 'short',
  preferredStyle: 'gentle',
}

const store = new JsonStore<PersistedSettings>(path.join(config.dataDir, 'settings.json'), {
  userCommunicationStyle: defaultUserStyle,
  otherCommunicationStyle: defaultOtherStyle,
  jev: { ...config.jevFromEnv },
  llm: { ...config.llmFromEnv, vision: false },
  autoAnalyze: true,
})

export interface SettingsPatch extends Partial<PersistedSettings> {
  /** 清空已保存的 LLM 配置 */
  clearLlm?: boolean
  /** 清空已保存的 JEV 配置 */
  clearJev?: boolean
}

function mergeSecret(
  current: { baseUrl: string; apiKey: string; model: string },
  patch: Partial<{ baseUrl: string; apiKey: string; model: string }> | undefined,
  clear: boolean | undefined,
): { baseUrl: string; apiKey: string; model: string } {
  if (clear) return { baseUrl: '', apiKey: '', model: '' }
  const next = { ...current, ...patch }
  // 空字符串表示"不修改已保存的 key"（前端不回显明文密钥）
  if (patch && patch.apiKey === '') next.apiKey = current.apiKey
  return next
}

export const settingsStore = {
  async get(): Promise<PersistedSettings> {
    const settings = await store.read()
    return {
      ...settings,
      userCommunicationStyle: { ...defaultUserStyle, ...settings.userCommunicationStyle },
      otherCommunicationStyle: {
        ...defaultOtherStyle,
        ...settings.otherCommunicationStyle,
      },
      jev: {
        baseUrl: settings.jev.baseUrl || config.jevFromEnv.baseUrl,
        // JEV Key 只认手动输入/保存的值，环境变量仅作为可选回退
        apiKey: settings.jev.apiKey || config.jevFromEnv.apiKey,
        model: settings.jev.model || config.jevFromEnv.model,
      },
      llm: {
        baseUrl: settings.llm.baseUrl || config.llmFromEnv.baseUrl,
        apiKey: settings.llm.apiKey || config.llmFromEnv.apiKey,
        model: settings.llm.model || config.llmFromEnv.model,
        vision: settings.llm.vision,
      },
    }
  },

  async update(patch: SettingsPatch): Promise<PersistedSettings> {
    await store.update((current) => {
      const jev = mergeSecret(current.jev, patch.jev, patch.clearJev)
      const llmBase = mergeSecret(
        {
          baseUrl: current.llm.baseUrl,
          apiKey: current.llm.apiKey,
          model: current.llm.model,
        },
        patch.llm,
        patch.clearLlm,
      )
      return {
        ...current,
        ...patch,
        userCommunicationStyle: {
          ...current.userCommunicationStyle,
          ...patch.userCommunicationStyle,
        },
        otherCommunicationStyle: {
          ...current.otherCommunicationStyle,
          ...patch.otherCommunicationStyle,
        },
        jev,
        llm: { ...llmBase, vision: patch.clearLlm ? false : (patch.llm?.vision ?? current.llm.vision) },
      }
    })
    return this.get()
  },

  /** 返回给前端时隐藏密钥 */
  async getPublic() {
    const settings = await this.get()
    return {
      ...settings,
      jev: {
        ...settings.jev,
        apiKey: settings.jev.apiKey ? '••••••••' : '',
        configured: Boolean(settings.jev.apiKey && settings.jev.baseUrl),
        fromEnv: Boolean(config.jevFromEnv.apiKey),
      },
      llm: {
        ...settings.llm,
        apiKey: settings.llm.apiKey ? '••••••••' : '',
        configured: Boolean(settings.llm.apiKey && settings.llm.baseUrl && settings.llm.model),
        fromEnv: Boolean(config.llmFromEnv.apiKey),
      },
    }
  },
}