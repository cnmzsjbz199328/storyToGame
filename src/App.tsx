import { useState } from "react";
import { Gamepad2, Settings, BookOpen, Github, Terminal } from "lucide-react";
import StoryPlayer from "./components/StoryPlayer";
import StoryEditor from "./components/StoryEditor";
import StoryLib from "./components/StoryLib";
import SkillWorkshop from "./components/SkillWorkshop";
import { Story } from "./types";

type Tab = "library" | "play" | "edit" | "skill";

export default function App() {
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("library");
  const [editorNodeContext, setEditorNodeContext] = useState<string | undefined>(undefined);

  const handleSelectStory = (story: Story) => {
    setActiveStory(story);
  };

  const handleEditNodeContext = (nodeId: string) => {
    setEditorNodeContext(nodeId);
    setActiveTab("edit");
  };

  const handleStorySaved = (updated: Story) => {
    setActiveStory(updated);
  };

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setEditorNodeContext(undefined);
  };

  return (
    <div
      id="app-root"
      className="min-h-screen bg-zinc-950 text-zinc-200 flex flex-col selection:bg-amber-700/30 selection:text-amber-200"
    >
      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">

          <div className="flex items-center gap-4">
            <div className="w-7 h-7 bg-amber-500 rotate-45 flex items-center justify-center shrink-0">
              <span className="text-zinc-950 font-bold -rotate-45 text-[10px]">STG</span>
            </div>
            <div>
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
          </div>

          <nav className="flex items-center p-1 bg-zinc-900 rounded-xl border border-zinc-800">
            {(
              [
                { id: "library", icon: BookOpen, label: "剧本大厅" },
                { id: "play",    icon: Gamepad2, label: "演播厅" },
                { id: "edit",    icon: Settings, label: "编译器" },
                { id: "skill",   icon: Terminal, label: "技能工坊" },
              ] as { id: Tab; icon: typeof BookOpen; label: string }[]
            ).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => switchTab(id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all duration-200 border ${
                  activeTab === id
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    : "text-zinc-400 hover:text-white border-transparent"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">
        {activeTab === "library" && (
          <StoryLib
            onSelectStory={handleSelectStory}
            onNavigateToTab={switchTab}
          />
        )}
        {activeTab === "play" && (
          <StoryPlayer
            story={activeStory}
            onEditNode={handleEditNodeContext}
          />
        )}
        {activeTab === "edit" && (
          <StoryEditor
            story={activeStory}
            onStorySaved={handleStorySaved}
            activeNodeId={editorNodeContext}
          />
        )}
        {activeTab === "skill" && <SkillWorkshop />}
      </main>

      {/* Footer */}
      <footer className="bg-zinc-950 border-t border-zinc-900 py-5 px-6 text-center text-zinc-600 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 select-none">
          <p>© 2026 Story-to-Game · Skill 核心由 Shanyin-ai/Story-to-game 提供</p>
          <a
            href="https://github.com/Shanyin-ai/Story-to-game"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors"
          >
            <Github className="w-3.5 h-3.5" />
            <span>Shanyin-ai / Story-to-game</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
