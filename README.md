# Story-to-Game

**将任意叙事文本，改写为可游玩的分支剧情游戏。**

在 Claude Code 终端中运行一条命令，AI 经由完整的九步文学改写工作流，输出一份带有多结局、RPG 变量与成就系统的标准 JSON 剧本；前端负责演播与编辑，全程无服务端、无外部 API。

---

## 致敬原作者

本项目的核心驱动力——`/story-to-game` Skill——完整来源于：

> **[Shanyin-ai / Story-to-game](https://github.com/Shanyin-ai/Story-to-game)**  
> 作者：**@山音**（山之音STUDIO 创始人）

@山音 是电影导演、编剧与 AI 创作者，坎城、釜山、北京等国际电影节评审，入选「初次名单 AI 十大人物」与「AI CREATOR 100」。他将多年的文学叙事与影像语言经验凝结为这套改写工作流，赋予每一个分支以真正的文学密度。

Skill 所秉持的最高创作原则，也是本项目的精神锚点：

> *每一个选择都必须从当前场景自然长出，*  
> *每一个后果都必须被世界认真承接，*  
> *每一个结局都必须在充分变化后以判词收束。*

原项目以 **MIT License** 开源，本项目在此基础上构建了现代化全栈前端，所有 Skill 著作权归 @山音 所有。

---

## 项目架构

```
故事素材（小说 / 剧本 / 大纲）
        │
        ▼  在 Claude Code 终端中
  /story-to-game  ←── .claude/commands/story-to-game.md
        │              （Shanyin-ai 原版 Skill，9 步工作流）
        │
        ▼  输出
   剧本 JSON  ──▶  public/stories/  ──▶  React 前端演播
                                          ├── 剧本大厅（选择 / 导入）
                                          ├── 演播厅（游戏引擎）
                                          └── 编译器（可视化编辑）
```

**无服务端**：Vite 构建纯静态 SPA，不依赖任何云 AI API。

---

## 快速上手

### 前置条件

- Node.js 18+
- Python 3（用于 JSON 验证，可选）
- [Claude Code](https://github.com/anthropics/claude-code) CLI

### 安装与启动

```bash
npm install
npm run dev        # http://localhost:5173
```

### 生成剧本

```bash
# 在 Claude Code 中打开项目
claude .

# 触发 Skill（Claude Code 终端内）
/story-to-game
```

按照 AI 引导提供故事素材，完成确认点 A 后全流程自动执行，最终输出 JSON 文件。

### 导入游玩

将生成的 `.json` 文件放入 `public/stories/`，或在「剧本大厅」直接上传本地文件即可开始游玩。

### 验证剧本

```bash
python3 scripts/validate.py <你的剧本>.json
```

8 项连通性自检：节点可达性、引用完整性、变量一致性、无死胡同、结局可达、progress 单调、成就数 > 结局数、JSON 合法性。

---

## Skill 工作流（九步）

| 步骤 | 名称 | 说明 |
|------|------|------|
| 1 | 原作摄入与记忆索引 | 将原作压缩为骨架层 + 人物层 + 场景层 + 节奏标记 |
| 2 | 风格指纹提取 | 提取叙述温度、对白风格、视角转换规则、原作禁区 |
| **✋ A** | **确认点 A** | AI 向用户展示改编方向，**唯一必须等待确认的节点** |
| 3 | 结构拆解与分支点识别 | 节拍序列 + 分支拓扑 + 文学大纲 |
| 4 | 状态系统与结局矩阵 | val 设计、自定义变量、flags、成就、结局倒推路径 |
| **✋ B** | **确认点 B**（可选） | 展示结局标题与数量，用户可跳过 |
| 5–7 | 分段写作 | 按章推进，每批 50–100 节点，含自检协议 |
| 8 | 连通性验证与输出 | 8 项验证通过后交付 JSON 文件 |

**节点量基准**：每千字原文约 35–40 节点。短篇（<1 万字）→ 200–400 节点；中篇 → 750–1500 节点；长篇 → 1500–3000+ 节点。

---

## JSON 格式概览

```jsonc
{
  "meta": {
    "title": "作品标题",
    "author": "作者名",
    "theme": "noir",           // noir / paper / tide / summer / night / blood / void
    "ambient": "rain",         // rain / wind / sea / heat / static / none
    "variableName": "缝线",    // 主状态值的戏剧化命名（游戏界面常驻显示）
    "initialVariable": 38      // 初始 val（0–100）
  },
  "startNodeId": "start",
  "variables": { "has_key": false, "trust": 0 },
  "achievements": {
    "ach_id": { "title": "成就名", "description": "触发条件描述。" }
  },
  "nodes": {
    "start": {
      "chapterTitle": "第一章：...",   // 仅章节首节点设置
      "scene": { "id": "hall", "name": "古堡大厅", "type": "major" },
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
            "addFlag": "key_taken",
            "importantFlag": { "flag": "key_taken", "label": "拾起了钥匙" },
            "unlockAchievement": "ach_id"
          }
        }
      ],
      "routes": [
        { "condition": "hasFlag 'key_taken'", "next": "win_node" },
        { "condition": "default", "next": "normal_path" }
      ]
    },
    "true_ending": {
      "isEnding": true,
      "title_end": "结局标题",
      "type": "TRUE ENDING",
      "description": "结局正文。",
      "closing": "留给玩家的收束语。"
    }
  }
}
```

完整格式规范见 `.claude/commands/references/json-format-spec.md`。

> **格式陷阱**：结局节点（`isEnding: true`）不能包含 `segments` 字段，否则演播引擎会抛出 TypeError 导致空白屏。结局节点只允许 `isEnding / title_end / type / progress / description / closing / achievement` 这几个字段。

---

## 预置剧本

剧本大厅内置 6 部经典文学改编，均由 `/story-to-game` Skill 生成：

| 剧本 | 原著 | 主状态值 | 节点 | 结局 |
|------|------|----------|------|------|
| 神曲 | 但丁·阿利吉耶里 | 光照 | 66 | 6 |
| 基督山伯爵 | 大仲马 | — | — | — |
| 哈姆雷特 | 莎士比亚 | — | — | — |
| 弗兰肯斯坦 | 玛丽·雪莱 | 缝线 | 65 | 6 |
| 罪与罚 | 陀思妥耶夫斯基 | 裂纹 | 61 | 5 |
| 道林·格雷的画像 | 奥斯卡·王尔德 | 腐蚀 | 66 | 6 |

将自己生成的 `.json` 放入 `public/stories/` 并在 `StoryLib.tsx` 的 `PRELOADED_MANIFESTS` 数组中追加路径，即可在剧本大厅显示。

---

## 技术栈

| 层次 | 技术 |
|---|---|
| 前端 | React 19 + TypeScript 5.8 |
| 构建 | Vite 6（纯静态 SPA） |
| 样式 | Tailwind CSS 4 |
| 动画 | Framer Motion |
| Skill 引擎 | Claude Code `/story-to-game`（Shanyin-ai 原版） |
| 验证 | Python 3 `scripts/validate.py` |

---

## 目录结构

```
.claude/commands/
├── story-to-game.md          # /story-to-game 主技能（原版 Skill）
└── references/               # 9 步工作流参考文档
    ├── json-format-spec.md
    ├── step1-ingestion.md
    ├── step2-style.md
    ├── step3-structure.md
    ├── step4-system.md
    ├── step5-writing.md
    └── step6-validation.md
scripts/
└── validate.py               # JSON 8 项自动验证
public/stories/               # 预置及用户生成的剧本 JSON
src/components/
├── StoryLib.tsx              # 剧本大厅（加载 + 本地导入）
├── StoryPlayer.tsx           # 演播引擎（segments/routes/val/flags）
├── StoryEditor.tsx           # 可视化编辑器
└── SkillWorkshop.tsx         # 技能工坊（使用引导）
```

---

## 开发命令

```bash
npm run dev      # 启动开发服务器
npm run build    # 构建生产包
npm run lint     # TypeScript 类型检查
npm run preview  # 预览生产构建
```

---

## 许可证

本项目代码以 **MIT License** 开源。

`.claude/commands/story-to-game.md` 及 `references/` 目录中的 Skill 内容版权归原作者 **@山音** 所有，遵循原项目 [MIT License](https://github.com/Shanyin-ai/Story-to-game/blob/main/LICENSE)。
