import path from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import express from 'express'
import { config } from './config.js'
import { api } from './routes/api.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '12mb' }))

app.use('/api', api)

const here = path.dirname(fileURLToPath(import.meta.url))
const webDist = path.resolve(here, '../../web/dist')
if (existsSync(webDist)) {
  app.use(express.static(webDist))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next()
    res.sendFile(path.join(webDist, 'index.html'))
  })
}

app.use(
  (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[server error]', err)
    const message = err instanceof Error ? err.message : '服务器内部错误'
    res.status(500).json({ error: message })
  },
)

app.listen(config.port, () => {
  console.log(`AI Relationship Copilot server 已启动：http://localhost:${config.port}`)
  console.log('JEV / LLM 凭据由每位使用者在浏览器中配置（localStorage），服务端不保存密钥。')
  console.log(`前端开发地址：http://localhost:5173（npm run dev）`)
})