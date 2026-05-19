# CLAUDE.md — Story-to-Game 项目最佳实践指南

## 项目概览

**Story-to-Game** 是一个将小说、剧本、大纲通过 AI 一键转化为可交互分支文字游戏（文游）的全栈应用。

- **核心理念**：来源于 [Shanyin-ai/Story-to-game](https://github.com/Shanyin-ai/Story-to-game) 的叙事游戏设计哲学——段落改编→分支演播→多结局互动。
- **技术升级**：在原项目单 HTML 文件基础上，本仓库以 React 19 + TypeScript + Express + Gemini API 重构为现代全栈工程，保持并强化了分支叙事 JSON 规范与 RPG 变量系统。

---

## 技术栈

| 层次 | 技术 |
|---|---|
| 前端框架 | React 19 + TypeScript 5.8 |
| 构建工具 | Vite 6（SPA 模式） |
| 样式 | Tailwind CSS 4（`@tailwindcss/vite` 插件） |
| 动画 | Framer Motion（`motion/react`） |
| 图标 | lucide-react |
| 后端 | Express 4（Node.js，`tsx` 热重载） |
| AI 引擎 | Google Gemini API（`@google/genai`）|
| 语言 | TypeScript（全栈统一） |

---

## 项目结构

```
storyToGame/
├── server.ts              # Express 服务入口：API 路由 + Vite 中间件
├── src/
│   ├── main.tsx           # React 应用挂载点
│   ├── App.tsx            # 根组件：四页签路由 + 全局状态
│   ├── types.ts           # 核心 TypeScript 类型定义（Story / StoryNode / GameState）
│   ├── default_story.ts   # 本地默认示例剧本
│   ├── index.css          # Tailwind 基础样式
│   └── components/
│       ├── StoryLib.tsx       # 剧本大厅：加载预置剧本、快捷导航
│       ├── StoryPlayer.tsx    # 文游演播厅：游戏核心引擎 + AI 场景插画
│       ├── StoryEditor.tsx    # 剧本编译器：可视化编辑、JSON 导入导出、逻辑验证
│       └── StoryGenerator.tsx # AI 编织炉：Gemini 驱动的剧本生成界面
├── vite.config.ts         # Vite 配置（含 HMR 环境控制）
├── tsconfig.json
├── package.json
└── .env.example           # 环境变量模板
```

---

## 核心数据模型

所有数据模型定义在 `src/types.ts`，是整个系统的合约基础，**修改前必须评估对 API schema、AI prompt 和各组件的影响**。

```typescript
// 故事剧本根结构
interface Story {
  id?: string;
  title: string;
  description: string;
  author: string;
  initialNodeId: string;      // 指向起始节点的 ID（通常为 "start"）
  variables: Variable[];      // 全局 RPG 变量初始值
  nodes: StoryNode[];
}

// 单个剧情场景节点
interface StoryNode {
  id: string;                 // snake_case 唯一标识，如 "library_room"
  text: string;               // 第二人称叙述文本（100-250 字最佳）
  imagePrompt: string;        // 供 Gemini 生成背景插画的英文提示词
  choices: Choice[];          // 空数组 = 终章节点（游戏结束）
  imageUrl?: string;          // 动态生成的 base64 图片缓存
}

// 玩家选择分支
interface Choice {
  text: string;               // 选项按钮文字
  nextNodeId: string;         // 跳转目标节点 ID（必须在同一 story.nodes 中存在）
  condition?: Condition;      // 解锁条件（满足才显示/可点击）
  variableEffect?: VariableEffect; // 选择后对变量的修改
}

// RPG 变量（两种类型）
interface Variable {
  name: string;               // snake_case，如 "health", "has_key"
  type: "number" | "boolean";
  value: string;              // 统一用字符串存储，运行时解析
}

// 游戏运行时状态（StoryPlayer 内部管理）
interface GameState {
  currentNodeId: string;
  variables: Record<string, number | boolean>;
  history: string[];          // 序列化快照，支持回溯
  logs: string[];
}
```

---

## API 端点

所有 API 在 `server.ts` 中定义，前端通过相对路径调用（Vite 代理 + Express 同源）。

| Method | Path | 说明 |
|---|---|---|
| `GET` | `/api/health` | 健康检查 |
| `GET` | `/api/stories/preloaded` | 返回内置示例剧本列表 |
| `POST` | `/api/gemini/generate-story` | Gemini 生成分支剧本 JSON |
| `POST` | `/api/gemini/generate-image` | Gemini 生成场景背景插画（base64） |

### `/api/gemini/generate-story` 请求体

```json
{
  "prompt": "主线构想描述（必填）",
  "sourceText": "原著素材片段（选填）",
  "options": {
    "model": "flash | pro",
    "language": "中文 | English | 日本語",
    "style": "immersive gothic dark fantasy",
    "targetNodes": 10
  }
}
```

响应：`{ "story": Story }` — 结构严格匹配 `Story` 类型。

### `/api/gemini/generate-image` 请求体

```json
{ "prompt": "环境插画英文提示词" }
```

响应：`{ "imageUrl": "data:image/png;base64,..." }`

---

## 开发工作流

### 启动开发服务器

```bash
npm run dev
# Express + Vite 在 http://0.0.0.0:3000 同时启动
# tsx 提供 server.ts 热重载
```

### 构建生产包

```bash
npm run build
# Vite 构建前端 → dist/
# esbuild 打包 server.ts → dist/server.cjs
npm start
```

### 类型检查

```bash
npm run lint     # tsc --noEmit，无编译输出
```

### 环境变量

复制 `.env.example` 为 `.env`，填写 `GEMINI_API_KEY`。

---

## 分支剧本 JSON 规范（来源于 Shanyin-ai/Story-to-game）

本项目继承并扩展了原项目的 13 点剧本验证规则，在 `StoryEditor` 中通过 BFS 验证实现。

**合法 JSON 剧本必须满足：**

1. 存在 `initialNodeId` 所指向的节点
2. 所有 `choice.nextNodeId` 必须指向 `nodes` 中已存在的节点（无断链）
3. 所有节点从起始节点出发可达（无孤岛节点）
4. 至少存在 1 个终章节点（`choices: []`）
5. `variables` 中的名称全局唯一，使用 snake_case
6. `condition` 和 `variableEffect` 中的 `name` 必须匹配 `variables` 中声明的变量
7. `imagePrompt` 应为英文，仅描述环境场景，不含角色/UI/文字元素

---

## 四大核心模块职责

### `StoryLib`（剧本大厅）
- 从 `/api/stories/preloaded` 异步加载预置剧本
- 展示剧本卡片，提供「直接游玩」和「进编辑器」两个入口
- **注意**：不持有 story state，通过 `onSelectStory` 向上传递

### `StoryPlayer`（文游演播厅）
- 持有并管理 `GameState`（不持久化，仅内存）
- 条件判断逻辑在 `evaluateCondition()`，变量变更在 `handleSelectChoice()`
- 图片为懒加载：点击「AI 唤醒插绘」触发，结果缓存在 `nodeImages` state
- `history` 为序列化的 `{ nodeId, vars }` 快照数组，支持逐步回溯

### `StoryEditor`（剧本编译器）
- 持有 `localStory`（深拷贝自 prop），编辑后通过 `onStorySaved` 同步到父组件
- 节点 ID 重命名会同步更新所有 `choice.nextNodeId` 引用（见 `handleNodePropertyChange`）
- 逻辑验证通过 BFS 实现，生成 `ValidationReport`（error/warning/success）
- 支持 JSON 导入（粘贴）、导出为文件、复制到剪贴板

### `StoryGenerator`（AI 编织炉）
- 左侧配置表单 + 右侧实时预览，12列栅格布局
- 请求过程中循环展示 7 条进度提示（Framer Motion `AnimatePresence`）
- 生成成功后展示节点拓扑预览图，提供「立即游玩」/「调出编辑器」两条导航

---

## 前端设计规范

### 色彩系统
- 主色（`brand`）：暖金色调，用于激活态、重点按钮、边框高亮
- 背景层级：`bg-darker` → `bg-dark` → `bg-medium` → `bg-light`（深色优先）
- 辅助色：violet（AI 相关操作）、emerald（成功/终章）、red（危险/失败）、amber（警告）

### 组件规范
- 所有交互按钮加 `id` 属性（便于自动化测试和无障碍访问）
- 卡片统一用 `rounded-2xl` 或 `rounded-3xl`，内边距 `p-5` / `p-6`
- 过渡动画用 Framer Motion `AnimatePresence` + `motion.div`（切换用 `mode="wait"`）
- 文本层级：`font-display`（标题）/ `font-serif`（叙述）/ `font-mono`（代码/标签）/ `font-sans`（正文）

### 响应式布局
- 全局最大宽度 `max-w-7xl`，左右 `px-6`
- 编辑器/生成器：`lg:grid-cols-12` 拆分为 4+8 或 5+7 栅格
- 播放器：`lg:grid-cols-4`，主视口 3 列 + 侧边 HUD 1 列
- `sm:` 断点用于折叠按钮文字，`md:` 断点用于布局切换

---

## 最佳实践与优化方向

### 1. 新增剧本时
- 在 `server.ts` 的 `/api/stories/preloaded` 路由的 `stories` 数组中追加
- 必须包含唯一 `id`、合法的 `initialNodeId`、至少 1 个终章节点
- `imagePrompt` 使用英文，风格参考现有两个示例（电影化、无角色描写）

### 2. 新增 API 端点时
- 在 `server.ts` 中添加路由，保持所有路由在 `setupServer()` 调用前定义
- Gemini 调用统一使用 `getGeminiClient()` 工厂函数获取客户端
- 错误响应统一格式：`res.status(xxx).json({ error: "..." })`

### 3. 修改类型时
- `src/types.ts` 改动后需同步更新：`server.ts` 中的 `storyResponseSchema`、各组件的类型标注
- `Variable.value` 统一为字符串，运行时在 `StoryPlayer` 解析为对应类型

### 4. 添加新主题/流派时
- 在 `StoryGenerator.tsx` 的 `styleMap` 中追加键值对
- 在 `<select>` 的 `option` 列表中追加对应选项

### 5. 性能注意事项
- 图片生成结果缓存在 `nodeImages` state（`Record<nodeId, base64>`），切换节点不重新生成
- 大型剧本（>20 节点）在编辑器节点列表中启用了 `max-h` + `overflow-y-auto` 滚动，保持渲染性能
- 服务端 `express.json` payload 限制为 15MB，适配大型剧本数据

### 6. Gemini 模型选择
- 默认：`gemini-3.5-flash`（快速、低消耗，适合生产）
- Pro 模式：`gemini-3.1-pro-preview`（精密推理，适合复杂解谜剧本）
- 图像生成：`gemini-2.5-flash-image`（固定，宽高比 16:9）

---

## 与 Shanyin-ai/Story-to-game 的关系

| 维度 | 原项目（Shanyin-ai） | 本项目（cnmzsjbz199328） |
|---|---|---|
| 技术栈 | 单 HTML 文件 + 纯 JS | React 19 + TS + Express |
| 部署 | 本地浏览器直开 | Node.js 服务（支持云部署） |
| AI 集成 | 独立 `.skill` 文件 | 服务端 Gemini API 直接调用 |
| 数据规范 | JSON + Python 验证 | TypeScript 类型 + BFS 验证 |
| 编辑能力 | 无可视化编辑器 | 完整可视化编辑器（StoryEditor） |
| 叙事哲学 | 13 点规范，多结局设计 | 完全继承并在 AI prompt 中强制执行 |

本项目以原项目的叙事游戏设计理念为核心，利用现代前端工程化能力（组件化、TypeScript 类型安全、动画系统）大幅提升了用户体验和可维护性。
