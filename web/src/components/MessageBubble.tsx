import type { Message } from '../types'

interface MessageBubbleProps {
  message: Message
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isOther = message.role === 'other'
  return (
    <div className={`bubble-row ${isOther ? 'from-other' : 'from-me'}`}>
      <div className={`avatar ${isOther ? 'avatar-other' : 'avatar-me'}`}>
        {isOther ? '她' : '我'}
      </div>
      <div className="bubble-block">
        <div className="bubble">
          {message.attachments && message.attachments.length > 0 && (
            <div className="bubble-attachments">
              {message.attachments.map((attachment) =>
                attachment.type === 'image' && attachment.url ? (
                  <img key={attachment.id} src={attachment.url} alt="附件" />
                ) : (
                  <span key={attachment.id} className="attachment-chip">
                    {attachment.description || '附件'}
                  </span>
                ),
              )}
            </div>
          )}
          {message.content && <p>{message.content}</p>}
        </div>
        <div className="bubble-meta">
          <span>{formatTime(message.timestamp)}</span>
          {message.viaJev && <span className="badge badge-jev">JEV 发送</span>}
        </div>
      </div>
    </div>
  )
}