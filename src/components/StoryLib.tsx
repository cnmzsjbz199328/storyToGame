import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { BookOpen, Gamepad2, Settings, HelpCircle, Upload, Loader2, FileJson, Terminal } from "lucide-react";
import { Story } from "../types";
import { isValidStory } from "../utils/story";

interface StoryLibProps {
  onPlay: (story: Story) => void;
  onEdit: (story: Story) => void;
  onOpenSkillWorkshop: () => void;
}

const PRELOADED_MANIFESTS = [
  { id: "divine-comedy", path: "/stories/divine-comedy.json" },
  { id: "monte-cristo", path: "/stories/monte-cristo.json" },
  { id: "hamlet", path: "/stories/hamlet.json" },
  { id: "frankenstein", path: "/stories/frankenstein.json" },
  { id: "crime-punishment", path: "/stories/crime-punishment.json" },
  { id: "dorian-gray", path: "/stories/dorian-gray.json" },
];

export default function StoryLib({ onPlay, onEdit, onOpenSkillWorkshop }: StoryLibProps) {
  const [preloaded, setPreloaded] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    Promise.all(
      PRELOADED_MANIFESTS.map(async ({ path }) => {
        const res = await fetch(path);
        if (!res.ok) throw new Error(`Failed to load ${path}`);
        return res.json() as Promise<Story>;
      })
    )
      .then(results => {
        if (!cancelled) { setPreloaded(results); setLoading(false); }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setLoadError("无法加载预置剧本：" + (e instanceof Error ? e.message : String(e)));
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [retryKey]);

  const handleFileImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed: unknown = JSON.parse(evt.target?.result as string);
        if (!isValidStory(parsed)) {
          throw new Error("缺少必要字段：meta / startNodeId / nodes");
        }
        onPlay(parsed);
      } catch (e: unknown) {
        setImportError("JSON 解析失败：" + (e instanceof Error ? e.message : String(e)));
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-8 font-sans">

      {/* Hero */}
      <div className="relative rounded-3xl p-7 bg-gradient-to-r from-amber-950/30 via-zinc-900/40 to-zinc-950 border border-zinc-800 overflow-hidden min-h-[140px] flex flex-col justify-center">
        <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none hidden md:block">
          <BookOpen className="w-28 h-28 text-amber-400 stroke-1" />
        </div>
        <div className="max-w-2xl space-y-2 relative">
          <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full text-[10px] font-mono tracking-widest uppercase">
            ARCHIVE · 剧本大厅
          </span>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight mt-2">
            探索多结局分支文字冒险
          </h1>
          <p className="text-xs text-zinc-400 leading-relaxed">
            选择预置剧本体验，或上传由 <code className="text-amber-400 font-mono bg-zinc-800 px-1 rounded">/story-to-game</code> Skill 生成的 JSON 剧本文件。
          </p>
        </div>
      </div>

      {/* 本地导入 */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest font-mono">导入本地剧本</h3>
        <div
          className="border-2 border-dashed border-zinc-800 hover:border-amber-500/40 rounded-2xl p-8 flex flex-col items-center gap-3 transition-colors cursor-pointer group"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-8 h-8 text-zinc-600 group-hover:text-amber-500 transition-colors" />
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-300">点击上传 JSON 剧本文件</p>
            <p className="text-xs text-zinc-500 mt-1">由 /story-to-game Skill 生成的标准格式 JSON</p>
          </div>
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-[10px] font-mono text-zinc-400">
            <FileJson className="w-3.5 h-3.5" />
            <span>.json · meta + startNodeId + nodes 结构</span>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileImport}
        />
        {importError && (
          <p className="text-xs text-red-400 flex items-center gap-1.5 px-1">
            <HelpCircle className="w-3.5 h-3.5 shrink-0" />
            {importError}
          </p>
        )}
      </section>

      {/* 预置剧本 */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest font-mono">精选预置剧本</h3>

        {loading ? (
          <div className="flex items-center gap-3 p-8 text-zinc-500">
            <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
            <span className="text-xs font-mono">载入剧本档案中...</span>
          </div>
        ) : loadError ? (
          <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl text-center space-y-3">
            <HelpCircle className="w-8 h-8 text-amber-500 mx-auto" />
            <p className="text-xs text-zinc-400">{loadError}</p>
            <button
              onClick={() => setRetryKey(k => k + 1)}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-zinc-950 rounded-xl text-xs font-medium"
            >
              重试
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {preloaded.map((story) => {
              const nodeCount = Object.keys(story.nodes).length;
              const achievementCount = Object.keys(story.achievements ?? {}).length;
              return (
                <div
                  key={story.meta.title}
                  className="bg-zinc-900/90 border border-zinc-800/80 hover:border-amber-500/30 rounded-3xl p-6 flex flex-col justify-between transition-all hover:shadow-[0_0_20px_rgba(245,158,11,0.04)] hover:scale-[1.005] group relative overflow-hidden"
                >
                  <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full blur-3xl opacity-10 pointer-events-none bg-amber-500 group-hover:opacity-20 transition-opacity" />

                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-2">
                        <span className="px-2 py-0.5 bg-zinc-950 border border-zinc-800 rounded-lg text-[10px] font-mono text-zinc-400">
                          {nodeCount} 节点
                        </span>
                        {achievementCount > 0 && (
                          <span className="px-2 py-0.5 bg-zinc-950 border border-zinc-800 rounded-lg text-[10px] font-mono text-zinc-400">
                            {achievementCount} 成就
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-600 font-mono">{story.meta.author}</span>
                    </div>

                    <div>
                      <h2 className="text-base font-bold text-zinc-100 group-hover:text-amber-400 transition-colors">
                        {story.meta.title}
                      </h2>
                      <p className="text-xs text-zinc-400 leading-relaxed mt-1.5 line-clamp-2">
                        {story.meta.description}
                      </p>
                    </div>

                    {story.meta.variableName && (
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded font-mono text-[9px] text-amber-400">
                          主状态值: {story.meta.variableName} = {story.meta.initialVariable ?? 50}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-5 border-t border-zinc-800 pt-4">
                    <button
                      onClick={() => onPlay(story)}
                      className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-zinc-950 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95"
                    >
                      <Gamepad2 className="w-4 h-4" />
                      直接游玩
                    </button>
                    <button
                      onClick={() => onEdit(story)}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all"
                    >
                      <Settings className="w-4 h-4" />
                      <span className="hidden sm:inline">编辑器</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {/* 技能工坊引导卡 */}
            <div
              onClick={onOpenSkillWorkshop}
              className="bg-zinc-900/30 border border-dashed border-zinc-800 hover:border-amber-500/30 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 text-center cursor-pointer transition-all group min-h-[160px]"
            >
              <div className="w-10 h-10 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-center justify-center group-hover:bg-amber-500/10 transition-colors">
                <Terminal className="w-5 h-5 text-amber-500/50 group-hover:text-amber-400 transition-colors" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">
                  使用 /story-to-game 生成
                </p>
                <p className="text-[11px] text-zinc-600 mt-0.5">了解如何生成你的专属剧本</p>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
