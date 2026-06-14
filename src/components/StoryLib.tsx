import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { BookOpen, Gamepad2, Settings, HelpCircle, Upload, Loader2, FileJson } from "lucide-react";
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
  const [selectedIdx, setSelectedIdx] = useState(0);
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
        if (!cancelled) { setPreloaded(results); setSelectedIdx(0); setLoading(false); }
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
        if (!isValidStory(parsed)) throw new Error("缺少必要字段：meta / startNodeId / nodes");
        onPlay(parsed);
      } catch (e: unknown) {
        setImportError("JSON 解析失败：" + (e instanceof Error ? e.message : String(e)));
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const selectedStory = preloaded[selectedIdx] ?? null;

  const StoryDetail = ({ story }: { story: Story }) => {
    const nodeCount = Object.keys(story.nodes).length;
    const achievementCount = Object.keys(story.achievements ?? {}).length;
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2 py-0.5 bg-zinc-950 border border-zinc-800 rounded-lg text-[10px] font-mono text-zinc-400">
            {nodeCount} 节点
          </span>
          {achievementCount > 0 && (
            <span className="px-2 py-0.5 bg-zinc-950 border border-zinc-800 rounded-lg text-[10px] font-mono text-zinc-400">
              {achievementCount} 成就
            </span>
          )}
          <span className="text-[10px] text-zinc-600 font-mono ml-auto">{story.meta.author}</span>
        </div>

        <div>
          <h2 className="text-lg font-bold text-zinc-100 leading-tight">{story.meta.title}</h2>
          <p className="text-xs text-zinc-400 leading-relaxed mt-2">{story.meta.description}</p>
        </div>

        {story.meta.variableName && (
          <span className="inline-block px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded font-mono text-[9px] text-amber-400">
            主状态值: {story.meta.variableName} = {story.meta.initialVariable ?? 50}
          </span>
        )}

        <div className="flex items-center gap-2 pt-1">
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
            编辑器
          </button>
        </div>
      </div>
    );
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
            选择预置剧本体验，或使用 <code className="text-amber-400 font-mono bg-zinc-800 px-1 rounded">/story-to-game</code> Skill 生成你的专属剧本。
          </p>
        </div>
      </div>

      {/* 精选预置剧本 */}
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
          <>
            {/* Desktop: left title list + right detail */}
            <div className="hidden md:flex border border-zinc-800 rounded-3xl overflow-hidden bg-zinc-900/90">
              <div className="w-44 shrink-0 border-r border-zinc-800 overflow-y-auto max-h-[400px]">
                {preloaded.map((story, idx) => (
                  <button
                    key={story.meta.title}
                    onClick={() => setSelectedIdx(idx)}
                    className={`w-full px-4 py-3.5 text-left transition-colors border-b border-zinc-800/60 last:border-b-0 ${
                      idx === selectedIdx
                        ? "bg-amber-500/10 text-amber-400"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                    }`}
                  >
                    <span className="text-xs font-medium line-clamp-2 leading-snug">{story.meta.title}</span>
                  </button>
                ))}
              </div>
              <div className="flex-1 p-6 overflow-y-auto max-h-[400px]">
                {selectedStory && <StoryDetail story={selectedStory} />}
              </div>
            </div>

            {/* Mobile: detail top + chip strip below */}
            <div className="md:hidden space-y-3">
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 overflow-y-auto max-h-[380px]">
                {selectedStory && <StoryDetail story={selectedStory} />}
              </div>
              <div className="overflow-x-auto pb-1">
                <div className="flex gap-2 w-max px-0.5">
                  {preloaded.map((story, idx) => (
                    <button
                      key={story.meta.title}
                      onClick={() => setSelectedIdx(idx)}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-mono border transition-colors ${
                        idx === selectedIdx
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          : "text-zinc-500 border-zinc-800 hover:text-zinc-300 hover:border-zinc-600"
                      }`}
                    >
                      {story.meta.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {/* 生成并导入你的剧本 */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest font-mono">生成并导入你的剧本</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 技能工坊 */}
          <div
            onClick={onOpenSkillWorkshop}
            className="border border-dashed border-zinc-800 hover:border-amber-500/30 rounded-2xl p-6 flex items-center justify-center cursor-pointer transition-colors group"
          >
            <code className="text-sm font-mono text-amber-500/60 group-hover:text-amber-400 transition-colors">
              /story-to-game
            </code>
          </div>

          {/* 本地导入 */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-800 hover:border-amber-500/40 rounded-2xl p-6 flex flex-col items-center gap-3 text-center cursor-pointer transition-colors group"
          >
            <Upload className="w-7 h-7 text-zinc-600 group-hover:text-amber-500 transition-colors" />
            <div>
              <p className="text-sm font-medium text-zinc-300">上传 JSON 剧本文件</p>
              <p className="text-xs text-zinc-500 mt-1">由 /story-to-game Skill 生成的标准格式</p>
            </div>
            <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-[10px] font-mono text-zinc-400">
              <FileJson className="w-3.5 h-3.5" />
              <span>.json · meta + startNodeId + nodes</span>
            </div>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileImport} />
        {importError && (
          <p className="text-xs text-red-400 flex items-center gap-1.5 px-1">
            <HelpCircle className="w-3.5 h-3.5 shrink-0" />
            {importError}
          </p>
        )}
      </section>

    </div>
  );
}
