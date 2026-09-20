export interface Attachment {
  id: string
  type: 'image' | 'emoji' | 'file' | 'link'
  url?: string
  description?: string
}

export interface Message {
  id: string
  role: 'user' | 'other'
  content: string
  timestamp: number
  attachments?: Attachment[]
}

export function messageSignature(messages: Message[]): string {
  return messages.map((m) => `${m.role}:${m.content}`).join('|')
}