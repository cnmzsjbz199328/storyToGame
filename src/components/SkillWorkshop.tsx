import { Terminal, BookOpen, CheckCircle, ArrowRight, Download, FileJson, Sparkles } from "lucide-react";

const STEPS = [
  {
    n: 1,
    title: "在 Claude Code 中打开本项目",
    desc: "用 Claude Code CLI 打开项目根目录，本项目已内置 story-to-game Skill。",
    code: "claude .",
  },
  {
    n: 2,
    title: "输入 /story-to-game 触发技能",
    desc: "在 Claude Code 终端中运行 Skill，AI 将引导你完成从原作到游戏的 9 步改写流程。",
    code: "/story-to-game",
  },
  {
    n: 3,
    title: "提供你的故事素材",
    desc: "将小说段落、剧本、故事大纲粘贴给 Claude。AI 会构建索引、提取风格、设计分支结局矩阵。",
    code: null,
  },
  {
    n: 4,
    title: "确认改编方向（✋ 确认点 A）",
    desc: "AI 展示章节划分、结局方向、玩家视角提案。确认后，后续步骤自动执行。",
    code: null,
  },
  {
    n: 5,
    title: "AI 分批输出 JSON 剧本",
    desc: "按章节推进，每 50-100 节点输出一批。生成后 AI 自动执行 8 项连通性验证。",
    code: "python3 scripts/validate.py <你的剧本>.json",
  },
  {
    n: 6,
    title: "将 JSON 保存到 public/stories/",
    desc: "把生成的 JSON 文件放入 public/stories/ 目录，或在「剧本大厅」直接上传本地文件即可游玩。",
    code: "cp <你的剧本>.json public/stories/",
  },
];

const NINE_STEPS = [
  { n: 1, name: "原作摄入与记忆索引" },
  { n: 2, name: "风格指纹提取" },
  { n: "A", name: "✋ 确认点 A — 方向对齐" },
  { n: 3, name: "结构拆解与分支点识别" },
  { n: 4, name: "状态系统与结局矩阵设计" },
  { n: "B", name: "✋ 确认点 B — 系统确认（可选）" },
  { n: "5-7", name: "分段写作（按章推进）" },
  { n: 8, name: "连通性验证与 JSON 输出" },
];

export default function SkillWorkshop() {
  return (
    <div className="space-y-10 font-sans max-w-4xl mx-auto">

      {/* Hero */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
          <Terminal className="w-48 h-48 text-amber-400 stroke-1" />
        </div>
        <div className="relative space-y-3 max-w-xl">
          <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full text-[10px] font-mono tracking-widest uppercase">
            SKILL · 终端驱动
          </span>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
            Story-to-Game 技能工坊
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            这是本项目的核心：一套将任意叙事文本改写为可游玩分支剧情 JSON 的 AI Skill。
            在 Claude Code 终端中运行 <code className="text-amber-400 bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-xs">/story-to-game</code>，即可启动完整的 9 步改写流程。
          </p>
        </div>
      </div>

      {/* How to use */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest font-mono flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          快速上手流程
        </h2>
        <div className="space-y-3">
          {STEPS.map((step) => (
            <div
              key={step.n}
              className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 flex gap-4"
            >
              <div className="w-7 h-7 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-amber-400 text-xs font-bold font-mono">{step.n}</span>
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-sm font-semibold text-zinc-200">{step.title}</p>
                <p className="text-xs text-zinc-400 leading-relaxed">{step.desc}</p>
                {step.code && (
                  <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 font-mono text-xs text-amber-300 w-fit">
                    <Terminal className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span>{step.code}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 9-step workflow */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest font-mono flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5 text-amber-500" />
          Skill 内置 9 步工作流（自动执行）
        </h2>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
          <div className="space-y-2">
            {NINE_STEPS.map((s) => {
              const isCheckpoint = typeof s.n === "string" && s.n.startsWith("✋".codePointAt(0)?.toString() || "A");
              const isStop = s.name.startsWith("✋");
              return (
                <div key={String(s.n)} className={`flex items-center gap-3 py-1.5 border-b border-zinc-800/50 last:border-0 ${isStop ? "opacity-70" : ""}`}>
                  <span className={`text-[10px] font-mono font-bold w-8 text-right shrink-0 ${isStop ? "text-zinc-500" : "text-amber-400"}`}>
                    {s.n}
                  </span>
                  <ArrowRight className="w-3 h-3 text-zinc-700 shrink-0" />
                  <span className={`text-xs ${isStop ? "text-zinc-500 italic" : "text-zinc-300"}`}>{s.name}</span>
                  {s.name.includes("TRUE") && <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* JSON Schema highlight */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest font-mono flex items-center gap-2">
          <FileJson className="w-3.5 h-3.5 text-amber-500" />
          输出 JSON 格式概览
        </h2>
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 overflow-x-auto">
          <pre className="text-[11px] text-zinc-300 font-mono leading-relaxed">{`{
  "meta": {
    "title": "作品标题",
    "author": "作者名",
    "theme": "noir",          // noir / paper / tide / summer / night / blood / void
    "ambient": "rain",        // rain / wind / sea / heat / static / none
    "variableName": "缝线",   // 主状态值的戏剧化命名（0-100）
    "initialVariable": 38
  },
  "startNodeId": "start",
  "variables": { "has_key": false, "trust": 0 },
  "achievements": { "id": { "title": "成就名", "description": "..." } },
  "nodes": {
    "start": {
      "chapterTitle": "第一章：黑门",     // 仅章节首节点
      "scene": { "id": "hall", "name": "古堡大厅", "type": "major" },
      "progress": 5,
      "segments": [
        { "text": "叙述文本。" },
        { "speaker": "角色名", "text": "对白内容。", "effect": "glitch" }
      ],
      "choices": [
        { "text": "选项文本", "next": "目标节点ID",
          "condition": "val >= 60",
          "changes": { "val": 10, "addFlag": "key_taken",
                       "importantFlag": { "flag": "key", "label": "拾起了钥匙" } } }
      ],
      "routes": [
        { "condition": "hasFlag 'key'", "next": "win_node" },
        { "condition": "default",       "next": "lose_node" }
      ]
    },
    "ending_true": {
      "isEnding": true,
      "title_end": "结局标题",
      "type": "TRUE ENDING",
      "description": "结局正文。",
      "closing": "收束语。"
    }
  }
}`}</pre>
        </div>
      </section>

      {/* Reference docs */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest font-mono flex items-center gap-2">
          <Download className="w-3.5 h-3.5 text-amber-500" />
          内置参考文档（.claude/commands/references/）
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { file: "json-format-spec.md", desc: "JSON 格式速查手册——所有字段定义" },
            { file: "step1-ingestion.md",  desc: "原作摄入：记忆索引 + 节奏校验方法" },
            { file: "step2-style.md",      desc: "风格指纹提取：叙述温度、对白、视角转换" },
            { file: "step3-structure.md",  desc: "结构拆解：分支拓扑、汇合点、文学大纲" },
            { file: "step4-system.md",     desc: "状态系统：val 设计、结局矩阵、成就设计" },
            { file: "step5-writing.md",    desc: "分段写作：7 条转换铁律 + 长篇分批协议" },
            { file: "step6-validation.md", desc: "连通性验证：8 项自检 + validate.py 脚本" },
          ].map(({ file, desc }) => (
            <div key={file} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex gap-3">
              <FileJson className="w-4 h-4 text-amber-500/60 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-mono font-bold text-zinc-300">{file}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-zinc-600 font-mono">
          Skill 核心来源：<a href="https://github.com/Shanyin-ai/Story-to-game" target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-white underline">Shanyin-ai/Story-to-game</a>（MIT License）
        </p>
      </section>

    </div>
  );
}
