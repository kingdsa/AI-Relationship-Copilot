import { useEffect, useState } from 'react'
import type { ReplySuggestion } from '../types'

interface ReplyPanelProps {
  replies: ReplySuggestion[]
  replySource: 'llm' | 'composer' | null
  warning?: string
  loading: boolean
  generating: boolean
  sending: boolean
  selectedIndex: number
  onSelect: (index: number) => void
  edits: string[]
  onEdit: (text: string) => void
  onRegenerate: () => void
  onSend: () => void
  llmModel: string | null
  requiresConfirmation: boolean
  simulateDomFailure: boolean
  onToggleSimulateDomFailure: (value: boolean) => void
}

export function ReplyPanel({
  replies,
  replySource,
  warning,
  loading,
  generating,
  sending,
  selectedIndex,
  onSelect,
  edits,
  onEdit,
  onRegenerate,
  onSend,
  llmModel,
  requiresConfirmation,
  simulateDomFailure,
  onToggleSimulateDomFailure,
}: ReplyPanelProps) {
  const [copied, setCopied] = useState(false)
  const current = replies[selectedIndex]
  const currentText = edits[selectedIndex] ?? current?.content ?? ''

  useEffect(() => {
    setCopied(false)
  }, [selectedIndex, currentText])

  const copy = async () => {
    if (!currentText) return
    try {
      await navigator.clipboard.writeText(currentText)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="card">
      <header className="card-header">
        <h2>💌 回复建议</h2>
        {replySource && (
          <span className="chip chip-muted" title={llmModel ? `LLM: ${llmModel}` : '本地合成器'}>
            {replySource === 'llm' ? `LLM 生成${llmModel ? ` · ${llmModel}` : ''}` : '本地合成器'}
          </span>
        )}
      </header>

      {loading && replies.length === 0 && (
        <div className="card-loading">
          <span className="spinner" />
          正在生成候选回复…
        </div>
      )}

      {!loading && replies.length === 0 && (
        <div className="card-empty">
          <p>分析完成后会自动生成 1~3 条候选回复，你也可以点击"重新生成"。</p>
        </div>
      )}

      {replies.length > 0 && (
        <>
          <div className="reply-tabs">
            {replies.map((reply, index) => (
              <button
                key={index}
                className={`reply-tab ${index === selectedIndex ? 'active' : ''}`}
                onClick={() => onSelect(index)}
              >
                建议 {index + 1}
                <small>{(reply.confidence * 100).toFixed(0)}%</small>
              </button>
            ))}
          </div>

          <textarea
            className="reply-editor"
            value={currentText}
            rows={4}
            onChange={(event) => onEdit(event.target.value)}
          />

          {current && current.strategy.length > 0 && (
            <div className="reply-strategy">
              {current.strategy.map((item) => (
                <span key={item} className="chip chip-soft">
                  {item}
                </span>
              ))}
            </div>
          )}

          {warning && <div className="warning">{warning}</div>}

          <div className="reply-actions">
            <button className="btn btn-primary" onClick={onSend} disabled={sending || generating}>
              {sending ? 'JEV 发送中…' : '发送（JEV 填入并发送）'}
            </button>
            <button className="btn" onClick={onRegenerate} disabled={generating || sending}>
              {generating ? '重新生成中…' : '重新生成'}
            </button>
            <button className="btn btn-ghost" onClick={copy}>
              {copied ? '已复制' : '复制'}
            </button>
          </div>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={simulateDomFailure}
              onChange={(event) => onToggleSimulateDomFailure(event.target.checked)}
            />
            模拟 DOM 定位失败（演示截图 + 视觉定位兜底）
          </label>

          {requiresConfirmation && (
            <p className="confirm-note">第一阶段必须人工确认：内容满意后再点击发送。</p>
          )}
        </>
      )}
    </section>
  )
}