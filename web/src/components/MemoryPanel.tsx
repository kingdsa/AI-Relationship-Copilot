import type { HistoryRecord, RelationshipMemory } from '../types'

interface MemoryPanelProps {
  memory: RelationshipMemory
  history: HistoryRecord[]
}

function formatTime(at: number): string {
  return new Date(at).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function MemoryList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <div className="memory-group">
      <h4>{title}</h4>
      <div className="memory-tags">
        {items.map((item) => (
          <span key={item} className="chip chip-soft">
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

export function MemoryPanel({ memory, history }: MemoryPanelProps) {
  const recent = [...history].reverse().slice(0, 8)
  return (
    <section className="card">
      <header className="card-header">
        <h2>🧠 关系记忆与情绪时间线</h2>
        <span className="chip chip-muted">{memory.otherName}</span>
      </header>

      <MemoryList title="对方偏好" items={memory.preferences} />
      <MemoryList title="已知雷区" items={memory.knownTriggers} />
      <MemoryList title="重要事件" items={memory.importantEvents} />
      <MemoryList title="常聊话题" items={memory.favoriteTopics} />
      <MemoryList title="沟通模式" items={memory.communicationPatterns} />
      <MemoryList title="常用语" items={memory.commonPhrases} />

      {memory.preferences.length === 0 &&
        memory.knownTriggers.length === 0 &&
        memory.importantEvents.length === 0 && (
          <p className="memory-empty">
            还没有积累记忆。你在对话里说的"我喜欢…/我讨厌…"等表达会被自动记录，也可以在设置里手动添加。
          </p>
        )}

      {recent.length > 0 && (
        <div className="timeline">
          <h4>情绪时间线（最近 {recent.length} 次分析）</h4>
          <ul>
            {recent.map((record) => (
              <li key={record.id}>
                <span className="timeline-time">{formatTime(record.at)}</span>
                <span className="timeline-emotion">{record.emotion}</span>
                <span className="timeline-intensity">
                  {(record.intensity * 100).toFixed(0)}%
                </span>
                <span className="timeline-incoming" title={record.incoming}>
                  {record.incoming.slice(0, 14) || '（图片）'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}