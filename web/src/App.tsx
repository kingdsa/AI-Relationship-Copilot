import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'
import {
  isJevConfigured,
  isLlmConfigured,
  loadCredentials,
  saveCredentials,
  type Credentials,
  type JevCredentials,
} from './credentials'
import {
  applyAnalysisResult,
  attachHistoryReply,
  clearHistory,
  loadProfile,
  profileRequest,
  saveProfile,
  type LocalProfile,
} from './profile'
import { AnalysisPanel } from './components/AnalysisPanel'
import { ChatWindow } from './components/ChatWindow'
import { JevLogPanel } from './components/JevLogPanel'
import { JevSetupModal } from './components/JevSetupModal'
import { MemoryPanel } from './components/MemoryPanel'
import { ReplyPanel } from './components/ReplyPanel'
import { SettingsDrawer } from './components/SettingsDrawer'
import type {
  AnalyzeResponse,
  Attachment,
  Message,
  ObserveResponse,
  ReplyResponse,
  SendResponse,
  SettingsSavePayload,
} from './types'

const STORAGE_KEY = 'ai-relationship-copilot.messages.v1'

function loadMessages(): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Message[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const EXAMPLE_MESSAGES: Message[] = [
  { id: 'ex-1', role: 'other', content: '你晚上回来吗？', timestamp: Date.now() - 7 * 60_000 },
  { id: 'ex-2', role: 'user', content: '应该回来吧', timestamp: Date.now() - 6 * 60_000 },
  { id: 'ex-3', role: 'other', content: '哦', timestamp: Date.now() - 5 * 60_000 },
  { id: 'ex-4', role: 'user', content: '怎么了？', timestamp: Date.now() - 4 * 60_000 },
  { id: 'ex-5', role: 'other', content: '没怎么', timestamp: Date.now() - 3 * 60_000 },
]

export default function App() {
  const [messages, setMessages] = useState<Message[]>(loadMessages)
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null)
  const [replyData, setReplyData] = useState<ReplyResponse | null>(null)
  const [edits, setEdits] = useState<string[]>([])
  const [selectedReplyIndex, setSelectedReplyIndex] = useState(0)
  const [variant, setVariant] = useState(0)
  const [analyzing, setAnalyzing] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [observing, setObserving] = useState(false)
  const [sendResult, setSendResult] = useState<SendResponse | null>(null)
  const [observeResult, setObserveResult] = useState<ObserveResponse | null>(null)
  const [simulateDomFailure, setSimulateDomFailure] = useState(false)
  const [profile, setProfile] = useState<LocalProfile>(loadProfile)
  const profileRef = useRef(profile)
  const [credentials, setCredentials] = useState<Credentials>(loadCredentials)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [jevModalOpen, setJevModalOpen] = useState(false)
  const [jevDismissed, setJevDismissed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)

  const thinking = analyzing || generating
  const jevReady = isJevConfigured(credentials)
  const llmReady = isLlmConfigured(credentials)

  const persist = useCallback((next: Message[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // localStorage 容量有限，图片过大时降级保存（仅保留描述）
      const slim = next.map((message) => ({
        ...message,
        attachments: message.attachments?.map((attachment) => ({
          ...attachment,
          url: undefined,
        })),
      }))
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(slim))
      } catch {
        /* 忽略持久化失败 */
      }
    }
  }, [])

  const showToast = useCallback((text: string) => {
    setToast(text)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2600)
  }, [])

  /** 画像（风格/记忆/历史）统一经由这里更新并持久化，ref 保证异步流程拿到最新值 */
  const commitProfile = useCallback((updater: (current: LocalProfile) => LocalProfile) => {
    const next = updater(profileRef.current)
    profileRef.current = next
    setProfile(next)
    saveProfile(next)
  }, [])

  useEffect(() => {
    if (!jevReady && !jevDismissed) {
      setJevModalOpen(true)
    }
  }, [jevReady, jevDismissed])

  const runPipeline = useCallback(
    async (target: Message[], options: { regenerate?: boolean; nextVariant?: number } = {}) => {
      setError(null)
      try {
        if (!options.regenerate) {
          setAnalyzing(true)
          setSendResult(null)
          setObserveResult(null)
          setReplyData(null)
          setEdits([])
          const result = await api.analyze(target, profileRequest(profileRef.current))
          setAnalysis(result)
          commitProfile((current) => applyAnalysisResult(current, result))
          setAnalyzing(false)
        }
        setGenerating(true)
        const nextVariant = options.nextVariant ?? 0
        const replyResult = await api.reply(
          target,
          nextVariant,
          3,
          profileRequest(profileRef.current),
        )
        setReplyData(replyResult)
        setEdits(replyResult.replies.map((reply) => reply.content))
        setSelectedReplyIndex(0)
        setVariant(nextVariant)
        commitProfile((current) => applyAnalysisResult(current, replyResult))
        setGenerating(false)
      } catch (err) {
        setAnalyzing(false)
        setGenerating(false)
        const message = err instanceof Error ? err.message : String(err)
        setError(message)
        if (message.includes('JEV API Key')) {
          setJevDismissed(false)
          setJevModalOpen(true)
        }
      }
    },
    [commitProfile],
  )

  const handleSendAsOther = useCallback(
    (content: string, attachments: Attachment[]) => {
      const next: Message[] = [
        ...messages,
        {
          id: `msg-${Date.now()}`,
          role: 'other',
          content,
          timestamp: Date.now(),
          attachments: attachments.length > 0 ? attachments : undefined,
        },
      ]
      setMessages(next)
      persist(next)
      if (profileRef.current.autoAnalyze) {
        void runPipeline(next)
      } else {
        setAnalysis(null)
        setReplyData(null)
      }
    },
    [messages, persist, runPipeline],
  )

  const handleAnalyze = useCallback(() => {
    if (messages.length === 0) return
    void runPipeline(messages)
  }, [messages, runPipeline])

  const handleRegenerate = useCallback(() => {
    if (messages.length === 0) return
    void runPipeline(messages, { regenerate: true, nextVariant: variant + 1 })
  }, [messages, runPipeline, variant])

  const handleSendReply = useCallback(async () => {
    const text = (edits[selectedReplyIndex] ?? replyData?.replies[selectedReplyIndex]?.content ?? '').trim()
    if (!text || sending) return
    setSending(true)
    setError(null)
    try {
      const result = await api.send(messages, text, simulateDomFailure)
      setSendResult(result)
      const next: Message[] = [
        ...messages,
        {
          id: `msg-${Date.now()}`,
          role: 'user',
          content: text,
          timestamp: Date.now(),
          viaJev: true,
        },
      ]
      setMessages(next)
      persist(next)
      const historyId = analysis?.historyId ?? replyData?.historyId ?? ''
      commitProfile((current) => attachHistoryReply(current, historyId, text))
      showToast('已通过 JEV 填入输入框并发送 ✓')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSending(false)
    }
  }, [
    analysis?.historyId,
    commitProfile,
    edits,
    messages,
    persist,
    replyData?.historyId,
    replyData?.replies,
    selectedReplyIndex,
    sending,
    showToast,
    simulateDomFailure,
  ])

  const handleObserve = useCallback(async () => {
    setObserving(true)
    try {
      setObserveResult(await api.observe(messages))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setObserving(false)
    }
  }, [messages])

  const handleClear = useCallback(() => {
    setMessages([])
    setAnalysis(null)
    setReplyData(null)
    setSendResult(null)
    setObserveResult(null)
    setEdits([])
    persist([])
    localStorage.removeItem(STORAGE_KEY)
    commitProfile(clearHistory)
    showToast('对话已清空（关系记忆保留）')
  }, [commitProfile, persist, showToast])

  const handleLoadExample = useCallback(() => {
    setMessages(EXAMPLE_MESSAGES)
    persist(EXAMPLE_MESSAGES)
    void runPipeline(EXAMPLE_MESSAGES)
  }, [persist, runPipeline])

  const handleSaveSettings = useCallback(
    async (payload: SettingsSavePayload) => {
      const { credentials: nextCredentials, ...profilePatch } = payload
      if (nextCredentials) {
        setCredentials(nextCredentials)
        saveCredentials(nextCredentials)
      }
      commitProfile((current) => ({
        ...current,
        userCommunicationStyle:
          profilePatch.userCommunicationStyle ?? current.userCommunicationStyle,
        otherCommunicationStyle:
          profilePatch.otherCommunicationStyle ?? current.otherCommunicationStyle,
        autoAnalyze: profilePatch.autoAnalyze ?? current.autoAnalyze,
        relationshipMemory: profilePatch.relationshipMemory ?? current.relationshipMemory,
      }))
      showToast('设置已保存（仅保存在本机浏览器）')
    },
    [commitProfile, showToast],
  )

  const handleSaveJev = useCallback(
    async (jev: JevCredentials) => {
      const next: Credentials = { ...credentials, jev }
      setCredentials(next)
      saveCredentials(next)
      setJevModalOpen(false)
      setJevDismissed(true)
      showToast('JEV 已启用（仅保存在本机浏览器）')
      if (messages.length > 0 && profileRef.current.autoAnalyze) {
        void runPipeline(messages)
      }
    },
    [credentials, messages, runPipeline, showToast],
  )

  const timings = replyData?.timings ?? analysis?.timings ?? null
  const currentAnalysis: AnalyzeResponse | null = analysis ?? replyData

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-logo">❤️</span>
          <div>
            <h1>AI Relationship Copilot</h1>
            <p>JEV 观察决策 · AI 生成回复 · 你确认发送</p>
          </div>
        </div>
        <div className="header-status">
          <button
            className={`chip chip-btn ${jevReady ? 'chip-ok' : 'chip-danger'}`}
            onClick={() => {
              setJevDismissed(false)
              setJevModalOpen(true)
            }}
            title={jevReady ? `JEV：${credentials.jev.model}` : '点击输入 JEV API Key'}
          >
            JEV {jevReady ? '已连接' : '未配置 · 点击输入 Key'}
          </button>
          <span className={`chip ${llmReady ? 'chip-ok' : 'chip-muted'}`}>
            {llmReady ? `LLM ${credentials.llm.model}` : 'LLM 未配置 · 本地合成'}
          </span>
        </div>
        <div className="header-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => setSettingsOpen(true)}>
            设置
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleClear} disabled={messages.length === 0}>
            清空对话
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button className="icon-btn" onClick={() => setError(null)}>
            ×
          </button>
        </div>
      )}

      <main className="layout">
        <ChatWindow
          messages={messages}
          thinking={thinking}
          onSendAsOther={handleSendAsOther}
          onLoadExample={handleLoadExample}
        />

        <div className="panel">
          <AnalysisPanel
            analysis={currentAnalysis}
            loading={analyzing}
            onAnalyze={handleAnalyze}
            canAnalyze={messages.length > 0}
          />
          <ReplyPanel
            replies={replyData?.replies ?? []}
            replySource={replyData?.replySource ?? null}
            warning={replyData?.warning}
            loading={generating}
            generating={generating}
            sending={sending}
            selectedIndex={selectedReplyIndex}
            onSelect={setSelectedReplyIndex}
            edits={edits}
            onEdit={(text) =>
              setEdits((current) => {
                const next = [...current]
                next[selectedReplyIndex] = text
                return next
              })
            }
            onRegenerate={handleRegenerate}
            onSend={handleSendReply}
            llmModel={llmReady ? credentials.llm.model : null}
            requiresConfirmation={currentAnalysis?.risk.requiresConfirmation ?? true}
            simulateDomFailure={simulateDomFailure}
            onToggleSimulateDomFailure={setSimulateDomFailure}
          />
          <JevLogPanel
            sendResult={sendResult}
            observeResult={observeResult}
            observing={observing}
            onObserve={handleObserve}
            canObserve={messages.length > 0}
            timings={timings}
          />
          <MemoryPanel memory={profile.relationshipMemory} history={profile.history} />
          <p className="stage-note">
            第一阶段（Manual）：AI 只负责分析与建议，JEV 填入输入框后必须由你确认发送。
          </p>
        </div>
      </main>

      <SettingsDrawer
        open={settingsOpen}
        profile={profile}
        credentials={credentials}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSaveSettings}
      />

      <JevSetupModal
        open={jevModalOpen}
        credentials={credentials}
        onClose={() => {
          setJevModalOpen(false)
          setJevDismissed(true)
        }}
        onSave={handleSaveJev}
      />

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}