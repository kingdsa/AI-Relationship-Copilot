export interface ReplySuggestion {
  content: string
  strategy: string[]
  confidence: number
  source: 'llm' | 'composer'
}

export type ReplySource = ReplySuggestion['source']