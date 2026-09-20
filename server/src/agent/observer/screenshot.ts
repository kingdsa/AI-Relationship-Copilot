import type { Message } from '../../types/message.js'

const WIDTH = 360
const PADDING = 12
const BUBBLE_MAX_CHARS = 15
const MAX_LINES = 3
const LINE_HEIGHT = 20
const MAX_MESSAGES = 6

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function wrap(text: string, maxChars: number): string[] {
  const lines: string[] = []
  let rest = text
  while (rest.length > 0 && lines.length < MAX_LINES) {
    lines.push(rest.slice(0, maxChars))
    rest = rest.slice(maxChars)
  }
  if (rest.length > 0 && lines.length === MAX_LINES) {
    lines[MAX_LINES - 1] = `${lines[MAX_LINES - 1].slice(0, maxChars - 1)}…`
  }
  return lines
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * 生成聊天页面截图（SVG 模拟）。
 * 真实接入时可以替换为浏览器截图（base64 PNG），
 * 多模态模型可直接使用该图片作为上下文（PRD §6）。
 */
export function renderScreenshot(messages: Message[]): string {
  const visible = messages.slice(-MAX_MESSAGES)
  const rows: string[] = []
  let y = 64

  for (const message of visible) {
    const isOther = message.role === 'other'
    const lines = wrap(message.content || '[图片]', BUBBLE_MAX_CHARS)
    const bubbleHeight = lines.length * LINE_HEIGHT + 16
    const bubbleWidth = Math.min(
      WIDTH - PADDING * 2 - 40,
      Math.max(...lines.map((l) => l.length)) * 14 + 24,
    )
    const bubbleX = isOther ? PADDING : WIDTH - PADDING - bubbleWidth
    const fill = isOther ? '#ffffff' : '#95ec69'
    const textX = bubbleX + bubbleWidth / 2

    rows.push(
      `<g><rect x="${bubbleX}" y="${y}" width="${bubbleWidth}" height="${bubbleHeight}" rx="8" fill="${fill}" stroke="#e5e5e5"/></g>`,
    )
    lines.forEach((line, index) => {
      rows.push(
        `<text x="${isOther ? bubbleX + 12 : textX}" y="${y + 24 + index * LINE_HEIGHT}" font-size="13" fill="#1f2937" ${isOther ? '' : 'text-anchor="middle"'}>${escapeXml(line)}</text>`,
      )
    })
    if (message.attachments && message.attachments.length > 0) {
      rows.push(
        `<text x="${isOther ? bubbleX + 12 : bubbleX + bubbleWidth - 12}" y="${y + bubbleHeight - 6}" font-size="10" fill="#6b7280" ${isOther ? '' : 'text-anchor="end"'}>[图片/附件]</text>`,
      )
    }
    rows.push(
      `<text x="${isOther ? bubbleX : bubbleX + bubbleWidth}" y="${y + bubbleHeight + 12}" font-size="9" fill="#9ca3af" ${isOther ? '' : 'text-anchor="end"'}>${formatTime(message.timestamp)}</text>`,
    )
    y += bubbleHeight + 30
  }

  const height = Math.max(140, y + PADDING)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}">
<rect width="${WIDTH}" height="${height}" fill="#ededed"/>
<text x="${PADDING}" y="30" font-size="14" font-weight="600" fill="#374151">微信 · 和她</text>
<text x="${WIDTH - PADDING}" y="30" font-size="10" fill="#9ca3af" text-anchor="end">${new Date().toLocaleString('zh-CN')}</text>
${rows.join('\n')}
</svg>`

  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`
}