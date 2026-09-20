import { useEffect, useRef, useState } from 'react'
import type { Attachment, Message } from '../types'
import { MessageBubble } from './MessageBubble'

interface ChatWindowProps {
  messages: Message[]
  thinking: boolean
  onSendAsOther: (content: string, attachments: Attachment[]) => void
  onLoadExample: () => void
}

const MAX_IMAGE_BYTES = 1_500_000

export function ChatWindow({
  messages,
  thinking,
  onSendAsOther,
  onLoadExample,
}: ChatWindowProps) {
  const [draft, setDraft] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [imageError, setImageError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [messages.length, thinking])

  const submit = () => {
    const content = draft.trim()
    if (!content && attachments.length === 0) return
    onSendAsOther(content || '[图片]', attachments)
    setDraft('')
    setAttachments([])
    setImageError(null)
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError('图片超过 1.5MB，请换一张更小的图片')
      return
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
    setAttachments((current) => [
      ...current,
      {
        id: `${Date.now()}-${file.name}`,
        type: 'image',
        url: dataUrl,
        description: `她发来的图片：${file.name}`,
      },
    ])
    setImageError(null)
  }

  return (
    <section className="chat-window">
      <div className="chat-list" ref={listRef}>
        {messages.length === 0 && (
          <div className="chat-empty">
            <div className="chat-empty-emoji">💬</div>
            <h3>模拟聊天框</h3>
            <p>
              这里有 <strong>两个角色</strong>：你在下面输入的内容会被当作
              <strong>女朋友（左）</strong>发来的消息；JEV + AI 会分析她的情绪与意图，并在右侧生成
              <strong>你要回复的话（右）</strong>。
            </p>
            <button className="btn btn-ghost" onClick={onLoadExample}>
              载入 PRD 示例对话
            </button>
          </div>
        )}
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {thinking && (
          <div className="bubble-row from-me">
            <div className="avatar avatar-me">我</div>
            <div className="bubble-block">
              <div className="bubble bubble-thinking">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
                <em>JEV 正在理解上下文，AI 正在组织回复…</em>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="chat-composer">
        {attachments.length > 0 && (
          <div className="composer-attachments">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="composer-attachment">
                {attachment.url && <img src={attachment.url} alt="待发送图片" />}
                <button
                  className="icon-btn"
                  onClick={() =>
                    setAttachments((current) => current.filter((a) => a.id !== attachment.id))
                  }
                  title="移除图片"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        {imageError && <div className="composer-error">{imageError}</div>}
        <div className="composer-row">
          <button
            className="icon-btn"
            title="添加图片（模拟她发来的照片/表情包）"
            onClick={() => fileRef.current?.click()}
          >
            📎
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(event) => {
              void handleFiles(event.target.files)
              event.target.value = ''
            }}
          />
          <textarea
            value={draft}
            placeholder="输入女朋友（她）说的话，回车发送…"
            rows={2}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                submit()
              }
            }}
          />
          <button className="btn btn-primary" onClick={submit}>
            作为她说
          </button>
        </div>
        <div className="composer-hint">
          你输入 = 女朋友说的话 → JEV 分析情绪与意图 → AI 生成你要回复的内容（右侧确认后发送）
        </div>
      </div>
    </section>
  )
}