import { promises as fs } from 'node:fs'
import path from 'node:path'

export class JsonStore<T extends object> {
  private cache: T | null = null

  constructor(
    private readonly filePath: string,
    private readonly defaults: T,
  ) {}

  async read(): Promise<T> {
    if (this.cache) return this.cache
    try {
      const raw = await fs.readFile(this.filePath, 'utf8')
      const parsed = JSON.parse(raw) as Partial<T>
      this.cache = { ...this.defaults, ...parsed }
    } catch {
      this.cache = { ...this.defaults }
    }
    return this.cache
  }

  async write(value: T): Promise<void> {
    this.cache = value
    await fs.mkdir(path.dirname(this.filePath), { recursive: true })
    const tmp = `${this.filePath}.tmp`
    await fs.writeFile(tmp, JSON.stringify(value, null, 2), 'utf8')
    await fs.rename(tmp, this.filePath)
  }

  async update(mutator: (current: T) => T): Promise<T> {
    const current = await this.read()
    const next = mutator(structuredClone(current))
    await this.write(next)
    return next
  }

  async reset(): Promise<T> {
    await this.write({ ...this.defaults })
    return this.read()
  }
}