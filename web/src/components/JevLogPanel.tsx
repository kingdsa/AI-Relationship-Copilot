import type { ObserveResponse, SendResponse } from '../types'

interface JevLogPanelProps {
  sendResult: SendResponse | null
  observeResult: ObserveResponse | null
  observing: boolean
  onObserve: () => void
  canObserve: boolean
  timings: Record<string, number> | null
}

function formatStepTime(at: number): string {
  return new Date(at).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function JevLogPanel({
  sendResult,
  observeResult,
  observing,
  onObserve,
  canObserve,
  timings,
}: JevLogPanelProps) {
  const screenshot = sendResult?.screenshot ?? observeResult?.screenshot
  const page = observeResult?.page ?? sendResult?.page

  return (
    <section className="card">
      <header className="card-header">
        <h2>👀 JEV 观察 / 执行</h2>
        <button className="btn btn-ghost btn-sm" onClick={onObserve} disabled={observing || !canObserve}>
          {observing ? '观察中…' : '观察页面'}
        </button>
      </header>

      <dl className="kv kv-compact">
        <div>
          <dt>页面</dt>
          <dd>{page ? page.title : '未观察'}</dd>
        </div>
        <div>
          <dt>输入框</dt>
          <dd>{page ? page.input.selector : '—'}</dd>
        </div>
        <div>
          <dt>发送按钮</dt>
          <dd>{page ? page.sendButton.selector : '—'}</dd>
        </div>
      </dl>

      {sendResult && (
        <>
          <h3 className="sub-title">
            执行日志
            {sendResult.usedVisualFallback && <span className="chip chip-warn">视觉兜底</span>}
          </h3>
          <ol className="steps">
            {sendResult.steps.map((step, index) => (
              <li key={index} className={step.ok ? 'step-ok' : 'step-fail'}>
                <span className="step-icon">{step.ok ? '✓' : '✗'}</span>
                <div>
                  <strong>{step.step}</strong>
                  <span className="step-time">{formatStepTime(step.at)}</span>
                  <p>{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}

      {timings && (
        <div className="timings">
          {Object.entries(timings).map(([key, value]) => (
            <span key={key} className="chip chip-muted">
              {key}: {value}ms
            </span>
          ))}
        </div>
      )}

      {screenshot && (
        <details className="screenshot" open={Boolean(observeResult)}>
          <summary>页面截图（多模态上下文）</summary>
          <img src={screenshot} alt="聊天页面截图" />
        </details>
      )}
    </section>
  )
}