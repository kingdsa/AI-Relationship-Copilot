import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'
import { AnalysisPanel } from './components/AnalysisPanel'
import { ChatWindow } from './components/ChatWindow'
import { JevLogPanel } from './components/JevLogPanel'
import { JevSetupModal } from './components/JevSetupModal'
import { MemoryPanel } from './components/MemoryPanel'
import { ReplyPanel } from './components/ReplyPanel'
import { SettingsDrawer } from './components/SettingsDrawer'
import type {
  AnalyzeResponse,
  AppStateResponse,
  Attachment,
  Message,
  ObserveResponse,
  ReplyResponse,
  SendResponse,
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
  const [appState, setAppState] = useState<AppStateResponse | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [jevModalOpen, setJevModalOpen] = useState(false)
  const [jevDismissed, setJevDismissed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)

  const thinking = analyzing || generating

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

  const refreshState = useCallback(async () => {
    try {
      setAppState(await api.getState())
    } catch {
      /* 状态刷新失败不阻塞主流程 */
    }
  }, [])

  useEffect(() => {
    void refreshState()
  }, [refreshState])

  useEffect(() => {
    if (appState && !appState.jev.configured && !jevDismissed) {
      setJevModalOpen(true)
    }
  }, [appState, jevDismissed])

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
          const result = await api.analyze(target)
          setAnalysis(result)
          setAnalyzing(false)
        }
        setGenerating(true)
        const nextVariant = options.nextVariant ?? 0
        const replyResult = await api.reply(target, nextVariant, 3)
        setReplyData(replyResult)
        setEdits(replyResult.replies.map((reply) => reply.content))
        setSelectedReplyIndex(0)
        setVariant(nextVariant)
        setGenerating(false)
        void refreshState()
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
    [refreshState],
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
      if (appState?.settings.autoAnalyze !== false) {
        void runPipeline(next)
      } else {
        setAnalysis(null)
        setReplyData(null)
      }
    },
    [appState?.settings.autoAnalyze, messages, persist, runPipeline],
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
      const result = await api.send(
        messages,
        text,
        analysis?.historyId ?? '',
        simulateDomFailure,
      )
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
      showToast('已通过 JEV 填入输入框并发送 ✓')
      void refreshState()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSending(false)
    }
  }, [
    analysis?.historyId,
    edits,
    messages,
    persist,
    refreshState,
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

  const handleClear = useCallback(async () => {
    setMessages([])
    setAnalysis(null)
    setReplyData(null)
    setSendResult(null)
    setObserveResult(null)
    setEdits([])
    persist([])
    localStorage.removeItem(STORAGE_KEY)
    try {
      await api.resetConversation()
    } catch {
      /* ignore */
    }
    showToast('对话已清空（关系记忆保留）')
  }, [persist, showToast])

  const handleLoadExample = useCallback(() => {
    setMessages(EXAMPLE_MESSAGES)
    persist(EXAMPLE_MESSAGES)
    void runPipeline(EXAMPLE_MESSAGES)
  }, [persist, runPipeline])

  const handleSaveSettings = useCallback(
    async (patch: Record<string, unknown>) => {
      await api.updateSettings(patch)
      await refreshState()
      showToast('设置已保存')
    },
    [refreshState, showToast],
  )

  const handleSaveJev = useCallback(
    async (jev: { apiKey: string; baseUrl: string; model: string }) => {
      await api.updateSettings({ jev })
      await refreshState()
      setJevModalOpen(false)
      setJevDismissed(true)
      showToast('JEV 已启用')
      if (messages.length > 0 && appState?.settings.autoAnalyze !== false) {
        void runPipeline(messages)
      }
    },
    [appState?.settings.autoAnalyze, messages, refreshState, runPipeline, showToast],
  )

  const timings = replyData?.timings ?? analysis?.timings ?? null
  const currentAnalysis: AnalyzeResponse | null =
    analysis ??
    (replyData
      ? {
          emotion: replyData.emotion,
          strategy: replyData.strategy,
          risk: replyData.risk,
          jevModel: replyData.jevModel,
          timings: replyData.timings,
          historyId: '',
        }
      : null)

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
            className={`chip chip-btn ${appState?.jev.configured ? 'chip-ok' : 'chip-danger'}`}
            onClick={() => {
              setJevDismissed(false)
              setJevModalOpen(true)
            }}
            title={appState?.jev.configured ? `JEV：${appState.jev.model}` : '点击输入 JEV API Key'}
          >
            JEV {appState?.jev.configured ? '已连接' : '未配置 · 点击输入 Key'}
          </button>
          <span className={`chip ${appState?.llm.configured ? 'chip-ok' : 'chip-muted'}`}>
            {appState?.llm.configured ? `LLM ${appState.llm.model}` : 'LLM 未配置 · 本地合成'}
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
            llmModel={appState?.llm.model ?? null}
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
          {appState && <MemoryPanel memory={appState.memory} history={appState.history} />}
          <p className="stage-note">
            第一阶段（Manual）：AI 只负责分析与建议，JEV 填入输入框后必须由你确认发送。
          </p>
        </div>
      </main>

      <SettingsDrawer
        open={settingsOpen}
        state={appState}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSaveSettings}
      />

      <JevSetupModal
        open={jevModalOpen}
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