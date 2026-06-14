import { useState } from "react";
import { ArrowLeft, Github, X, Terminal } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import StoryPlayer from "./components/StoryPlayer";
import StoryEditor from "./components/StoryEditor";
import StoryLib from "./components/StoryLib";
import SkillWorkshop from "./components/SkillWorkshop";
import { Story } from "./types";

type Mode = "library" | "play" | "edit";

export default function App() {
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [mode, setMode] = useState<Mode>("library");
  const [editorNodeContext, setEditorNodeContext] = useState<string | undefined>(undefined);
  const [showSkill, setShowSkill] = useState(false);

  const handlePlay = (story: Story) => {
    setActiveStory(story);
    setMode("play");
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
    setMode("library");
    setEditorNodeContext(undefined);
  };

  return (
    <div
      id="app-root"
      className="min-h-screen bg-zinc-950 text-zinc-200 flex flex-col selection:bg-amber-700/30 selection:text-amber-200"
    >
      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">

          {/* Left: logo mark + name (library) or back button (play/edit) */}
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

          {/* Center: mode badge shown in play/edit */}
          {mode !== "library" && (
            <span className={`px-3 py-1 rounded-lg text-[10px] font-mono uppercase tracking-widest border hidden sm:block ${
              mode === "play"
                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                : "bg-zinc-800/80 text-zinc-400 border-zinc-700"
            }`}>
              {mode === "play" ? "演播厅" : "编译器"}
            </span>
          )}

          {/* Right: GitHub link */}
          <a
            href="https://github.com/cnmzsjbz199328/storytogame"
            target="_blank"
            rel="noreferrer"
            title="GitHub"
            className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
          >
            <Github className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">
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
    </div>
  );
}
