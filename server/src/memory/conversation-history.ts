import path from 'node:path'
import { config } from '../config.js'
import type { HistoryRecord } from '../types/index.js'
import { JsonStore } from './store.js'

interface HistoryFile {
  records: HistoryRecord[]
}

const store = new JsonStore<HistoryFile>(
  path.join(config.dataDir, 'conversation-history.json'),
  { records: [] },
)

export const conversationHistory = {
  async list(limit = 200): Promise<HistoryRecord[]> {
    const { records } = await store.read()
    return records.slice(-limit)
  },

  async add(record: HistoryRecord): Promise<void> {
    await store.update((current) => ({
      records: [...current.records, record].slice(-1000),
    }))
  },

  async attachReply(id: string, replyText: string): Promise<void> {
    await store.update((current) => ({
      records: current.records.map((r) => (r.id === id ? { ...r, replyText } : r)),
    }))
  },

  async clear(): Promise<void> {
    await store.reset()
  },
}