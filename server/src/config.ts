import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const serverRoot = path.resolve(here, '..')

export const config = {
  port: Number(process.env.PORT ?? 8787),
  dataDir: path.join(serverRoot, 'data'),
  /**
   * JEV 的 API Key 以用户在界面手动输入（保存到 data/settings.json）为准。
   * 环境变量仅作为可选回退，默认留空。
   */
  jevFromEnv: {
    apiKey: process.env.JEV_API_KEY?.trim() ?? '',
    baseUrl: process.env.JEV_BASE_URL?.trim() || 'https://api.typesafe.ai/v1',
    model: process.env.JEV_MODEL?.trim() || 'jev-latest',
  },
  llmFromEnv: {
    baseUrl: process.env.LLM_BASE_URL?.trim() ?? '',
    apiKey: process.env.LLM_API_KEY?.trim() ?? '',
    model: process.env.LLM_MODEL?.trim() ?? '',
  },
  recentMessageLimit: 30,
}