import { useEffect, useState } from 'react'
import {
  DEFAULT_JEV_BASE_URL,
  DEFAULT_JEV_MODEL,
  type Credentials,
  type JevCredentials,
} from '../credentials'

interface JevSetupModalProps {
  open: boolean
  credentials: Credentials
  onClose: () => void
  onSave: (jev: JevCredentials) => Promise<void>
}

export function JevSetupModal({ open, credentials, onClose, onSave }: JevSetupModalProps) {
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState(DEFAULT_JEV_BASE_URL)
  const [model, setModel] = useState(DEFAULT_JEV_MODEL)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setApiKey(credentials.jev.apiKey)
      setBaseUrl(credentials.jev.baseUrl || DEFAULT_JEV_BASE_URL)
      setModel(credentials.jev.model || DEFAULT_JEV_MODEL)
      setError(null)
    }
  }, [open, credentials])

  if (!open) return null

  const save = async () => {
    if (!apiKey.trim()) {
      setError('请输入 JEV API Key')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave({
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim() || DEFAULT_JEV_BASE_URL,
        model: model.trim() || DEFAULT_JEV_MODEL,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>🔑 配置 JEV API Key</h2>
        <p className="modal-desc">
          JEV（TypeSafe System One）是情绪与策略的决策引擎，需要你手动输入自己的 API Key。
          Key 只保存在你自己的浏览器（localStorage），随请求发送，服务端不保存、也不会被其他使用者用到。
          可在 <a href="https://console.typesafe.ai/keys" target="_blank" rel="noreferrer">TypeSafe 控制台</a> 获取。
        </p>

        <label className="modal-field">
          JEV API Key（必填）
          <input
            type="password"
            autoFocus
            placeholder="apikey_..."
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing || event.keyCode === 229) return
              if (event.key === 'Enter') void save()
            }}
          />
        </label>
        <label className="modal-field">
          Base URL
          <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
        </label>
        <label className="modal-field">
          模型
          <input value={model} onChange={(event) => setModel(event.target.value)} />
        </label>

        {error && <div className="modal-error">{error}</div>}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
            稍后再说
          </button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? '保存中…' : '保存并启用 JEV'}
          </button>
        </div>
      </div>
    </div>
  )
}