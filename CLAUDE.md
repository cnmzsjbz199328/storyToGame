# CLAUDE.md — Story-to-Game 项目最佳实践指南

## 项目概览

**Story-to-Game** 是以 [Shanyin-ai/Story-to-game](https://github.com/Shanyin-ai/Story-to-game) 为核心的分支叙事游戏平台。

**核心机制**：通过内置的 `/story-to-game` Claude Code Skill（终端驱动），将任意叙事文本（小说/剧本/大纲）经过 9 步 AI 改写工作流生成标准 JSON 剧本，再由 React 前端承载演播与编辑。

**无服务端、无外部 API**：纯静态 Vite SPA，无需 Gemini/OpenAI 等云服务。

---

## 技术栈

| 层次 | 技术 |
|---|---|
| 前端框架 | React 19 + TypeScript 5.8 |
| 构建工具 | Vite 6（纯静态 SPA） |
| 样式 | Tailwind CSS 4（`@tailwindcss/vite`） |
| 动画 | Framer Motion（`motion/react`） |
| 图标 | lucide-react |
| 核心 Skill | `.claude/commands/story-to-game.md`（Claude Code 命令） |
| JSON 验证 | `scripts/validate.py`（Python 3，8 项连通性检验） |

---

## 项目结构

```
storyToGame/
├── .claude/
│   └── commands/
│       ├── story-to-game.md          # /story-to-game 技能主文件（Shanyin-ai 原版）
│       └── references/               # 技能工作流 6 个参考文档
│           ├── json-format-spec.md   # JSON 格式速查（所有字段定义）
│           ├── step1-ingestion.md    # 原作摄入与记忆索引
│           ├── step2-style.md        # 风格指纹提取
│           ├── step3-structure.md    # 结构拆解与分支点识别
│           ├── step4-system.md       # 状态系统与结局矩阵设计
│           ├── step5-writing.md      # 分段写作（9 步中最长）
│           └── step6-validation.md  # 连通性验证
├── scripts/
│   └── validate.py                   # 8 项 JSON 自动验证脚本
├── public/
│   └── stories/                      # 静态预置剧本（新格式 JSON）
│       └── midnight-castle.json
├── src/
│   ├── main.tsx
│   ├── App.tsx                       # 四页签路由（library/play/edit/skill）
│   ├── types.ts                      # 核心 TypeScript 类型（原项目标准格式）
│   └── components/
│       ├── StoryLib.tsx              # 剧本大厅：预置加载 + 本地 JSON 导入
│       ├── StoryPlayer.tsx           # 演播厅：segments/routes/val/flags/achievements
│       ├── StoryEditor.tsx           # 编译器：节点编辑 + 逻辑验证 + JSON 导入导出
│       └── SkillWorkshop.tsx         # 技能工坊：/story-to-game 使用指南
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 核心 JSON 格式（原项目标准）

所有剧本 JSON 必须遵循此格式，由 `src/types.ts` 的 TypeScript 类型定义保证。

### 顶层结构

```json
{
  "meta": {
    "title": "作品标题",
    "author": "作者名",
    "version": "1.0.0",
    "description": "作品简介",
    "theme": "noir",
    "ambient": "rain",
    "variableName": "缝线",
    "initialVariable": 38
  },
  "startNodeId": "start",
  "variables": { "has_key": false, "trust": 0 },
  "achievements": {
    "ach_id": { "title": "成就标题", "description": "成就描述。" }
  },
  "nodes": { ... }
}
```

### 节点结构

```json
{
  "node_id": {
    "chapterTitle": "第一章：...",
    "title": "场景标题",
    "scene": {
      "id": "scene_id",
      "name": "场景名",
      "type": "major",
      "description": "环境描述",
      "arrival": "到达时的叙述"
    },
    "progress": 5,
    "segments": [
      { "text": "叙述文本。" },
      { "speaker": "角色名", "text": "对白。", "effect": "glitch" }
    ],
    "choices": [
      {
        "text": "选项文字",
        "next": "目标节点ID",
        "condition": "val >= 60",
        "changes": {
          "val": 10,
          "set": { "has_key": true },
          "addFlag": "key_taken",
          "importantFlag": { "flag": "key_taken", "label": "拾起了钥匙" },
          "unlockAchievement": "ach_id"
        }
      }
    ],
    "routes": [
      { "condition": "hasFlag 'key_taken'", "next": "win_node" },
      { "condition": "default", "next": "normal_path" }
    ],
    "next": "auto_next_node_id"
  }
}
```

### 结局节点

```json
{
  "ending_id": {
    "isEnding": true,
    "title_end": "结局标题",
    "type": "TRUE ENDING",
    "progress": 100,
    "description": "结局正文（发生了什么）。",
    "closing": "收束语（留给玩家的感受）。",
    "achievement": "ach_id"
  }
}
```

### 条件格式（字符串）

```
val >= 60       val <= 30       val > 50
val < 20        val == 80       val != 0
trust >= 2      route == 'true'
hasFlag 'flag_name'
!hasFlag 'flag_name'
default
```

---

## 开发工作流

### 启动开发服务器

```bash
npm run dev    # Vite 热重载，http://localhost:5173
```

### 构建生产包

```bash
npm run build  # 输出到 dist/
npm run preview
```

### 类型检查

```bash
npm run lint   # tsc --noEmit
```

### 验证剧本 JSON

```bash
npm run validate          # 需要手动指定文件（修改 validate.py 路径）
python3 scripts/validate.py <剧本>.json
```

---

## Skill 使用流程

在 Claude Code 中使用 `/story-to-game` 命令触发完整的 9 步改写工作流：

| 步骤 | 名称 | 参考文档 |
|------|------|----------|
| 1 | 原作摄入与记忆索引构建 | `references/step1-ingestion.md` |
| 2 | 风格指纹提取 | `references/step2-style.md` |
| ✋ A | 确认点 A（方向对齐） | 必须等用户确认 |
| 3 | 结构拆解与分支点识别 | `references/step3-structure.md` |
| 4 | 状态系统与结局矩阵设计 | `references/step4-system.md` |
| ✋ B | 确认点 B（系统确认，可选） | — |
| 5-7 | 分段写作（按章推进） | `references/step5-writing.md` |
| 8 | 连通性验证与 JSON 输出 | `references/step6-validation.md` |

**节点量基准**：每千字原文约 35-40 节点。短篇 (<1万字) → 200-400 节点；中篇 → 750-1500 节点。

生成的 JSON 保存到 `public/stories/` 后，刷新页面即可在「剧本大厅」看到。

---

## 四大组件职责

### `StoryLib`（剧本大厅）
- 从 `public/stories/` 静态路径按需加载预置剧本（`fetch`）
- 支持本地 `.json` 文件上传（`FileReader` API），自动导航到演播厅
- **格式校验**：检查 `meta` / `startNodeId` / `nodes` 三个必填根字段

### `StoryPlayer`（演播厅）
- 持有 `GameState`（仅内存，不持久化）
- 核心逻辑：
  - `evalCondition(cond, state)` — 解析字符串条件表达式
  - `applyChanges(state, changes)` — 处理 val/set/flag/achievement 变更
  - `resolveRoutes(node)` — 按序求值 routes，返回第一个满足条件的 next
- 支持：回溯（HistorySnapshot）、重要 flag 浮动提示（importantFlag）、成就解锁展示

### `StoryEditor`（编译器）
- 编辑 `meta`、`startNodeId`、节点 segments/choices/isEnding
- 本地验证（BFS 可达性 + 引用完整性 + 结局检查）
- JSON 导入（粘贴文本）、导出为文件、复制到剪贴板
- **注意**：编辑器不处理 `routes`/`condition` 的复杂建造（建议直接编辑 JSON）

### `SkillWorkshop`（技能工坊）
- 纯静态说明页：6 步上手流程 + 9 步工作流可视化 + JSON 格式概览 + 参考文档目录
- 无状态，无 API 调用

---

## 前端设计规范

### 色彩系统（暗色优先）
- 主色：`amber-500`（品牌色，替代原 brand/金色调）
- 背景层级：`zinc-950` > `zinc-900` > `zinc-800`
- 辅助色：`emerald`（成功/结局）、`red`（错误/危险）、`zinc`（中性）

### 动画规范
- 节点切换：`AnimatePresence` + `mode="wait"`，`duration: 0.35s`
- 浮动提示：`opacity + y` 组合，`duration: 0.3s`
- val 进度条：`motion.div` `animate={{ width }}` + `transition: 0.5s`

### 响应式布局
- 演播厅：`lg:grid-cols-4`（主视口 3 列 + HUD 1 列）
- 编辑器：`lg:grid-cols-12`（侧边 4 列 + 主编辑 8 列）
- 移动端：单列堆叠

---

## 最佳实践清单

### 新增预置剧本
1. 将 JSON 文件放入 `public/stories/`
2. 在 `StoryLib.tsx` 的 `PRELOADED_MANIFESTS` 数组中追加路径

### 新增 Skill 参考文档
在 `.claude/commands/references/` 中创建 `.md` 文件，并在 `story-to-game.md` 中引用。

### 修改 JSON 类型
`src/types.ts` 改动后需同步检查：
- `StoryPlayer.tsx` 的 `evalCondition` / `applyChanges` 函数
- `StoryEditor.tsx` 的字段编辑 UI
- `StoryLib.tsx` 的格式校验逻辑

### 条件表达式扩展
在 `StoryPlayer.tsx` 的 `evalCondition` 函数中添加新的正则分支（当前支持：val 比较、hasFlag、变量比较、字符串比较）。

### 验证脚本使用
```bash
python3 scripts/validate.py 你的剧本.json
```
检查 8 项：节点可达性 · 引用完整性 · 变量一致性 · 无死胡同 · 结局可达 · progress 单调 · 成就数>结局数 · JSON 合法性

---

## 原项目归属

Skill 核心（`.claude/commands/story-to-game.md` 及 `references/`）来源：

**Shanyin-ai/Story-to-game**（MIT License）  
作者：@山音（电影导演/编剧/AI创作者）  
叙事游戏最高创作原则：*每一个选择都必须从当前场景自然长出，每一个后果都必须被世界认真承接，每一个结局都必须在充分变化后以判词收束。*
