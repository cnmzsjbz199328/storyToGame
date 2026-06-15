import { useState, useRef, useCallback } from "react";
import { ArrowLeft, Github, X, Terminal, Save, BookOpen } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import StoryPlayer from "./components/StoryPlayer";
import StoryEditor from "./components/StoryEditor";
import StoryLib from "./components/StoryLib";
import SkillWorkshop from "./components/SkillWorkshop";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Story, GameState, HistorySnapshot } from "./types";

type Mode = "library" | "play" | "edit";

// ─── 存档 helpers ─────────────────────────────────────────────────────────────
const SAVE_KEY = (title: string) => `stg_v1_${title}`;

interface SaveRecord {
  savedAt: string;
  steps: number;
  nodeId: string;
  state: {
    currentNodeId: string;
    val: number;
    variables: Record<string, unknown>;
    flags: string[];
    unlockedAchievements: string[];
    history: HistorySnapshot[];
    importantFlags: Array<{ flag: string; label?: string }>;
  };
}

function persistSave(story: Story, gs: GameState) {
  const rec: SaveRecord = {
    savedAt: new Date().toISOString(),
    steps: gs.history.length,
    nodeId: gs.currentNodeId,
    state: { ...gs, flags: Array.from(gs.flags) },
  };
  localStorage.setItem(SAVE_KEY(story.meta.title), JSON.stringify(rec));
}

function loadSave(title: string): SaveRecord | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY(title));
    return raw ? (JSON.parse(raw) as SaveRecord) : null;
  } catch { return null; }
}

function deleteSave(title: string) {
  localStorage.removeItem(SAVE_KEY(title));
}

function toGameState(rec: SaveRecord): GameState {
  return { ...rec.state, flags: new Set(rec.state.flags) };
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" })
    + " " + d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [mode, setMode] = useState<Mode>("library");
  const [editorNodeContext, setEditorNodeContext] = useState<string | undefined>(undefined);
  const [showSkill, setShowSkill] = useState(false);
  const [initialGameState, setInitialGameState] = useState<GameState | null>(null);

  // 退出确认 & 恢复存档
  const [exitPrompt, setExitPrompt] = useState(false);
  const [resumeInfo, setResumeInfo] = useState<{ story: Story; save: SaveRecord } | null>(null);

  // 稳定 ref 持有最新 gameState，避免 StoryPlayer 每帧触发 App 重渲
  const latestGameState = useRef<GameState | null>(null);
  const handleGameStateChange = useCallback((s: GameState | null) => {
    latestGameState.current = s;
  }, []);
  const handleGameReset = useCallback(() => {
    if (activeStory) deleteSave(activeStory.meta.title);
  }, [activeStory]);

  const startPlay = (story: Story, saved: GameState | null = null) => {
    setActiveStory(story);
    setInitialGameState(saved);
    setMode("play");
  };

  const handlePlay = (story: Story) => {
    const existing = loadSave(story.meta.title);
    if (existing) {
      setResumeInfo({ story, save: existing });
    } else {
      startPlay(story);
    }
  };

  const handleEdit = (story: Story) => {
    setActiveStory(story);
    setEditorNodeContext(undefined);
    setMode("edit");
  };

  const handleEditNodeContext = (nodeId: string) => {
    setEditorNodeContext(nodeId);
    setMode("edit");
  };

  const handleStorySaved = (updated: Story) => {
    setActiveStory(updated);
  };

  const goToLibrary = () => {
    if (mode === "play" && latestGameState.current && latestGameState.current.history.length > 0) {
      setExitPrompt(true);
      return;
    }
    setMode("library");
    setEditorNodeContext(undefined);
  };

  const confirmExit = (save: boolean) => {
    if (save && activeStory && latestGameState.current) {
      persistSave(activeStory, latestGameState.current);
    }
    setExitPrompt(false);
    setMode("library");
    setEditorNodeContext(undefined);
  };

  const confirmResume = (resume: boolean) => {
    if (!resumeInfo) return;
    const { story, save } = resumeInfo;
    if (!resume) deleteSave(story.meta.title);
    startPlay(story, resume ? toGameState(save) : null);
    setResumeInfo(null);
  };

  return (
    <div
      id="app-root"
      className="min-h-screen bg-zinc-950 text-zinc-200 flex flex-col selection:bg-amber-700/30 selection:text-amber-200"
    >
      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">

          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 bg-amber-500 rotate-45 flex items-center justify-center shrink-0">
              <span className="text-zinc-950 font-bold -rotate-45 text-[10px]">STG</span>
            </div>
            {mode === "library" ? (
              <div className="hidden sm:block">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-light tracking-[0.2em] text-zinc-100 uppercase font-mono">
                    Story-to-Game
                  </h1>
                  <span className="text-[10px] text-amber-500/70 font-mono tracking-widest uppercase">v2.0</span>
                </div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                  Skill-Driven · 终端生成 · 本地演播
                </p>
              </div>
            ) : (
              <button
                onClick={goToLibrary}
                className="flex items-center gap-2 text-zinc-400 hover:text-amber-400 transition-colors min-w-0"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span className="text-xs font-mono truncate max-w-[140px] sm:max-w-xs">
                  {activeStory?.meta.title ?? "剧本大厅"}
                </span>
              </button>
            )}
          </div>

          {mode !== "library" && (
            <span className={`px-3 py-1 rounded-lg text-[10px] font-mono uppercase tracking-widest border hidden sm:block ${
              mode === "play"
                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                : "bg-zinc-800/80 text-zinc-400 border-zinc-700"
            }`}>
              {mode === "play" ? "演播厅" : "编译器"}
            </span>
          )}

        </div>
      </header>

      {/* Main */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">
        <ErrorBoundary>
          {mode === "library" && (
            <StoryLib
              onPlay={handlePlay}
              onEdit={handleEdit}
              onOpenSkillWorkshop={() => setShowSkill(true)}
            />
          )}
          {mode === "play" && (
            <StoryPlayer
              story={activeStory}
              initialState={initialGameState}
              onGameStateChange={handleGameStateChange}
              onGameReset={handleGameReset}
              onEditNode={handleEditNodeContext}
            />
          )}
          {mode === "edit" && (
            <StoryEditor
              story={activeStory}
              onStorySaved={handleStorySaved}
              activeNodeId={editorNodeContext}
            />
          )}
        </ErrorBoundary>
      </main>

      {/* Footer */}
      <footer className="bg-zinc-950 border-t border-zinc-900 py-5 px-6 text-center text-zinc-600 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 select-none">
          <p>© 2026 Story-to-Game · Skill 核心由 Shanyin-ai/Story-to-game 提供</p>
          <a
            href="https://github.com/cnmzsjbz199328/storytogame"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors"
          >
            <Github className="w-3.5 h-3.5" />
            <span>cnmzsjbz199328 / storytogame</span>
          </a>
        </div>
      </footer>

      {/* Skill Workshop Modal */}
      <AnimatePresence>
        {showSkill && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto py-8 px-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowSkill(false); }}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }}
              className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-3xl"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-sm rounded-t-3xl">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold text-zinc-100 font-mono">技能工坊</span>
                </div>
                <button
                  onClick={() => setShowSkill(false)}
                  className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6">
                <SkillWorkshop />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 退出存档 prompt */}
      <AnimatePresence>
        {exitPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4"
            onClick={(e) => { if (e.target === e.currentTarget) setExitPrompt(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm space-y-4"
            >
              <div className="flex items-center gap-2.5">
                <Save className="w-4 h-4 text-amber-400 shrink-0" />
                <h3 className="text-sm font-semibold text-zinc-100">离开前保存进度？</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                已走 <span className="text-amber-400 font-mono">{latestGameState.current?.history.length ?? 0}</span> 步。
                存档保存在本地浏览器，下次打开同一剧本可继续。
              </p>
              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={() => confirmExit(true)}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-zinc-950 text-xs font-semibold rounded-xl transition-all"
                >
                  保存并退出
                </button>
                <button
                  onClick={() => confirmExit(false)}
                  className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-xl border border-zinc-700 transition-all"
                >
                  直接退出（不保存）
                </button>
                <button
                  onClick={() => setExitPrompt(false)}
                  className="w-full py-2 text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
                >
                  继续游戏
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 恢复存档 prompt */}
      <AnimatePresence>
        {resumeInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4"
            onClick={(e) => { if (e.target === e.currentTarget) setResumeInfo(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm space-y-4"
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
                <h3 className="text-sm font-semibold text-zinc-100">发现存档</h3>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 space-y-1">
                <p className="text-xs text-zinc-300 font-mono">{resumeInfo.story.meta.title}</p>
                <p className="text-[10px] text-zinc-500">
                  第 <span className="text-amber-400">{resumeInfo.save.steps}</span> 步 ·{" "}
                  {fmtDate(resumeInfo.save.savedAt)}
                </p>
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={() => confirmResume(true)}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-zinc-950 text-xs font-semibold rounded-xl transition-all"
                >
                  从存档继续
                </button>
                <button
                  onClick={() => confirmResume(false)}
                  className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-xl border border-zinc-700 transition-all"
                >
                  重新开始
                </button>
                <button
                  onClick={() => setResumeInfo(null)}
                  className="w-full py-2 text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
                >
                  取消
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
