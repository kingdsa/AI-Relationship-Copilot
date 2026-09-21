import { useEffect, useState } from 'react'
import {
  DEFAULT_JEV_BASE_URL,
  DEFAULT_JEV_MODEL,
  type Credentials,
  type JevCredentials,
  type LlmCredentials,
} from '../credentials'
import type { LocalProfile } from '../profile'
import type { CommunicationStyle, RelationshipMemory, SettingsSavePayload } from '../types'

interface SettingsDrawerProps {
  open: boolean
  profile: LocalProfile
  credentials: Credentials
  onClose: () => void
  onSave: (payload: SettingsSavePayload) => Promise<void>
}

const emptyJev = (): JevCredentials => ({
  apiKey: '',
  baseUrl: DEFAULT_JEV_BASE_URL,
  model: DEFAULT_JEV_MODEL,
})

const emptyLlm = (): LlmCredentials => ({ baseUrl: '', apiKey: '', model: '', vision: false })

const toLines = (items: string[]) => items.join('\n')
const fromLines = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

const HUMOR_OPTIONS: CommunicationStyle['humor'][] = ['low', 'medium', 'high']
const EMOJI_OPTIONS: CommunicationStyle['emojiUsage'][] = ['low', 'medium', 'high']
const LENGTH_OPTIONS: CommunicationStyle['messageLength'][] = ['short', 'medium', 'long']

function StyleFields({
  title,
  style,
  onChange,
}: {
  title: string
  style: CommunicationStyle
  onChange: (style: CommunicationStyle) => void
}) {
  return (
    <fieldset className="settings-group">
      <legend>{title}</legend>
      <label>
        性格
        <input
          value={style.personality}
          onChange={(event) => onChange({ ...style, personality: event.target.value })}
        />
      </label>
      <label>
        语气
        <input value={style.tone} onChange={(event) => onChange({ ...style, tone: event.target.value })} />
      </label>
      <div className="settings-row">
        <label>
          幽默感
          <select
            value={style.humor}
            onChange={(event) =>
              onChange({ ...style, humor: event.target.value as CommunicationStyle['humor'] })
            }
          >
            {HUMOR_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === 'low' ? '少' : option === 'medium' ? '中' : '多'}
              </option>
            ))}
          </select>
        </label>
        <label>
          表情使用
          <select
            value={style.emojiUsage}
            onChange={(event) =>
              onChange({
                ...style,
                emojiUsage: event.target.value as CommunicationStyle['emojiUsage'],
              })
            }
          >
            {EMOJI_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === 'low' ? '少' : option === 'medium' ? '中' : '多'}
              </option>
            ))}
          </select>
        </label>
        <label>
          消息长度
          <select
            value={style.messageLength}
            onChange={(event) =>
              onChange({
                ...style,
                messageLength: event.target.value as CommunicationStyle['messageLength'],
              })
            }
          >
            {LENGTH_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === 'short' ? '短' : option === 'medium' ? '中' : '长'}
              </option>
            ))}
          </select>
        </label>
      </div>
    </fieldset>
  )
}

export function SettingsDrawer({ open, profile, credentials, onClose, onSave }: SettingsDrawerProps) {
  const [userStyle, setUserStyle] = useState<CommunicationStyle | null>(null)
  const [otherStyle, setOtherStyle] = useState<CommunicationStyle | null>(null)
  const [memory, setMemory] = useState<RelationshipMemory | null>(null)
  const [jev, setJev] = useState<JevCredentials>(emptyJev)
  const [llm, setLlm] = useState<LlmCredentials>(emptyLlm)
  const [autoAnalyze, setAutoAnalyze] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setUserStyle(profile.userCommunicationStyle)
    setOtherStyle(profile.otherCommunicationStyle)
    setJev(credentials.jev)
    setLlm(credentials.llm)
    setMemory(profile.relationshipMemory)
    setAutoAnalyze(profile.autoAnalyze)
    setMessage(null)
  }, [profile, open, credentials])

  if (!open || !userStyle || !otherStyle || !memory) return null

  const jevConfigured = Boolean(jev.apiKey.trim() && jev.baseUrl.trim())
  const llmConfigured = Boolean(llm.apiKey.trim() && llm.baseUrl.trim() && llm.model.trim())

  const save = async () => {
    setSaving(true)
    setMessage(null)
    try {
      await onSave({
        credentials: {
          jev: {
            apiKey: jev.apiKey.trim(),
            baseUrl: jev.baseUrl.trim() || DEFAULT_JEV_BASE_URL,
            model: jev.model.trim() || DEFAULT_JEV_MODEL,
          },
          llm: {
            baseUrl: llm.baseUrl.trim(),
            apiKey: llm.apiKey.trim(),
            model: llm.model.trim(),
            vision: llm.vision,
          },
        },
        userCommunicationStyle: userStyle,
        otherCommunicationStyle: otherStyle,
        autoAnalyze,
        relationshipMemory: memory,
      })
      setMessage('已保存')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const clearLlm = () => {
    setLlm(emptyLlm())
    setMessage('已清空 LLM 配置，点击「保存设置」后生效')
  }

  const clearJev = () => {
    setJev(emptyJev())
    setMessage('已清空 JEV 配置，点击「保存设置」后生效')
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(event) => event.stopPropagation()}>
        <header className="drawer-header">
          <h2>⚙️ 设置</h2>
          <button className="icon-btn" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="drawer-body">
          <fieldset className="settings-group">
            <legend>JEV 决策引擎（必填，手动输入）</legend>
            <p className="settings-hint">
              JEV（TypeSafe System One）负责情绪 / 意图 / 策略决策。API Key 只保存在你自己的
              浏览器（localStorage），随请求发送，服务端不保存，多人共用时各用各的 Key。
            </p>
            <label>
              API Key
              <input
                type="password"
                placeholder="apikey_..."
                value={jev.apiKey}
                onChange={(event) => setJev({ ...jev, apiKey: event.target.value })}
              />
            </label>
            <label>
              Base URL
              <input
                placeholder="https://api.typesafe.ai/v1"
                value={jev.baseUrl}
                onChange={(event) => setJev({ ...jev, baseUrl: event.target.value })}
              />
            </label>
            <label>
              模型
              <input
                placeholder="jev-latest"
                value={jev.model}
                onChange={(event) => setJev({ ...jev, model: event.target.value })}
              />
            </label>
            <div className="settings-row">
              <span className={`chip ${jevConfigured ? 'chip-ok' : 'chip-danger'}`}>
                {jevConfigured ? `JEV 已配置 ${jev.model.trim() || DEFAULT_JEV_MODEL}` : 'JEV 未配置'}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={clearJev}>
                清除 JEV 配置
              </button>
            </div>
          </fieldset>

          <fieldset className="settings-group">
            <legend>AI 生成引擎（LLM，可选）</legend>
            <p className="settings-hint">
              JEV 负责情绪/意图/策略决策，LLM 负责把决策表达成自然语言。不配置时使用内置合成器。
              配置同样只保存在你自己的浏览器（localStorage）。
            </p>
            <label>
              Base URL
              <input
                placeholder="https://api.deepseek.com/v1"
                value={llm.baseUrl}
                onChange={(event) => setLlm({ ...llm, baseUrl: event.target.value })}
              />
            </label>
            <label>
              API Key
              <input
                type="password"
                placeholder="sk-..."
                value={llm.apiKey}
                onChange={(event) => setLlm({ ...llm, apiKey: event.target.value })}
              />
            </label>
            <label>
              模型
              <input
                placeholder="deepseek-chat / gpt-4o-mini / qwen-plus"
                value={llm.model}
                onChange={(event) => setLlm({ ...llm, model: event.target.value })}
              />
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={llm.vision}
                onChange={(event) => setLlm({ ...llm, vision: event.target.checked })}
              />
              该模型支持图片输入（多模态，会把聊天截图/图片一起发给模型）
            </label>
            <div className="settings-row">
              <span className="chip chip-muted">
                当前：{llmConfigured ? `已配置 ${llm.model.trim()}` : '未配置'}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={clearLlm}>
                清除 LLM 配置
              </button>
            </div>
          </fieldset>

          <StyleFields title="我的沟通风格" style={userStyle} onChange={setUserStyle} />
          <StyleFields title="她的沟通风格" style={otherStyle} onChange={setOtherStyle} />

          <fieldset className="settings-group">
            <legend>关系记忆</legend>
            <label>
              她的称呼
              <input
                value={memory.otherName}
                onChange={(event) => setMemory({ ...memory, otherName: event.target.value })}
              />
            </label>
            <label>
              对方偏好（每行一条）
              <textarea
                rows={3}
                value={toLines(memory.preferences)}
                onChange={(event) =>
                  setMemory({ ...memory, preferences: fromLines(event.target.value) })
                }
              />
            </label>
            <label>
              已知雷区（每行一条）
              <textarea
                rows={3}
                value={toLines(memory.knownTriggers)}
                onChange={(event) =>
                  setMemory({ ...memory, knownTriggers: fromLines(event.target.value) })
                }
              />
            </label>
            <label>
              重要事件（每行一条）
              <textarea
                rows={3}
                value={toLines(memory.importantEvents)}
                onChange={(event) =>
                  setMemory({ ...memory, importantEvents: fromLines(event.target.value) })
                }
              />
            </label>
            <label>
              常聊话题（每行一条）
              <textarea
                rows={2}
                value={toLines(memory.favoriteTopics)}
                onChange={(event) =>
                  setMemory({ ...memory, favoriteTopics: fromLines(event.target.value) })
                }
              />
            </label>
          </fieldset>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={autoAnalyze}
              onChange={(event) => setAutoAnalyze(event.target.checked)}
            />
            她发消息后自动分析并生成回复
          </label>
        </div>

        <footer className="drawer-footer">
          {message && <span className="settings-message">{message}</span>}
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? '保存中…' : '保存设置'}
          </button>
        </footer>
      </aside>
    </div>
  )
}