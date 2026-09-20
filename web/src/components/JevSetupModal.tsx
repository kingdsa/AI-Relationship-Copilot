import { useEffect, useState } from 'react'

interface JevSetupModalProps {
  open: boolean
  onClose: () => void
  onSave: (jev: { apiKey: string; baseUrl: string; model: string }) => Promise<void>
}

export function JevSetupModal({ open, onClose, onSave }: JevSetupModalProps) {
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('https://api.typesafe.ai/v1')
  const [model, setModel] = useState('jev-latest')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setApiKey('')
      setError(null)
    }
  }, [open])

  if (!open) return null

  const save = async () => {
    if (!apiKey.trim()) {
      setError('请输入 JEV API Key')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave({ apiKey: apiKey.trim(), baseUrl: baseUrl.trim(), model: model.trim() })
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
          Key 只会保存到本机服务端 <code>server/data/settings.json</code>，不会回显到前端。
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