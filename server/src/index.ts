import path from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import express from 'express'
import { config } from './config.js'
import { api } from './routes/api.js'
import { jevStatus } from './agent/pipeline.js'

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

app.listen(config.port, async () => {
  const jev = await jevStatus()
  console.log(`AI Relationship Copilot server 已启动：http://localhost:${config.port}`)
  console.log(
    jev.configured
      ? `JEV 已配置（${jev.model}）`
      : 'JEV 未配置：请在网页右上角「设置」中手动输入 JEV API Key',
  )
  console.log(`前端开发地址：http://localhost:5173（npm run dev）`)
})