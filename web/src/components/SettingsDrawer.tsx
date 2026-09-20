import { useEffect, useState } from 'react'
import type { AppStateResponse, CommunicationStyle, RelationshipMemory } from '../types'

interface SettingsDrawerProps {
  open: boolean
  state: AppStateResponse | null
  onClose: () => void
  onSave: (patch: Record<string, unknown>) => Promise<void>
}

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

export function SettingsDrawer({ open, state, onClose, onSave }: SettingsDrawerProps) {
  const [userStyle, setUserStyle] = useState<CommunicationStyle | null>(null)
  const [otherStyle, setOtherStyle] = useState<CommunicationStyle | null>(null)
  const [memory, setMemory] = useState<RelationshipMemory | null>(null)
  const [jev, setJev] = useState({ baseUrl: '', apiKey: '', model: '' })
  const [llm, setLlm] = useState({ baseUrl: '', apiKey: '', model: '', vision: false })
  const [autoAnalyze, setAutoAnalyze] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!state || !open) return
    setUserStyle(state.settings.userCommunicationStyle)
    setOtherStyle(state.settings.otherCommunicationStyle)
    setJev({
      baseUrl: state.settings.jev.baseUrl,
      apiKey: '',
      model: state.settings.jev.model,
    })
    setLlm({
      baseUrl: state.settings.llm.baseUrl,
      apiKey: '',
      model: state.settings.llm.model,
      vision: state.settings.llm.vision,
    })
    setMemory(state.memory)
    setAutoAnalyze(state.settings.autoAnalyze)
    setMessage(null)
  }, [state, open])

  if (!open || !state || !userStyle || !otherStyle || !memory) return null

  const save = async () => {
    setSaving(true)
    setMessage(null)
    try {
      await onSave({
        userCommunicationStyle: userStyle,
        otherCommunicationStyle: otherStyle,
        autoAnalyze,
        jev,
        llm,
        relationshipMemory: memory,
      })
      setMessage('已保存')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const clearLlm = async () => {
    setSaving(true)
    try {
      await onSave({ clearLlm: true })
      setLlm({ baseUrl: '', apiKey: '', model: '', vision: false })
      setMessage('已清除 LLM 配置')
    } finally {
      setSaving(false)
    }
  }

  const clearJev = async () => {
    setSaving(true)
    try {
      await onSave({ clearJev: true })
      setJev({ baseUrl: '', apiKey: '', model: '' })
      setMessage('已清除 JEV 配置')
    } finally {
      setSaving(false)
    }
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
              JEV（TypeSafe System One）负责情绪 / 意图 / 策略决策。API Key 需要你手动输入，
              仅保存在本机服务端，不会回显。
            </p>
            <label>
              API Key
              <input
                type="password"
                placeholder={state.settings.jev.apiKey ? '已保存（留空不修改）' : 'apikey_...'}
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
              <span className={`chip ${state.jev.configured ? 'chip-ok' : 'chip-danger'}`}>
                {state.jev.configured ? `JEV 已配置 ${state.jev.model}` : 'JEV 未配置'}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={clearJev} disabled={saving}>
                清除 JEV 配置
              </button>
            </div>
          </fieldset>

          <fieldset className="settings-group">
            <legend>AI 生成引擎（LLM，可选）</legend>
            <p className="settings-hint">
              JEV 负责情绪/意图/策略决策，LLM 负责把决策表达成自然语言。不配置时使用内置合成器。
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
                placeholder={state.settings.llm.apiKey ? '已保存（留空不修改）' : 'sk-...'}
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
                当前：{state.llm.configured ? `已配置 ${state.llm.model}` : '未配置'}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={clearLlm} disabled={saving}>
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