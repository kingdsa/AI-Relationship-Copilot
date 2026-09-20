# AI Relationship Copilot

## 1. 项目概述

### 1.1 项目名称

**AI Relationship Copilot**

### 1.2 项目定位

这是一个基于 **JEV + 多模态大模型 + 浏览器自动化** 的 AI 聊天辅助系统。

系统通过 JEV 获取当前聊天页面的视觉信息、DOM 信息以及聊天上下文，将聊天内容交给 AI 进行：

- 聊天内容提取
- 情绪识别
- 语气识别
- 用户意图分析
- 关系状态分析
- 回复策略制定
- 回复内容生成

最终由 JEV 将 AI 生成的回复填入聊天输入框。

第一阶段以**辅助回复**为主，由用户确认后发送；后续可以扩展为自动化回复。

---

# 2. 核心目标

系统需要解决两个核心问题：

### 问题一：理解对方当前的情绪

不能只判断：

- 开心
- 生气
- 难过
- 平静

而应该结合上下文分析：

- 当前情绪
- 情绪强度
- 情绪变化
- 潜在诉求
- 沟通意图
- 当前关系状态
- 是否需要立即回应

例如：

```text
女朋友：
你晚上回来吗？

用户：
应该回来吧

女朋友：
哦

用户：
怎么了？

女朋友：
没怎么
```

系统应该理解：

```json
{
  "emotion": "委屈",
  "emotion_confidence": 0.82,
  "attitude": "冷淡",
  "intent": "希望获得主动关心",
  "relationship_state": "轻微不开心",
  "urgency": "medium"
}
```

而不是简单判断：

```json
{
  "emotion": "平静"
}
```

---

# 3. 核心设计理念

系统采用：

```text
Observe
   ↓
Understand
   ↓
Decide
   ↓
Act
```

对应：

```text
JEV 获取聊天页面
        ↓
AI 理解聊天上下文
        ↓
AI 制定回复策略
        ↓
AI 生成回复
        ↓
JEV 执行输入/发送
```

---

# 4. 系统整体架构

```text
┌───────────────────────────────┐
│           Chat Page           │
│                               │
│  对方消息 / 图片 / 表情 / 时间 │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│             JEV               │
│                               │
│  Page Observation             │
│  Screenshot                   │
│  DOM / Text Extraction        │
│  Element Detection            │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│       Context Builder         │
│                               │
│  当前消息                      │
│  最近聊天记录                  │
│  图片                          │
│  表情                          │
│  时间                          │
│  历史上下文                    │
│  用户关系记忆                  │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│        Emotion Engine         │
│                               │
│  情绪识别                      │
│  情绪强度                      │
│  语气分析                      │
│  意图分析                      │
│  关系状态分析                  │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│       Strategy Engine         │
│                               │
│  安慰                          │
│  道歉                          │
│  解释                          │
│  陪伴                          │
│  调侃                          │
│  转移话题                      │
│  主动关心                      │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│       Reply Generator         │
│                               │
│  生成 1~3 个候选回复            │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│             JEV               │
│                               │
│  找到输入框                    │
│  填入回复                      │
│  用户确认                      │
│  点击发送                      │
└───────────────────────────────┘
```

---

# 5. JEV 职责

JEV 不负责最终的情绪判断和回复生成。

JEV 主要负责：

## 5.1 页面观察

获取当前聊天页面：

- 页面截图
- DOM
- 文本
- 可交互元素
- 输入框
- 发送按钮

## 5.2 聊天消息提取

识别：

- 对方最新消息
- 用户发送的消息
- 最近 N 条聊天记录
- 消息发送时间
- 图片
- 表情
- 引用消息
- 回复消息
- 撤回消息

输出统一结构。

```json
{
  "messages": [
    {
      "role": "other",
      "content": "你晚上回来吗？",
      "timestamp": "19:21"
    },
    {
      "role": "user",
      "content": "应该回来吧",
      "timestamp": "19:22"
    },
    {
      "role": "other",
      "content": "哦",
      "timestamp": "19:22"
    }
  ]
}
```

---

# 6. 多模态上下文

系统必须支持图片作为 AI 上下文。

JEV 可以获取：

```text
聊天截图
      ↓
图片输入
      ↓
多模态模型
      ↓
视觉 + 文本联合分析
```

图片可能包含：

- 聊天截图
- 表情包
- 对方发送的照片
- 商品图片
- 食物图片
- 风景图片
- 截图
- 社交媒体内容

AI 应结合图片与文字判断语境。

---

# 7. Context Builder

Context Builder 是整个系统的上下文构建层。

## 7.1 输入

```text
当前页面
最近聊天记录
截图
图片
历史记忆
用户信息
关系信息
```

## 7.2 输出

```json
{
  "current_message": {},
  "recent_messages": [],
  "attachments": [],
  "conversation_summary": "",
  "relationship_memory": {},
  "user_communication_style": {},
  "other_person_communication_style": {}
}
```

---

# 8. 情绪识别模块

Emotion Engine 必须输出结构化数据。

```json
{
  "emotion": "委屈",
  "emotion_confidence": 0.87,
  "emotion_intensity": 0.72,
  "attitude": "冷淡",
  "intent": "希望被主动关心",
  "relationship_state": "轻微不开心",
  "urgency": "medium"
}
```

---

# 9. 情绪类型

第一阶段支持：

```text
开心
兴奋
期待
平静
疑惑
尴尬
害羞
委屈
失望
难过
生气
焦虑
冷淡
烦躁
撒娇
暧昧
无奈
疲惫
```

后续允许扩展。

---

# 10. 情绪强度

使用：

```text
0.0 ~ 1.0
```

例如：

```text
0.0 - 0.2   几乎没有
0.2 - 0.4   轻微
0.4 - 0.6   中等
0.6 - 0.8   明显
0.8 - 1.0   强烈
```

---

# 11. 意图识别

AI 需要识别：

```text
主动分享
寻求关注
寻求安慰
表达不满
表达开心
寻求建议
询问问题
撒娇
试探
道歉
拒绝
结束话题
希望陪伴
希望解释
希望解决问题
```

---

# 12. 关系状态

建议：

```text
normal
happy
intimate
slightly_unhappy
conflict
cold
reconciliation
```

---

# 13. Strategy Engine

AI 在生成回复之前必须先生成沟通策略。

例如：

```json
{
  "strategy": [
    "先回应对方情绪",
    "主动表达关心",
    "不要立即解释原因",
    "不要讲道理",
    "不要反问对方为什么生气",
    "给对方表达空间"
  ]
}
```

---

# 14. 回复策略类型

支持：

```text
comfort
apology
explanation
care
companionship
humor
flirting
question
topic_change
reassurance
celebration
normal_reply
```

---

# 15. 回复生成

回复生成器根据：

```text
当前消息
+
聊天历史
+
情绪分析
+
关系状态
+
沟通策略
+
用户个人沟通风格
```

生成候选回复。

建议一次生成：

```text
1~3 条
```

---

# 16. 用户沟通风格

系统应该建立用户画像，但仅用于改善回复风格。

例如：

```json
{
  "communication_style": {
    "personality": "直白",
    "tone": "自然",
    "humor": "medium",
    "emoji_usage": "low",
    "message_length": "short",
    "preferred_style": "natural"
  }
}
```

避免 AI 生成完全不像用户本人说话的内容。

---

# 17. 关系记忆

系统需要支持长期记忆。

```json
{
  "relationship_memory": {
    "preferences": [],
    "common_phrases": [],
    "communication_patterns": [],
    "important_events": [],
    "known_triggers": [],
    "favorite_topics": []
  }
}
```

注意：

> 历史沟通模式不能作为绝对规则，必须结合当前上下文判断。

---

# 18. AI Prompt

核心 System Prompt：

```text
你是一个恋爱关系聊天辅助 AI。

你的任务不是机械理解文字，而是结合上下文理解对方当前可能的情绪、意图和沟通需求。

你必须综合考虑：

1. 当前消息
2. 最近聊天记录
3. 消息发送顺序
4. 消息间隔
5. 表情
6. 图片
7. 历史沟通模式
8. 双方关系状态

不要仅根据单句话判断情绪。

例如：

“没事”
“随便”
“哦”
“你忙吧”

都不能直接判断为某种固定情绪。

请先判断：

- emotion
- emotion_confidence
- emotion_intensity
- attitude
- intent
- relationship_state
- urgency

然后制定：

- reply_strategy

最后生成：

- recommended_reply

如果上下文不足，不要假装确定。
可以降低 confidence，并说明需要更多上下文。

输出必须为 JSON。
```

---

# 19. AI 返回格式

```json
{
  "emotion": "委屈",
  "emotion_confidence": 0.87,
  "emotion_intensity": 0.72,
  "attitude": "冷淡",
  "intent": "希望被主动关心",
  "relationship_state": "slightly_unhappy",
  "urgency": "medium",
  "reply_strategy": [
    "主动关心",
    "先回应情绪",
    "不要立即解释",
    "给对方表达空间"
  ],
  "recommended_reply": "感觉你好像有点不开心，是不是我刚刚哪里让你不舒服了？你跟我说说，我听着呢。"
}
```

---

# 20. 前端界面

第一阶段不需要复杂 UI。

建议做一个悬浮 AI 面板：

```text
┌─────────────────────────────┐
│ AI Relationship Copilot     │
├─────────────────────────────┤
│                             │
│ 情绪：委屈                  │
│ 强度：72%                   │
│ 意图：希望被主动关心        │
│ 状态：轻微不开心            │
│                             │
├─────────────────────────────┤
│ 回复建议                    │
│                             │
│ 感觉你好像有点不开心，是不是 │
│ 我刚刚哪里让你不舒服了？     │
│ 你跟我说说，我听着呢。       │
│                             │
│ [发送] [重新生成] [编辑]     │
└─────────────────────────────┘
```

---

# 21. 回复确认机制

第一阶段必须由用户确认。

流程：

```text
AI 分析
 ↓
生成回复
 ↓
展示回复
 ↓
用户修改/确认
 ↓
JEV 输入
 ↓
用户点击发送
```

不允许第一阶段直接自动发送。

---

# 22. JEV Action

当用户点击发送时：

```text
JEV
 ↓
定位聊天输入框
 ↓
输入文本
 ↓
定位发送按钮
 ↓
点击发送
```

如果页面结构发生变化：

```text
DOM 定位失败
      ↓
截图
      ↓
JEV 视觉定位
      ↓
重新定位元素
```

---

# 23. Agent Loop

整个系统最终形成 Agent Loop：

```text
┌───────────┐
│  Observe  │
└─────┬─────┘
      ↓
┌───────────┐
│ Understand│
└─────┬─────┘
      ↓
┌───────────┐
│   Decide  │
└─────┬─────┘
      ↓
┌───────────┐
│    Act    │
└─────┬─────┘
      ↓
     Wait
      ↓
  New Message
      ↓
   Observe
```

---

# 24. MVP 第一阶段

第一阶段只实现：

### JEV

- 获取聊天页面
- 获取截图
- 提取聊天文本
- 定位输入框
- 定位发送按钮

### AI

- 情绪分析
- 情绪强度
- 意图分析
- 回复策略
- 回复生成

### UI

- 情绪展示
- AI 分析结果
- 推荐回复
- 重新生成
- 编辑回复
- 手动发送

---

# 25. MVP 流程

```text
1. 用户打开聊天页面
2. JEV 获取当前页面
3. JEV 获取最近聊天记录
4. JEV 获取当前截图
5. Context Builder 构建上下文
6. AI 分析情绪
7. AI 分析意图
8. AI 分析关系状态
9. AI 制定回复策略
10. AI 生成回复
11. 前端展示分析结果
12. 用户确认
13. JEV 输入回复
14. 用户点击发送
```

---

# 26. 第二阶段

加入：

```text
长期记忆
+
用户说话风格
+
对方说话风格
+
历史情绪分析
+
历史回复效果
```

建立：

```text
Relationship Memory
```

进一步分析：

```text
什么时候容易产生矛盾
什么类型的回复效果更好
什么表达容易让对方不舒服
```

---

# 27. 第三阶段

增加主动感知：

```text
监听聊天页面
       ↓
检测新消息
       ↓
自动触发 AI 分析
       ↓
判断是否需要提醒
```

例如：

```text
🔔 AI 提醒

检测到对方连续发送 4 条消息，
且最后两条消息情绪明显下降。

建议主动回复。
```

---

# 28. 第四阶段

实现半自动 Agent：

```text
收到消息
 ↓
JEV 获取上下文
 ↓
AI 判断
 ↓
AI 生成回复
 ↓
JEV 填充输入框
 ↓
等待用户确认
 ↓
发送
```

---

# 29. 后续自动化模式

可以增加：

```text
Manual
Semi-Auto
Auto
```

### Manual

AI 只负责分析。

### Semi-Auto

AI 自动填入输入框，但用户确认发送。

### Auto

AI 自动生成并发送。

自动模式必须增加：

- 风险控制
- 敏感话题检测
- 高情绪状态检测
- 发送频率限制
- 最大连续回复次数
- 人工接管
- 自动模式开关

---

# 30. 风险控制

以下情况禁止自动发送：

```text
严重争吵
分手相关
金钱相关
健康相关
家庭重大问题
法律问题
重大承诺
明显误解
AI confidence < 0.7
```

这些情况下：

```text
AI 只生成建议
↓
用户人工确认
```

---

# 31. 技术模块划分

建议项目结构：

```text
src/
├── agent/
│   ├── observer/
│   │   ├── page-observer
│   │   └── screenshot
│   │
│   ├── context/
│   │   ├── context-builder
│   │   └── memory-builder
│   │
│   ├── emotion/
│   │   └── emotion-engine
│   │
│   ├── strategy/
│   │   └── strategy-engine
│   │
│   ├── reply/
│   │   └── reply-generator
│   │
│   └── executor/
│       └── jev-executor
│
├── ai/
│   ├── client
│   ├── prompts
│   └── schemas
│
├── memory/
│   ├── relationship-memory
│   ├── user-profile
│   └── conversation-history
│
├── ui/
│   ├── analysis-panel
│   ├── reply-panel
│   └── settings
│
└── types/
    ├── message
    ├── emotion
    ├── strategy
    └── reply
```

---

# 32. 核心数据结构

## Message

```typescript
interface Message {
  id: string
  role: 'user' | 'other'
  content: string
  timestamp: number
  attachments?: Attachment[]
}
```

## EmotionAnalysis

```typescript
interface EmotionAnalysis {
  emotion: string
  confidence: number
  intensity: number
  attitude: string
  intent: string
  relationshipState: string
  urgency: 'low' | 'medium' | 'high'
}
```

## ReplySuggestion

```typescript
interface ReplySuggestion {
  content: string
  strategy: string[]
  confidence: number
}
```

---

# 33. AI Provider

AI 层必须进行抽象，不允许业务代码直接依赖具体模型。

```typescript
interface AIProvider {
  analyzeEmotion(
    context: ConversationContext
  ): Promise<EmotionAnalysis>

  generateReply(
    context: ConversationContext,
    strategy: ReplyStrategy
  ): Promise<ReplySuggestion[]>
}
```

以后可以自由切换：

```text
OpenAI
Claude
Gemini
DeepSeek
Kimi
Qwen
其他兼容 OpenAI API 的模型
```

---

# 34. JEV 层抽象

不要让业务代码直接依赖 JEV API。

```typescript
interface BrowserAgent {
  observe(): Promise<PageState>

  getScreenshot(): Promise<string>

  extractMessages(): Promise<Message[]>

  findInput(): Promise<Element>

  typeText(
    element: Element,
    text: string
  ): Promise<void>

  click(
    element: Element
  ): Promise<void>
}
```

这样以后即使 JEV 更换，也不需要重构整个业务层。

---

# 35. 核心原则

### 原则 1

**JEV 负责观察和行动。**

### 原则 2

**AI 负责理解和决策。**

### 原则 3

**Context Builder 负责提供完整上下文。**

### 原则 4

**Memory 负责长期关系信息。**

### 原则 5

**第一阶段必须人工确认。**

### 原则 6

**AI 不应该仅根据单句话判断情绪。**

### 原则 7

**所有 AI 判断都必须允许不确定。**

---

# 36. 最终产品形态

最终用户体验：

```text
女朋友发消息
      ↓
JEV 自动发现新消息
      ↓
获取最近聊天记录 + 截图
      ↓
AI 分析
      ↓

┌───────────────────────────────┐
│ ❤️ AI 分析                    │
│                               │
│ 当前情绪：委屈                │
│ 情绪强度：72%                 │
│ 潜在诉求：希望被主动关心      │
│ 当前状态：轻微不开心          │
│                               │
│ 建议：                         │
│ 先关心，不要马上解释原因。    │
│                               │
│ 推荐回复：                    │
│ “感觉你好像有点不开心，        │
│ 是不是我刚刚哪里让你不舒服了？ │
│ 你跟我说说，我听着呢。”       │
│                               │
│ [编辑] [重新生成] [发送]      │
└───────────────────────────────┘
```

---

# 37. 总结

整个项目本质上不是一个简单的“AI 回复器”，而是一个基于 JEV 的 **视觉 Agent + Relationship AI Copilot**。

核心职责：

```text
JEV
= 眼睛 + 手

LLM
= 大脑

Context Builder
= 上下文

Memory
= 长期记忆

Emotion Engine
= 情绪理解

Strategy Engine
= 沟通决策

Reply Generator
= 语言表达
```

最终形成：

```text
Observe
  ↓
Understand
  ↓
Decide
  ↓
Act
  ↓
Observe
```

即一个完整的 Relationship AI Agent Loop。
