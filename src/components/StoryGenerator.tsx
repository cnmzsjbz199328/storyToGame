import { useState, useEffect, FormEvent } from "react";
import { 
  Sparkles, Sliders, Play, Settings, BookOpen, AlertCircle, CheckCircle, 
  ChevronRight, BrainCircuit, Globe, Layers, ArrowUpRight, ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Story } from "../types";

interface StoryGeneratorProps {
  onStoryLoaded: (story: Story) => void;
  onNavigateToTab: (tab: "play" | "edit" | "library") => void;
}

export default function StoryGenerator({ onStoryLoaded, onNavigateToTab }: StoryGeneratorProps) {
  // Input fields state
  const [sourceText, setSourceText] = useState<string>("");
  const [prompt, setPrompt] = useState<string>("");
  
  // Advanced configuration
  const [vibe, setVibe] = useState<string>("fantasy");
  const [language, setLanguage] = useState<string>("中文");
  const [nodesCount, setNodesCount] = useState<number>(10);
  const [useProModel, setUseProModel] = useState<boolean>(false);

  // Operation state
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedStory, setGeneratedStory] = useState<Story | null>(null);
  
  // Loading quote sequence states
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState<number>(0);
  const loadingQuotes = [
    "Gemini 正在分析素材逻辑与故事内核结构...",
    "正在架构分支剧情命运网络（设定起始点与多种结局）...",
    "编织第二人称叙述（You / 你）文笔并提炼环境深度...",
    "埋藏属性效果变动与隐藏解锁条件（RPG 变量注入）...",
    "构建场景插画概念提示词库 (Image Prompt) 以供可视化...",
    "正在梳理逻辑树，避免产生不可触达及死胡同节点...",
    "最后合卷：输出符合文游规范的纯 JSON 数据树..."
  ];

  useEffect(() => {
    let interval: any = null;
    if (loading) {
      interval = setInterval(() => {
        setCurrentQuoteIndex(prev => (prev + 1) % loadingQuotes.length);
      }, 3500);
    } else {
      setCurrentQuoteIndex(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleGenerateStory = async (e: FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() && !sourceText.trim()) {
      setError("请输入创作宏愿灵感或贴入小说剧本。");
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedStory(null);

    const styleMap: Record<string, string> = {
      fantasy: "immersive gothic dark fantasy with magic and danger",
      cyberpunk: "techno-thriller cyberpunk, neon streets, and chrome hacking systems",
      xianxia: "mythical Chinese Xianxia cultivation swordplay and immortal martial arts",
      mystery: "Gothic victorian mystery detective noir, suspenseful atmosphere",
      wasteland: "rugged apocalypse post-apocalyptic wasteland survival and radiation"
    };

    try {
      const response = await fetch("/api/gemini/generate-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          sourceText: sourceText.trim() || undefined,
          options: {
            model: useProModel ? "pro" : "flash",
            language,
            style: styleMap[vibe] || "immersive text-adventure RPG storytelling",
            targetNodes: nodesCount
          }
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "服务器遭遇虚空风暴，生成失败。");
      }

      const data = await response.json();
      if (!data.story) {
        throw new Error("模型产生了残缺数据结构，请重试。");
      }

      setGeneratedStory(data.story);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "故事合成异常，生成失败。");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyGenerated = (targetTab: "play" | "edit") => {
    if (!generatedStory) return;
    onStoryLoaded(generatedStory);
    onNavigateToTab(targetTab);
  };

  return (
    <div id="story-generator-root" className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-sans">
      
      {/* Configuration Form Column (Left - 5 cols) */}
      <form 
        id="generator-config-form"
        onSubmit={handleGenerateStory}
        className="lg:col-span-5 flex flex-col gap-5 bg-zinc-900/90 p-6 rounded-3xl border border-zinc-800"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-600/10 text-violet-400 rounded-xl border border-violet-500/20">
            <BrainCircuit className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-display text-zinc-100">Story-to-Game AI</h2>
            <p className="text-xs text-zinc-500">将任意小说、剧本、大纲或大开脑洞一键打造成分支文游</p>
          </div>
        </div>

        {/* 1. Optional Source Text excerpt or background script upload */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-300 font-mono uppercase tracking-wide">小说、剧本或素材原文 (选填)</label>
            <span className="text-[10px] text-zinc-500 font-mono">Novel Adapter</span>
          </div>
          <textarea
            id="source-material-textarea"
            placeholder="在这里粘贴小说名篇、精彩段落、编剧大纲。AI 会识别其中的出场人物、地名、冲突核心，并按照这些背景和线索铺开你的多线冒险剧本..."
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            className="w-full min-h-36 max-h-56 p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-600 focus:outline-hidden focus:border-violet-500 tracking-wide leading-relaxed font-light scrollbar-thin"
          />
        </div>

        {/* 2. Directing prompt instructions */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-300 font-mono uppercase tracking-wide">专属主线构想及改编诉求 (必填)</label>
            <span className="text-[10px] text-violet-400 font-mono">Main Focus Premise</span>
          </div>
          <textarea
            id="creative-premise-textarea"
            placeholder="例：'我想要一个中世纪古堡大冒险，主角必须收集黄铜钥匙在电闪雷鸣的暴雨夜出逃该地。' 或者 '接班上述小说段落，让主角进入古老的神殿，增加几个需要智力和解密才不致丧命的机关节点。'"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full min-h-24 max-h-32 p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-600 focus:outline-hidden focus:border-violet-500 tracking-wide leading-relaxed font-light scrollbar-thin font-serif"
            required
          />
        </div>

        {/* Advanced parameter settings divider */}
        <div className="flex items-center gap-2 border-t border-zinc-800/80 pt-4 pb-1">
          <Sliders className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">高级游戏数值控制</span>
        </div>

        {/* 3. Dropdowns grids */}
        <div className="grid grid-cols-2 gap-3">
          {/* Theme selection */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-zinc-400 font-mono uppercase">故事流派题材</label>
            <select
              id="story-theme-select"
              value={vibe}
              onChange={(e) => setVibe(e.target.value)}
              className="w-full p-2.5 bg-zinc-950/80 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300 focus:outline-hidden focus:border-violet-500"
            >
              <option value="fantasy">🔮 暗黑哥特 (Dark Fantasy)</option>
              <option value="cyberpunk">🦾 赛博朋克 (Cyberpunk)</option>
              <option value="xianxia">⚔️ 国风修仙 (Chinese Xianxia)</option>
              <option value="mystery">🕵️ 哥德悬疑 (Gothic Noir)</option>
              <option value="wasteland">☢️ 末日废土 (Post-Apocalypse)</option>
            </select>
          </div>

          {/* Language selection */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-zinc-400 font-mono uppercase">演播文字语言</label>
            <select
              id="story-language-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full p-2.5 bg-zinc-950/80 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300 focus:outline-hidden focus:border-violet-500"
            >
              <option value="中文">🇨🇳 中文简体 (Chinese)</option>
              <option value="English">🇺🇸 英文 (English)</option>
              <option value="日本語">🇯🇵 日语 (Japanese)</option>
            </select>
          </div>
        </div>

        {/* 4. Target node nodes slider count */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-semibold text-zinc-400 font-mono uppercase">计划构建分支节点总数: <span className="text-violet-400 font-bold">{nodesCount}</span> 个</label>
            <span className="text-[9px] text-zinc-500">6 - 15 个最适宜</span>
          </div>
          <input
            id="nodes-count-range"
            type="range"
            min="6"
            max="15"
            value={nodesCount}
            onChange={(e) => setNodesCount(Number(e.target.value))}
            className="w-full accent-violet-500 bg-zinc-950 h-1 rounded-lg cursor-pointer"
          />
        </div>

        {/* 5. Gemini version select */}
        <div className="flex items-center justify-between bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/80">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-zinc-300 font-mono flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-violet-400" />
              探索特制高规 AI 引擎
            </span>
            <span className="text-[9px] text-zinc-500 mt-0.5">勾选使用 3.1 Pro 增强版编写精密解谜（需要高付费额度）</span>
          </div>
          <input
            id="pro-model-checkbox"
            type="checkbox"
            checked={useProModel}
            onChange={(e) => setUseProModel(e.target.checked)}
            className="w-4 h-4 rounded text-violet-600 accent-violet-500 border-zinc-700 bg-zinc-950 focus:ring-0 focus:ring-offset-0 cursor-pointer"
          />
        </div>

        {loading ? (
          <div id="ai-waiting-card" className="p-4 bg-violet-950/20 border border-violet-500/20 rounded-2xl flex flex-col items-center justify-center gap-3 text-center mt-2 relative overflow-hidden">
            <div id="beating-ring" className="w-8 h-8 rounded-full border-2 border-violet-500/20 border-t-violet-400 animate-spin"></div>
            <p className="text-xs text-violet-300 font-mono font-medium animate-pulse">正在施展文游创造魔法...</p>
            <AnimatePresence mode="wait">
              <motion.span 
                key={currentQuoteIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="text-[10px] text-zinc-400 px-3 truncate max-w-full leading-relaxed"
              >
                {loadingQuotes[currentQuoteIndex]}
              </motion.span>
            </AnimatePresence>
          </div>
        ) : (
          <button
            id="trigger-story-mint-button"
            type="submit"
            className="w-full py-3.5 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl border border-violet-400/20 hover:border-violet-400/50 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer shadow-lg shadow-violet-900/10"
          >
            <Sparkles className="w-4.5 h-4.5 animate-bounce" />
            <span>开始一键合成文游剧本</span>
          </button>
        )}

        {error && (
          <div id="ai-generate-error-banner" className="p-3 bg-red-950/60 border border-red-500/30 rounded-xl flex items-start gap-2 text-red-200 text-xs">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>生成失败：{error}</span>
          </div>
        )}
      </form>

      {/* Dynamic Results Preview & Map Explorer (Right - 7 cols) */}
      <div 
        id="generator-results-pane"
        className="lg:col-span-7 flex flex-col bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 min-h-[500px]"
      >
        {!generatedStory ? (
          /* Empty placeholder card styling */
          <div id="preview-placeholder" className="flex-1 flex flex-col items-center justify-center text-center p-8 text-zinc-500 select-none">
            <div className="relative mb-4">
              <BookOpen className="w-16 h-16 text-zinc-700/60 stroke-1" />
              <div className="absolute inset-0 bg-violet-500/5 blur-3xl rounded-full"></div>
            </div>
            <h3 className="font-display text-base font-semibold text-zinc-300">沙盒未载入</h3>
            <p className="text-xs text-zinc-500 max-w-sm mt-1.5 leading-relaxed">
              请在左侧配置面板中写下您惊艳的故事创意，设定流派机制和节点数，AI 即可在瞬间为您编译完整文游剧情。
            </p>
          </div>
        ) : (
          /* Generated story metadata and structural graph network preview */
          <div id="generated-story-preview" className="flex flex-col justify-between h-full gap-6">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                  <CheckCircle className="w-4.5 h-4.5" />
                  <span>剧本创意拼绘成功！已就绪</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">JSON SPEC 1.0</span>
              </div>

              {/* Story summary details cards */}
              <div className="bg-zinc-900/80 p-5 rounded-2xl border border-zinc-800 space-y-3 shadow-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2 py-0.5 bg-violet-500/10 text-violet-400 rounded text-[10px] font-mono border border-violet-500/20 uppercase tracking-wider">
                      TITLE & OUTLINE
                    </span>
                    <h1 className="text-xl font-bold text-zinc-200 mt-2 font-display">{generatedStory.title}</h1>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      创作者信标: <span className="text-zinc-400 font-mono">{generatedStory.author}</span>
                    </p>
                  </div>

                  <span className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-300 font-bold shrink-0">
                    {generatedStory.nodes.length} 个节点
                  </span>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed font-light border-t border-zinc-800/80 pt-2.5">
                  {generatedStory.description}
                </p>

                {/* Simulated default global variable stats meters block */}
                {generatedStory.variables && generatedStory.variables.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase font-mono block mb-1.5">初始变量属性：</span>
                    <div className="flex flex-wrap gap-2">
                      {generatedStory.variables.map((v, i) => (
                        <span key={i} className="px-2 py-1 bg-zinc-950 text-violet-300 text-[10px] font-mono rounded-lg border border-zinc-800 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
                          <span>{v.name}</span>
                          <span className="text-zinc-600">({v.type})</span>
                          <span className="text-zinc-400 font-bold">= {v.value}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Story Node Interactive Map Diagram Flow preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">剧情拓扑网节点预览</span>
                  </div>
                  <span className="text-[9px] text-zinc-500">点击并检查下方细节路径</span>
                </div>

                {/* Node directory preview with beautiful path tags */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {generatedStory.nodes.map((node, i) => {
                    const isTerminal = node.choices.length === 0;
                    return (
                      <div 
                        key={node.id}
                        id={`node-preview-${node.id}`}
                        className={`p-3 bg-zinc-900/50 rounded-xl border hover:border-zinc-700 transition-colors ${
                          node.id === generatedStory.initialNodeId 
                            ? "border-violet-500/40 bg-violet-950/5" 
                            : isTerminal
                            ? "border-emerald-500/20 bg-emerald-950/5"
                            : "border-zinc-800"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] font-bold text-zinc-300 truncate max-w-[150px]" title={node.id}>
                            {node.id === generatedStory.initialNodeId ? "🎬 [起点] " : isTerminal ? "🏆 [结局] " : "◈ "}{node.id}
                          </span>
                          <span className={`px-1.5 py-0.5 text-[9px] font-mono leading-none rounded ${
                            isTerminal 
                              ? "bg-emerald-500/10 text-emerald-400" 
                              : "bg-zinc-800 text-zinc-400"
                          }`}>
                            {isTerminal ? "终章 / 0条分支" : `${node.choices.length} 分支`}
                          </span>
                        </div>

                        <p className="text-[10px] text-zinc-500 line-clamp-1 mt-1.5 italic">
                          "{node.text}"
                        </p>

                        {/* Connected next nodes list of tags */}
                        {!isTerminal && (
                          <div className="mt-2 flex flex-wrap gap-1 items-center">
                            <span className="text-[9px] text-zinc-600">下行：</span>
                            {node.choices.map((c, idx) => (
                              <span 
                                key={idx} 
                                className="px-1 py-0.5 bg-zinc-950 border border-zinc-800/80 rounded font-mono text-[9px] text-zinc-400 hover:text-white"
                                title={`通过选项 [${c.text}] 通往 ${c.nextNodeId}`}
                              >
                                {c.nextNodeId}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Action buttons */}
            <div id="generator-bottom-panel" className="bg-zinc-900/60 p-4 border border-zinc-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-col text-center sm:text-left">
                <span className="text-xs font-semibold text-zinc-300">游戏剧本编译加载完毕！</span>
                <span className="text-[10px] text-zinc-500 mt-0.5">您可以进入沉浸式播放器体验游玩，或者调出编辑器微调逻辑。</span>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  id="direct-play-generated-btn"
                  onClick={() => handleApplyGenerated("play")}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>立即游玩</span>
                </button>

                <button
                  id="direct-edit-generated-btn"
                  onClick={() => handleApplyGenerated("edit")}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 border border-zinc-700 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <Settings className="w-4 h-4" />
                  <span>调出编辑器</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
