import { useState, useEffect } from "react";
import { BookOpen, Sparkles, User, HelpCircle, Gamepad2, Settings, Loader2 } from "lucide-react";
import { Story } from "../types";

interface StoryLibProps {
  onSelectStory: (story: Story) => void;
  onNavigateToTab: (tab: "play" | "edit" | "generate") => void;
}

export default function StoryLib({ onSelectStory, onNavigateToTab }: StoryLibProps) {
  const [preloaded, setPreloaded] = useState<Story[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPreloaded = async () => {
      try {
        const response = await fetch("/api/stories/preloaded");
        if (!response.ok) {
          throw new Error("同步预置脚本时遭遇阻塞。");
        }
        const data = await response.json();
        if (data.stories) {
          setPreloaded(data.stories);
        }
      } catch (err: any) {
        console.error(err);
        setError("无法载入预置剧本：请检查后端服务是否顺畅。");
      } finally {
        setLoading(false);
      }
    };

    fetchPreloaded();
  }, []);

  const handleLaunchStory = (story: Story, tab: "play" | "edit") => {
    onSelectStory(story);
    onNavigateToTab(tab);
  };

  return (
    <div id="story-lib-root" className="space-y-8 font-sans">
      {/* Visual Header Display Cards */}
      <div id="lib-hero-banner" className="relative rounded-3xl p-6 md:p-8 bg-linear-to-r from-violet-950/40 via-violet-950/20 to-zinc-950 border border-zinc-800 overflow-hidden min-h-[160px] flex flex-col justify-center">
        <div className="absolute right-12 top-1/2 -translate-y-1/2 opacity-15 pointer-events-none hidden md:block">
          <BookOpen className="w-32 h-32 text-violet-400 stroke-1" />
        </div>
        
        <div className="max-w-2xl space-y-2 relative z-5">
          <span className="px-2.5 py-0.5 bg-violet-500/10 text-violet-400 border border-violet-500/30 rounded-full text-[10px] font-mono tracking-widest uppercase font-semibold leading-none">
            ARCHIVE / 互动剧本集藏
          </span>
          <h1 className="text-2xl font-bold font-display text-zinc-100 tracking-tight mt-2.5">
            探索多结局文字冒险的无限宇宙
          </h1>
          <p className="text-xs md:text-sm text-zinc-400 leading-relaxed font-light">
            选择一份现成精品剧本一键试演、进入可视化编辑器随意魔改契约逻辑，或点击 <b>“AI一键创造”</b> 将脑海中闪烁的一句话、一本小说名段转化为可以自由做抉择、带有 RPG 变量属性的完整分支互动游戏（文游）。
          </p>
        </div>
      </div>

      {loading ? (
        <div id="lib-loading-spinner" className="flex flex-col items-center justify-center p-16 text-zinc-500 gap-3">
          <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
          <p className="text-xs font-mono">同步云端文本档案中...</p>
        </div>
      ) : error ? (
        <div id="lib-error-panel" className="p-8 bg-zinc-900 border border-zinc-800 rounded-3xl text-center max-w-md mx-auto space-y-4">
          <HelpCircle className="w-12 h-12 text-amber-500 mx-auto" />
          <p className="text-xs text-zinc-300">{error}</p>
          <button 
            id="retry-fetch-lib-btn"
            onClick={() => window.location.reload()}
            className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-medium cursor-pointer"
          >
            重试连接同步
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest font-mono">精选上架剧本簿 Selected Stories</h3>
          
          <div id="lib-grid-cards" className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {preloaded.map((story) => {
              // Custom visuals mapping for preset themes
              const isCastle = story.id === "midnight-castle";
              const isCyber = story.id === "cyberpunk-hacker";
              
              return (
                <div 
                  key={story.id} 
                  id={`story-card-${story.id}`}
                  className="bg-zinc-900/90 border border-zinc-800/80 hover:border-violet-500/40 rounded-3xl p-6 flex flex-col justify-between transition-all hover:shadow-[0_0_20px_rgba(139,92,246,0.05)] hover:scale-[1.01] group relative overflow-hidden"
                >
                  {/* Backdrop glowing colors to decorate cards */}
                  <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full blur-3xl opacity-10 pointer-events-none transition-opacity group-hover:opacity-20 ${
                    isCastle ? "bg-red-500" : isCyber ? "bg-cyan-500" : "bg-violet-500"
                  }`}></div>

                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <span className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 rounded-xl text-[10px] font-mono font-bold text-zinc-400">
                        {story.nodes.length} 场景节点
                      </span>
                      <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-zinc-600" />
                        <span>{story.author}</span>
                      </span>
                    </div>

                    <div>
                      <h2 className="text-base font-bold text-zinc-100 font-display group-hover:text-violet-400 transition-colors">
                        {story.title}
                      </h2>
                      <p className="text-xs text-zinc-400 leading-relaxed font-light mt-2 line-clamp-2 md:line-clamp-3">
                        {story.description}
                      </p>
                    </div>

                    {story.variables && story.variables.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {story.variables.slice(0, 3).map((v) => (
                          <span key={v.name} className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded font-mono text-[9px] text-zinc-400">
                            {v.name}: {v.value}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-6 border-t border-zinc-800 pt-4">
                    <button 
                      id={`play-preset-btn-${story.id}`}
                      onClick={() => handleLaunchStory(story, "play")}
                      className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
                    >
                      <Gamepad2 className="w-4 h-4 fill-white" />
                      <span>直接游玩</span>
                    </button>

                    <button 
                      id={`edit-preset-btn-${story.id}`}
                      onClick={() => handleLaunchStory(story, "edit")}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-medium rounded-xl flex items-center justify-center gap-1 transition-all"
                      title="打开本剧本的拓扑图，自由修改场景抉择关系"
                    >
                      <Settings className="w-4 h-4" />
                      <span className="hidden sm:inline">剧本修剪器</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
