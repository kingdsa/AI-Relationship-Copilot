import path from 'node:path'
import { config } from '../config.js'
import type { RelationshipMemory } from '../types/index.js'
import { JsonStore } from './store.js'

const defaults: RelationshipMemory = {
  otherName: '她',
  preferences: [],
  commonPhrases: [],
  communicationPatterns: [],
  importantEvents: [],
  knownTriggers: [],
  favoriteTopics: [],
  updatedAt: Date.now(),
}

const store = new JsonStore<RelationshipMemory>(
  path.join(config.dataDir, 'relationship-memory.json'),
  defaults,
)

function mergeUnique(base: string[], incoming: string[], limit = 50): string[] {
  const set = new Set(base.map((s) => s.trim()).filter(Boolean))
  for (const item of incoming) {
    const value = item.trim()
    if (value) set.add(value)
  }
  return Array.from(set).slice(-limit)
}

export const relationshipMemory = {
  async get(): Promise<RelationshipMemory> {
    return store.read()
  },

  async update(patch: Partial<RelationshipMemory>): Promise<RelationshipMemory> {
    return store.update((current) => {
      const next: RelationshipMemory = {
        ...current,
        ...patch,
        updatedAt: Date.now(),
      }
      next.preferences = mergeUnique(current.preferences, patch.preferences ?? [])
      next.commonPhrases = mergeUnique(current.commonPhrases, patch.commonPhrases ?? [])
      next.communicationPatterns = mergeUnique(
        current.communicationPatterns,
        patch.communicationPatterns ?? [],
      )
      next.importantEvents = mergeUnique(current.importantEvents, patch.importantEvents ?? [])
      next.knownTriggers = mergeUnique(current.knownTriggers, patch.knownTriggers ?? [])
      next.favoriteTopics = mergeUnique(current.favoriteTopics, patch.favoriteTopics ?? [])
      return next
    })
  },
}