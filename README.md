# AI Relationship Copilot

基于 **JEV（TypeSafe System One 决策模型）+ LLM + 浏览器 Agent 抽象** 的恋爱关系聊天辅助系统。

系统遵循 `Observe → Understand → Decide → Act` 的 Agent Loop：

```text
你输入女朋友说的话（模拟聊天框）
        ↓
JEV 观察/提取聊天上下文（Observe / Extract）
        ↓
Emotion Engine + Strategy Engine（Understand / Decide，JEV 类型化决策）
        ↓
Reply Generator（Act：LLM 生成自然语言回复，未配置 LLM 时用本地合成器）
        ↓
JEV Executor：定位输入框 → 输入文本 → 定位发送按钮 → 点击发送
        ↓
你确认后发送（第一阶段强制人工确认）
```

## 1. 两个引擎的分工

| 模块 | 职责 | 实现 |
| --- | --- | --- |
| JEV (`api.typesafe.ai/v1/systemone`) | 情绪 / 情绪强度 / 态度 / 意图 / 关系状态 / 紧急度 / 回复策略（noul·choice·score 类型化决策，不产生自由文本） | `server/src/agent/emotion`、`server/src/agent/strategy` |
| LLM（可选，OpenAI 兼容） | 把 JEV 的决策表达成自然的、像"你本人"说的中文回复 | `server/src/ai/client/llm-client.ts`、`server/src/agent/reply` |
| 本地回复合成器 | 没有 LLM Key 时的兜底：用 JEV 的情绪 + 策略组合出中文回复 | `server/src/agent/reply/composer.ts` |

> JEV 是决策模型（不生成文本）。因此"回复内容"部分由 LLM 完成；不配置 LLM 时，系统用内置合成器兜底，功能完整可用。

## 2. 快速开始

```bash
# 1. 安装依赖（npm workspaces：server + web）
npm install

# 2. 启动（同时启动后端 8787 与前端 5173）
npm run dev
```

打开 <http://localhost:5173>。

生产模式（后端同时托管前端构建产物）：

```bash
npm run build
npm start          # http://localhost:8787
```

## 3. 配置与数据（全部保存在浏览器本地，服务端无状态）

启动后首次打开页面会弹出 **「配置 JEV API Key」** 弹窗，请手动粘贴你自己的 Key：

- 也可随时点击右上角状态胶囊 **「JEV 未配置 · 点击输入 Key」** 或 **设置 → JEV 决策引擎** 修改；
- Key / Base URL / 模型只保存在**你自己的浏览器**（localStorage，key `ai-relationship-copilot.credentials.v1`），随每个请求通过请求头发给服务端；
- 服务端**不保存密钥、不读取密钥环境变量**；多人共用同一部署时，每个人用的都是自己的 Key 和 Base URL，互不覆盖；
- 清除：设置面板中的「清除 JEV 配置」后点击「保存设置」（LLM 同理）；
- 可选：在设置面板填写 OpenAI 兼容的 LLM（更自然的回复文本），凭据同样只存在浏览器本地；
- 沟通风格、关系记忆、情绪时间线/分析历史同样只存在浏览器本地（key `ai-relationship-copilot.profile.v1`），随请求发送给服务端计算后返回，服务端**不落盘**（`server/data` 已废弃）。

localStorage 一览：

| key | 内容 |
| --- | --- |
| `ai-relationship-copilot.credentials.v1` | JEV / LLM 的 apiKey、baseUrl、model、vision |
| `ai-relationship-copilot.profile.v1` | 双方沟通风格、自动分析开关、关系记忆、情绪时间线 |
| `ai-relationship-copilot.messages.v1` | 聊天框对话记录 |

若使用多模态模型，勾选"该模型支持图片输入"，她发来的图片会一起发给 LLM。

## 4. 使用方式（模拟聊天框）

- 聊天框里你输入的内容 = **女朋友（她）说的话**（支持回车发送、支持发图片）。
- 发送后系统自动执行：`JEV 分析 → 策略 → 生成 1~3 条候选回复`。
- 右侧面板展示：
  - **情绪**（18 种）、置信度、情绪强度、态度、潜在诉求、关系状态、紧急度；
  - **沟通策略**（该做的 ✓ / 不该做的 ✕）；
  - **风险控制**（分手 / 金钱 / 健康 / 家庭 / 法律 / 重大承诺 / 争吵升级 / 明显误解，置信度 < 0.7）；
  - **回复建议**：可切换候选、直接编辑、重新生成（不重复调用 JEV，走缓存）、复制；
  - **JEV 观察/执行**：页面观察、执行日志（含"模拟 DOM 定位失败 → 截图 → 视觉定位"兜底演示）、页面截图、耗时；
  - **关系记忆与情绪时间线**。
- 点击 **发送** → JEV 执行"定位输入框 → 输入文本 → 点击发送"，回复以"我"的身份进入对话（标记 `JEV 发送`）。

## 5. 主要 API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 当前请求（按请求头凭据）的 JEV / LLM 配置状态 |
| POST | `/api/observe` | JEV 页面观察 + 截图 + 消息提取 |
| POST | `/api/analyze` | Context Builder + Emotion Engine + Strategy Engine + 风险控制；返回合并后的记忆与时间线记录 |
| POST | `/api/reply` | Reply Generator（复用分析缓存，`variant` 控制重新生成） |
| POST | `/api/send` | JEV Executor：定位输入框 → 输入 → 点击发送 |

`/api/analyze`、`/api/reply` 的请求体需带 `profile`（风格 + 关系记忆），返回的 `relationshipMemory` / `historyRecord` 由前端写入 localStorage。

## 6. 目录结构（对应 PRD §31）

```text
server/src/
├── agent/
│   ├── observer/     # page-observer(JEV 抽象)、simulator-agent、screenshot
│   ├── context/      # context-builder、memory-builder、profile(校验/合并)
│   ├── emotion/      # emotion-engine
│   ├── strategy/     # strategy-engine、risk-control
│   ├── reply/        # reply-generator、composer
│   ├── executor/     # jev-executor
│   └── pipeline.ts   # 编排：Observe→Understand→Decide→Act
├── ai/
│   ├── client/       # jev-client、llm-client
│   ├── credentials.ts # 从请求头解析调用者凭据（服务端不落盘）
│   ├── prompts/      # PRD §18 System Prompt
│   └── schemas/      # JEV 问题定义（choice / score / noul）
├── routes/           # HTTP API（无状态：凭据走请求头，画像走请求体）
└── types/            # message / emotion / strategy / reply

web/src/
├── components/       # ChatWindow、AnalysisPanel、ReplyPanel、JevLogPanel、MemoryPanel、SettingsDrawer
├── credentials.ts    # 凭据存 localStorage + 组装请求头
├── profile.ts        # 风格/关系记忆/时间线存 localStorage
├── api.ts、types.ts、App.tsx
```

## 7. 接入真实浏览器自动化

业务代码只依赖 `BrowserAgent` 接口（`server/src/agent/observer/page-observer.ts`）：

```ts
observe() / getScreenshot() / extractMessages() / findInput() / typeText() / click()
```

当前使用 `SimulatorBrowserAgent`（把前端聊天框当作聊天页面）。替换为真实实现（Playwright / CDP / JEV 浏览器自动化）即可接入微信网页版等页面，其他模块无需改动。

## 8. 风险控制与阶段说明

- 第一阶段（Manual）：**所有回复必须由你确认后发送**，不会自动发送。
- `JEV confidence < 0.7` 或涉及敏感话题时，界面会给出风险提示，仅生成建议。
- 后续扩展方向：Semi-Auto（自动填入输入框）、Auto（自动发送 + 频率限制 + 人工接管）等（PRD §29/§30）。