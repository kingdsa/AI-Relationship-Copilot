# AI Relationship Copilot — 开发进度与差异报告（DEV STATUS）

> 本文档记录**本次开发会话的全部改动**、**与 PRD 的逐条对照（做了 / 没做）**、**已知问题**，以及**下次从哪继续**。
> 对照基准：`AI-Relationship-Copilot-PRD.md`
> 记录时间：2026-09-20　当前版本：v0.1.0

---

## 0. TL;DR

- MVP 第一阶段已完成并实测跑通：**模拟聊天框 → JEV 决策（情绪/意图/策略/风险）→ AI 生成回复 → 人工确认 → JEV 执行填入并发送**。
- 两个重要架构事实（与 PRD 假设不同，已按实际情况落地）：
  1. **真实 JEV（TypeSafe System One）是决策模型，不生成文本**。因此 PRD 里"JEV 观察 + AI 思考"→ 实际落地为 **JEV = 决策大脑（choice/score/noul）**，**LLM = 语言表达（可插拔，可选）**。
  2. **PRD 中 "JEV = 浏览器自动化" 在真实 JEV 产品中不存在**。已用 `BrowserAgent` 接口抽象 + `SimulatorBrowserAgent` 模拟实现（把前端聊天框当作聊天页面）；接真实浏览器（Playwright/CDP）只需替换实现。
- **JEV API Key 必须由用户在网页端手动输入**（本次按你的要求改造完成），服务端只存本机 `server/data/settings.json`、接口只回传打码值。
- 当前状态：开发服务运行中（web :5173 / server :8787），**JEV 未配置（等你手动输入 Key）**。

---

## 1. 本次改动清单（按模块）

### 1.1 工程与脚手架

| 内容 | 位置 |
| --- | --- |
| npm workspaces 单仓双包（server + web），一键 `npm run dev` | `package.json`、`server/package.json`、`web/package.json` |
| 后端：Express 4 + TypeScript + tsx（watch） | `server/`、`server/tsconfig.json` |
| 前端：Vite 6 + React 18 + TS，`/api` 代理到 8787 | `web/vite.config.ts` |
| 生产模式：后端静态托管 `web/dist`（单端口 8787） | `server/src/index.ts` |
| 环境变量模板（JEV Key 默认留空） | `server/.env`、`server/.env.example` |
| 项目说明 | `README.md` |

### 1.2 AI 层（ai/）

- `ai/client/jev-client.ts`：TypeSafe System One 客户端
  - `POST {JEV_BASE_URL}/systemone`，Bearer 鉴权；`noul / choice / score` 三种问题类型；429/529/5xx 指数退避重试（最多 3 次）+ 45s 超时；`readNoul/readChoice/readScore` 取值助手。
- `ai/client/llm-client.ts`：OpenAI 兼容 Chat Completions（可选）
  - JSON 输出（`response_format: json_object`，400 时降级重试）；`vision` 开关支持图片（`image_url` 内容块）；`extractJson()` 容错解析（代码块/前后缀）。
- `ai/prompts/system.ts`：PRD §18 的 System Prompt 原文落地 + 上下文/记录/决策的 user prompt 组装。
- `ai/schemas/questions.ts`：JEV 问题定义集中管理
  - 情绪/强度/态度/意图/关系状态/紧急度/上下文充足度；
  - 9 条策略决策 noul（是否先回应情绪、是否避免解释、是否避免讲道理、是否避免反问"为什么"、是否给空间、是否开放式提问、是否表达在意、是否幽默、是否简短）；
  - 8 条风险 noul（分手、金钱、健康、家庭、法律、重大承诺、争吵升级、明显误解）。

### 1.3 Agent 流水线（agent/）

| 模块 | 文件 | 说明 |
| --- | --- | --- |
| Context Builder | `agent/context/context-builder.ts` | 最近 30 条消息、附件、摘要、关系记忆、双方风格；`buildJevState()` 输出结构化 state（含**消息时间间隔**） |
| Memory Builder | `agent/context/memory-builder.ts` | 情绪时间线入库 + 正则抽取偏好/雷区/重要事件（近 2 条她的消息） |
| Emotion Engine | `agent/emotion/emotion-engine.ts` | 1 次 JEV 调用输出 18 类情绪 + 强度（score/4）+ 态度 + 意图 + 关系状态 + 紧急度 + 上下文充足度；`confidence < 0.7`、上下文不足自动降信心并给提示 |
| Strategy Engine | `agent/strategy/strategy-engine.ts` | 1 次 JEV 调用：主策略（12 类 choice）+ 9 条 noul 组装成 `directives[] / avoid[]`，并按强度/意图/状态/紧急度补充规则 |
| 风险控制 | `agent/strategy/risk-control.ts` | ≥0.5 命中敏感话题；≥0.7 或 ≥2 项 → high；confidence<0.7 → watch；第一阶段 `requiresConfirmation = true` |
| Reply Generator | `agent/reply/reply-generator.ts` | 优先 LLM（PRD §18 prompt，输出 1~3 条候选，`variant` 控制换表达）；失败/未配置 → 降级本地合成器并给出 warning |
| 本地合成器 | `agent/reply/composer.ts` | 情绪开场 × 策略主句 × 意图收尾，按用户风格调整长度/表情；**JEV 决策驱动，无 LLM 也可用** |
| 观察层 | `agent/observer/page-observer.ts` | `BrowserAgent` 接口 + `PageState/ElementRef/ActionStep`；`DomLocateError` |
| 模拟实现 | `agent/observer/simulator-agent.ts` | 把前端聊天框当作页面，实现 observe / screenshot / extract / type / click |
| 截图 | `agent/observer/screenshot.ts` | 生成聊天页面 SVG 截图（data URL），可作为多模态上下文/预览 |
| 执行器 | `agent/executor/jev-executor.ts` | 定位输入框 → 输入文本 → 定位发送按钮 → 点击；**DOM 失败 → 截图 → 视觉定位兜底**（可演示） |
| 编排 | `agent/pipeline.ts` | `runAnalysis()`（Emotion+Strategy 并行 JEV 调用、分析缓存 20 条、记忆写入）；`generateReplies()`（复用缓存，重新生成不重复调用 JEV）；`jevStatus()/llmStatus()` |

### 1.4 记忆与配置（memory/）

- `memory/store.ts`：JSON 文件存储（原子写入 tmp+rename、内存缓存）。
- `memory/settings.json`：**JEV 配置（手动输入）**、LLM 配置、双方沟通风格、自动分析开关。
- `memory/relationship-memory.json`：偏好/常用语/沟通模式/重要事件/雷区/常聊话题。
- `memory/conversation-history.json`：情绪时间线（最多 1000 条，`/api/state` 返回最近 50 条）。

### 1.5 HTTP API（routes/api.ts）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | JEV/LLM 配置状态 |
| GET | `/api/state` | 记忆 + 设置（密钥打码）+ 历史 + 状态 |
| PUT | `/api/settings` | 保存 JEV Key / LLM / 风格 / 记忆 / 自动分析；支持 `clearJev`、`clearLlm`；空字符串 Key = 不修改 |
| POST | `/api/observe` | JEV 页面观察 + 截图 + 消息提取 |
| POST | `/api/analyze` | 完整分析（未配置 JEV → 409） |
| POST | `/api/reply` | 生成 1~3 条候选（`variant` 重新生成；未配置 JEV → 409） |
| POST | `/api/send` | JEV 执行填入+发送，返回步骤日志+截图；支持 `simulateDomFailure` |
| POST | `/api/reset-conversation` | 清空分析历史（关系记忆保留） |
| POST | `/api/memory` | 单独更新关系记忆 |

### 1.6 前端（web/）

- `App.tsx`：全局状态与流水线编排（她发言 → 自动分析 → 生成回复；编辑/重新生成/发送；localStorage 持久化，含容量降级）。
- 组件：
  - `ChatWindow` + `MessageBubble`：模拟聊天框（她=左、我/JEV 发送=右），图片附件、回车发送、"是她说的"提示、思考动画；
  - `AnalysisPanel`：情绪 emoji + 置信度 + 强度条 + 态度/诉求/关系状态/紧急度 + 概率分布 + 策略该做/不该做 + 风险卡片；
  - `ReplyPanel`：候选切换（1~3）、可直接编辑、重新生成、复制、发送、生成引擎标识、DOM 失败模拟开关；
  - `JevLogPanel`：页面信息 + 执行步骤日志 + 耗时 + 页面截图预览 + 手动"观察页面"；
  - `MemoryPanel`：关系记忆 + 情绪时间线；
  - `SettingsDrawer`：**JEV 配置（手动输入）**、LLM 配置、双方沟通风格、关系记忆编辑、自动分析开关；
  - `JevSetupModal`：**首次未配置 JEV 时自动弹出**，要求手动粘贴 API Key（Base URL / 模型可改，含清除）。
- `styles.css`：完整主题（卡片/气泡/抽屉/弹窗/响应式）。

### 1.7 JEV Key 手动输入改造（本轮要求）

1. `server/.env` 中 JEV Key 已清空（环境变量仅作可选回退）。
2. Key 只能通过 UI 输入：首次自动弹窗 / 头部状态胶囊 / 设置面板；保存到 `server/data/settings.json`。
3. `GET /api/state`、`/api/health` 只返回 `apiKey: '••••••••'` 与 `configured` 状态。
4. 未配置时 `/api/analyze`、`/api/reply` 返回 **409**，前端自动唤起配置弹窗。
5. 实测流程：未配置 → 409 提示 ✅；手动输入 Key → 分析成功（`jev-1.13.0`）✅；「清除 JEV 配置」→ 回到未配置 ✅。

### 1.8 本次修复的问题

- 服务端/前端全部类型错误清零（`npm run typecheck` 通过）。
- 记忆抽取：支持"你最爱/我最喜欢/讨厌/别再…"，清理首尾"了/的"，扫描最近 2 条她的消息。
- 合成器文案：care 策略主句改口语化，避免"安慰+吃饭"式语义冲突。
- localStorage 图片过大降级保存（仅保留描述）。
- 回复器 `vision` 与 LLM `response_format` 的兼容降级，避免个别网关 400。

### 1.9 验证记录（实测）

| 项目 | 结果 |
| --- | --- |
| `npm run typecheck`（server+web） | ✅ 通过 |
| `npm run build -w web` | ✅ 通过（约 173KB JS / 16KB CSS） |
| 未配置 JEV 时分析 | ✅ 409 + 前端弹窗提示 |
| 手动输入 Key 后分析（PRD 示例对话） | ✅ 情绪「失望」/态度「冷淡」/状态 slightly_unhappy/策略「主动关心」，含置信度、概率分布、风险 watch |
| 长对话场景（"你忙你的/反正我一个人也挺好"） | ✅ 情绪「委屈」（强度 0.67）/意图「试探」/状态「轻微不开心」，策略：先回应情绪、不讲道理、不反问，风险命中「明显误解」 |
| `/api/reply` 首生 + `variant=1` 重新生成 | ✅ 两批候选不同；重新生成命中分析缓存（不再消耗 JEV） |
| `/api/send`（含 DOM 失败 → 截图 → 视觉定位兜底） | ✅ 步骤日志完整 |
| 图片附件（data URL）随消息进入上下文 | ✅ 截图/记忆流程正常 |
| 关系记忆自动抽取 | ✅ 如"可颂""草莓蛋糕"进入偏好 |

---

## 2. PRD 逐条对照

图例：✅ 已完成（按 PRD 意图落地）｜🟡 部分完成/有差异｜❌ 未做

| PRD 章节 | 状态 | 说明 |
| --- | --- | --- |
| §1 项目概述与定位 | ✅ | 定位一致；差异见 §0 的两点架构事实 |
| §2 核心目标（理解情绪而非贴标签） | ✅ | 上下文 + 强度 + 变化提示 + 潜在诉求 + 意图 + 状态 + 紧急度 + 是否需立即回应 |
| §3 Observe→Understand→Decide→Act | ✅ | `agent/pipeline.ts` 完整编排 |
| §4 系统整体架构 | 🟡 | 各层齐全；"Chat Page" 与截图目前是模拟/ SVG |
| §5 JEV 职责（页面观察/提取） | 🟡 | `BrowserAgent` 抽象 + 模拟实现；未接真实浏览器 DOM/消息提取 |
| §6 多模态上下文 | 🟡 | 支持图片上传/展示/入上下文、vision LLM 可带图、截图生成；JEV 本身只收文本（官方限制），未做独立视觉模型看图 |
| §7 Context Builder | ✅ | 含摘要、记忆、双方风格、附件、时间间隔 |
| §8 情绪识别模块（结构化输出） | ✅ | 字段齐全；`emotion_confidence` 来自 JEV choice confidence |
| §9 情绪类型（18 种） | ✅ | 全量实现 |
| §10 情绪强度 0.0~1.0（5 档） | ✅ | JEV score 0~4 → /4，UI 显示档位 |
| §11 意图识别（15 种） | ✅ | 全量实现 |
| §12 关系状态（7 种） | ✅ | 含中文标签映射 |
| §13 Strategy Engine | ✅ | 先决策后生成，策略清单驱动回复 |
| §14 回复策略类型（12 种） | ✅ | choice 主策略 + noul 细项 |
| §15 回复生成（1~3 条候选） | ✅ | LLM 优先，合成器兜底 |
| §16 用户沟通风格 | 🟡 | 手动配置 + 生效于合成器/提示词；**未从历史对话自动学习** |
| §17 关系记忆 | 🟡 | 手动编辑 + 正则自动抽取 + 情绪时间线；未做 LLM 归纳/长期摘要 |
| §18 核心 System Prompt | ✅ | LLM 路径原样使用 |
| §19 AI 返回格式 | 🟡 | 代码把 JEV answers + 策略组装成等价结构（含 `recommended_reply`）；但"一次 JSON 全量返回"由 JEV+LLM 两段式实现 |
| §20 前端界面（悬浮面板） | 🟡 | 实现为右侧常驻面板 + 弹窗，非浏览器注入式悬浮窗（未做浏览器扩展/页面注入） |
| §21 回复确认机制 | ✅ | 第一阶段强制人工确认，无自动发送 |
| §22 JEV Action（含视觉兜底） | ✅ | 模拟执行含"DOM 失败→截图→视觉定位"演示 |
| §23 Agent Loop | 🟡 | 手动触发版循环（发消息即分析）；**未做页面监听自动循环** |
| §24 MVP 第一阶段范围 | ✅ | JEV 侧为模拟实现（唯一差距） |
| §25 MVP 流程 1~14 步 | ✅ | 全流程可走通（2/3/4 步为模拟观察） |
| §26 第二阶段（长期记忆/风格/效果分析） | ❌ | 仅关系记忆基础；效果反馈、风格学习、历史情绪分析未做 |
| §27 第三阶段（主动感知/提醒） | ❌ | 未做新消息监听与"连发 4 条情绪下降"提醒 |
| §28 第四阶段（半自动 Agent） | ❌ | 未做自动填充待确认 |
| §29 Manual / Semi-Auto / Auto | 🟡 | Manual ✅；Semi-Auto ❌；Auto ❌ |
| §30 风险控制 | 🟡 | 8 类敏感话题检测 + confidence<0.7 + 禁止自动发送 ✅；频率限制/连续回复上限/人工接管（属 Auto 阶段）❌ |
| §31 技术模块划分 | ✅ | 目录基本一致，另加 `risk-control`、`pipeline`、`simulator-agent`、`JevSetupModal` |
| §32 核心数据结构 | ✅ | `Message/EmotionAnalysis/ReplySuggestion` + 扩展字段 |
| §33 AI Provider 抽象 | 🟡 | JevClient/LlmClient 已抽象，业务不依赖具体模型；未做"多 provider 配置与切换 UI" |
| §34 JEV 层抽象 | ✅ | `BrowserAgent` 接口 |
| §35 七条核心原则 | ✅ | 原则 5（人工确认）、原则 6（不凭一句话判断）、原则 7（允许不确定）均有实现 |
| §36 最终产品形态 | 🟡 | 分析面板+推荐回复+按钮 ✅；"自动发现新消息" ❌ |
| §37 总结（Agent Loop 同构） | ✅ | 架构与职责划分一致 |

**完成度概览：✅ 22 项 / 🟡 15 项 / ❌ 3 项（均为第三、四阶段能力）**

---

## 3. 已知问题与技术债

1. **JEV 置信度波动**：对话过短时 `context_sufficient` 会压低 confidence（这是预期行为），但短消息场景建议多补两条上下文。
2. **本地合成器文案上限有限**：无 LLM Key 时回复偏模板化；配置 LLM 后质量显著提升（推荐 DeepSeek/Qwen/GPT）。
3. **正则记忆抽取有噪声**：例如"别人骗我/骗我"可能并存；后续可加归一化或 LLM 归纳。
4. **API Key 明文存储**：本机 `server/data/settings.json`（已 gitignore），未做加密/系统钥匙串（keytar）。
5. **对话记录只在前端 localStorage**（服务端仅存分析历史）；清浏览器缓存会丢对话，关系记忆/历史保留。
6. **分析缓存**为内存数组（最多 20 条），重启即失效；无持久化。
7. **无自动化测试**：无单测/E2E；目前依赖 typecheck + 手工 curl 验证。
8. **LLM 多模态路径未实测**（缺多模态 Key）。
9. **未接真实浏览器自动化**：PRD 假设 JEV 负责浏览器操作，实际需自建（Playwright/CDP）。

---

## 4. 下次从哪里开始（建议路线）

### P0 — 立刻可做（半天内）

1. **配置 LLM Key，体验真实 AI 回复**：界面 → 设置 → AI 生成引擎（LLM），填 Base URL / Key / 模型（如 `deepseek-chat`）；多模态模型勾选"支持图片输入"。
   - 验收：`/api/reply` 返回 `replySource: "llm"`，候选不再是模板句。
2. **补最小测试集**（防回归）：
   - 后端：`memory-builder`（正则抽取）、`risk-control`（阈值）、`composer`（长度/表情规则）、JEV 响应解析（mock JSON）；
   - 建议 `vitest`，`server/src/**/*.test.ts`。
3. **替换真实浏览器自动化（Phase-1 的关键缺口）**：
   - 新建 `server/src/agent/observer/playwright-agent.ts` 实现 `BrowserAgent`；
   - 接口：`server/src/agent/observer/page-observer.ts`；只需在 `pipeline.ts` 里把 `new SimulatorBrowserAgent()` 换成新实现；
   - 目标页面建议先用本地 mock 聊天页，再考虑微信网页版（需登录态，注意合规）。

### P1 — 第三阶段能力（1~2 天）

4. **新消息监听 + 主动提醒**：
   - 前端/后端增加轮询或 SSE/WebSocket；或在 Playwright 侧用 `MutationObserver`/DOM 事件；
   - 触发规则：对方连发 ≥3 条 或 情绪强度连续上升 → 弹提醒（PRD §27）。
5. **Semi-Auto**：把推荐回复"自动填入输入框"但**不点击发送**（在 `jev-executor.ts` 里拆成 `type()` 与 `send()` 两步，前端增加"已填入，等你确认"状态）。

### P2 — 第二阶段能力（长期记忆增强）

6. **说话风格自动学习**：统计用户消息长度/表情/口头禅 → 更新 `userCommunicationStyle`（`memory/user-profile.ts`）。
7. **回复效果反馈闭环**：发送后让用户标记"有效/无效"，记录到 `conversation-history.json`，用于修正策略权重（`pipeline.ts` + `ReplyPanel`）。
8. **记忆归纳升级**：用 LLM 对近 N 条对话做摘要/实体抽取，替代纯正则（`memory-builder.ts`）。

### P3 — Auto 模式

9. Auto 发送 + 完整风控：发送频率限制、最大连续回复次数、敏感话题强制人工接管、全局开关（PRD §29/§30）。

### 明确的入口文件（便于接手）

```text
接真实浏览器    → server/src/agent/observer/page-observer.ts + simulator-agent.ts（替换实现，同步 pipeline.ts）
改 JEV 问题集   → server/src/ai/schemas/questions.ts
改情绪/策略逻辑 → server/src/agent/emotion/emotion-engine.ts、agent/strategy/strategy-engine.ts
改回复生成      → server/src/agent/reply/reply-generator.ts（LLM）、reply/composer.ts（本地）
改提示词        → server/src/ai/prompts/system.ts
改风险规则      → server/src/agent/strategy/risk-control.ts
改前端流程/UI   → web/src/App.tsx、web/src/components/*、web/src/styles.css
改接口          → server/src/routes/api.ts
```

---

## 5. 运行与验证速查

```bash
npm install          # 首次
npm run dev          # web http://localhost:5173 + server http://localhost:8787
npm run typecheck    # 类型检查（server + web）
npm run build && npm start   # 生产模式，单端口 8787
```

```bash
# 健康检查 / 配置状态
curl -s localhost:8787/api/health

# 分析（未配置 JEV 会返回 409）
curl -s -X POST localhost:8787/api/analyze -H 'Content-Type: application/json' \
  -d '{"messages":[{"id":"1","role":"other","content":"没怎么","timestamp":1789000240000}]}'

# 手动写入 JEV Key（等价于界面输入）
curl -s -X PUT localhost:8787/api/settings -H 'Content-Type: application/json' \
  -d '{"jev":{"apiKey":"apikey_xxx","baseUrl":"https://api.typesafe.ai/v1","model":"jev-latest"}}'
```

数据文件（均已 gitignore）：`server/data/settings.json`、`relationship-memory.json`、`conversation-history.json`；
浏览器端对话缓存：localStorage `ai-relationship-copilot.messages.v1`。

---

## 6. 关键设计决策记录（ADR 摘要）

1. **JEV 只做决策，不做文本**：用两次并行 JEV 调用（Emotion 组问题 / Strategy+Risk 组问题）替代"一次返回全部 JSON"，再由代码组装成 PRD §19 结构；回复文本交给 LLM（可插拔）。
2. **分析缓存按对话指纹**（条数 + 最后一条），重新生成/连续操作不重复消耗 JEV，设置变更即失效。
3. **BrowserAgent 抽象先行为主**：即使当前是模拟实现，也让未来接真实浏览器零重构。
4. **Key 输入收敛到设置面板**：不写死在代码/环境变量；服务端打码、前端不回显、支持清除。
5. **风险控制优先级高于自动化**：`confidence < 0.7` 或命中敏感话题时只给建议 + 明确提示，第一阶段一律人工确认。