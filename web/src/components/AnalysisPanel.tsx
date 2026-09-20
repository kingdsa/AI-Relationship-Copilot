import type { AnalyzeResponse } from '../types'

const EMOTION_EMOJI: Record<string, string> = {
  开心: '😊',
  兴奋: '🤩',
  期待: '🥰',
  平静: '😌',
  疑惑: '🤔',
  尴尬: '😅',
  害羞: '😳',
  委屈: '🥺',
  失望: '😞',
  难过: '😢',
  生气: '😠',
  焦虑: '😰',
  冷淡: '🧊',
  烦躁: '😤',
  撒娇: '😼',
  暧昧: '😉',
  无奈: '😮‍💨',
  疲惫: '😩',
}

const URGENCY_LABEL: Record<string, string> = {
  low: '不急',
  medium: '尽快回应',
  high: '需要立即回应',
}

function intensityLabel(intensity: number): string {
  if (intensity < 0.2) return '几乎没有'
  if (intensity < 0.4) return '轻微'
  if (intensity < 0.6) return '中等'
  if (intensity < 0.8) return '明显'
  return '强烈'
}

interface AnalysisPanelProps {
  analysis: AnalyzeResponse | null
  loading: boolean
  onAnalyze: () => void
  canAnalyze: boolean
}

export function AnalysisPanel({ analysis, loading, onAnalyze, canAnalyze }: AnalysisPanelProps) {
  return (
    <section className="card">
      <header className="card-header">
        <h2>❤️ AI 分析</h2>
        {analysis && (
          <span className="chip chip-muted" title="JEV 模型版本">
            JEV {analysis.jevModel.replace('jev-', '')}
          </span>
        )}
      </header>

      {!analysis && !loading && (
        <div className="card-empty">
          <p>还没有分析结果。在左下角输入女朋友说的话，或点击下方按钮开始分析。</p>
          <button className="btn btn-primary" onClick={onAnalyze} disabled={!canAnalyze}>
            开始分析
          </button>
        </div>
      )}

      {loading && (
        <div className="card-loading">
          <span className="spinner" />
          JEV 正在结合上下文判断情绪与意图…
        </div>
      )}

      {analysis && (
        <>
          <div className="emotion-hero">
            <div className="emotion-emoji">
              {EMOTION_EMOJI[analysis.emotion.emotion] ?? '🙂'}
            </div>
            <div className="emotion-main">
              <div className="emotion-name">{analysis.emotion.emotion}</div>
              <div className="emotion-sub">
                置信度 {(analysis.emotion.confidence * 100).toFixed(0)}%
                {!analysis.emotion.contextSufficient && (
                  <span className="chip chip-warn">上下文不足</span>
                )}
              </div>
            </div>
            <span className={`chip urgency-${analysis.emotion.urgency}`}>
              {URGENCY_LABEL[analysis.emotion.urgency]}
            </span>
          </div>

          <div className="intensity">
            <div className="intensity-label">
              <span>情绪强度</span>
              <span>
                {(analysis.emotion.intensity * 100).toFixed(0)}%·{' '}
                {intensityLabel(analysis.emotion.intensity)}
              </span>
            </div>
            <div className="intensity-track">
              <div
                className="intensity-fill"
                style={{ width: `${Math.round(analysis.emotion.intensity * 100)}%` }}
              />
            </div>
          </div>

          <dl className="kv">
            <div>
              <dt>态度</dt>
              <dd>{analysis.emotion.attitude}</dd>
            </div>
            <div>
              <dt>潜在诉求</dt>
              <dd>{analysis.emotion.intent}</dd>
            </div>
            <div>
              <dt>关系状态</dt>
              <dd>{analysis.emotion.relationshipStateLabel}</dd>
            </div>
          </dl>

          {analysis.emotion.notes.length > 0 && (
            <ul className="notes">
              {analysis.emotion.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          )}

          <details className="probabilities">
            <summary>情绪概率分布（JEV）</summary>
            <ul>
              {Object.entries(analysis.emotion.emotionProbabilities)
                .filter(([, value]) => value > 0.02)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([label, value]) => (
                  <li key={label}>
                    <span className="prob-label">{label}</span>
                    <span className="prob-track">
                      <span style={{ width: `${Math.round(value * 100)}%` }} />
                    </span>
                    <span className="prob-value">{(value * 100).toFixed(0)}%</span>
                  </li>
                ))}
            </ul>
          </details>

          <div className="strategy">
            <h3>
              沟通策略：<strong>{analysis.strategy.primaryLabel}</strong>
            </h3>
            <ul className="strategy-list">
              {analysis.strategy.directives.map((item) => (
                <li key={item} className="do">
                  ✓ {item}
                </li>
              ))}
              {analysis.strategy.avoid.map((item) => (
                <li key={item} className="avoid">
                  ✕ {item}
                </li>
              ))}
            </ul>
          </div>

          {analysis.risk.level !== 'none' && (
            <div className={`risk risk-${analysis.risk.level}`}>
              <h3>
                ⚠️ 风险控制：
                {analysis.risk.level === 'high' ? '高风险，禁止自动发送' : '需要留意'}
              </h3>
              <ul>
                {analysis.risk.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              {analysis.risk.sensitiveTopics.length > 0 && (
                <div className="risk-topics">
                  {analysis.risk.sensitiveTopics.map((topic) => (
                    <span key={topic} className="chip chip-danger">
                      {topic}
                    </span>
                  ))}
                </div>
              )}
              <p className="risk-note">第一阶段所有回复都必须由你确认后发送。</p>
            </div>
          )}
        </>
      )}
    </section>
  )
}