import { useState } from "react";
import { 
  Gamepad2, Settings, Sparkles, BookOpen, BrainCircuit, Github, 
  HelpCircle, Cpu, FileJson, PlayCircle
} from "lucide-react";
import StoryPlayer from "./components/StoryPlayer";
import StoryEditor from "./components/StoryEditor";
import StoryGenerator from "./components/StoryGenerator";
import StoryLib from "./components/StoryLib";
import { defaultStory } from "./default_story";
import { Story } from "./types";

export default function App() {
  // Current active loaded story state
  const [activeStory, setActiveStory] = useState<Story>(defaultStory);
  
  // Navigation tabs state ("library" | "play" | "edit" | "generate")
  const [activeTab, setActiveTab] = useState<"library" | "play" | "edit" | "generate">("library");

  // Editorial bridge: let authors click "Edit Node" in player to swap directly to editor
  const [editorActiveNodeContext, setEditorActiveNodeContext] = useState<string | undefined>(undefined);

  const handleSelectStory = (story: Story) => {
    setActiveStory(story);
  };

  const handleEditNodeContext = (nodeId: string) => {
    setEditorActiveNodeContext(nodeId);
    setActiveTab("edit");
  };

  const handleStorySaved = (updatedStory: Story) => {
    setActiveStory(updatedStory);
  };

  return (
    <div 
      id="app-root-container" 
      className="min-h-screen bg-bg-darker text-zinc-200 flex flex-col justify-between selection:bg-brand/30 selection:text-brand-light"
    >
      
      {/* 1. Upper Glass Dashboard Navigation Header */}
      <header id="main-app-header" className="sticky top-0 z-40 bg-bg-dark/95 backdrop-blur-md border-b border-border-medium px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo with clean descriptive labels */}
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-brand rotate-45 flex items-center justify-center shrink-0">
              <span className="text-[#0F0F0F] font-bold -rotate-45 text-xs font-display tracking-normal">STG</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-light tracking-[0.2em] font-display text-zinc-100 uppercase">
                  Story-to-Game
                </h1>
                <span className="text-[10px] text-brand/80 font-mono tracking-widest uppercase">
                  v2.0_Build
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                从「段落改编」到「分支演播」的互动演绎沙盒
              </p>
            </div>
          </div>

          {/* Clean human navigation tabs */}
          <nav id="top-nav-tabs" className="flex items-center p-1 bg-bg-medium rounded-xl border border-border-dark">
            <button
              id="tab-btn-library"
              onClick={() => {
                setActiveTab("library");
                setEditorActiveNodeContext(undefined);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all duration-300 cursor-pointer border ${
                activeTab === "library" 
                  ? "bg-brand/10 text-brand border-brand/30" 
                  : "text-zinc-400 hover:text-white border-transparent"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>剧本大厅</span>
            </button>

            <button
              id="tab-btn-play"
              onClick={() => {
                setActiveTab("play");
                setEditorActiveNodeContext(undefined);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all duration-300 cursor-pointer border ${
                activeTab === "play" 
                  ? "bg-brand/10 text-brand border-brand/30" 
                  : "text-zinc-400 hover:text-white border-transparent"
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>文游演播厅</span>
            </button>

            <button
              id="tab-btn-edit"
              onClick={() => {
                setActiveTab("edit");
                setEditorActiveNodeContext(undefined);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all duration-300 cursor-pointer border ${
                activeTab === "edit" 
                  ? "bg-brand/10 text-brand border-brand/30" 
                  : "text-zinc-400 hover:text-white border-transparent"
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>剧本编译器</span>
            </button>

            <button
              id="tab-btn-generate"
              onClick={() => {
                setActiveTab("generate");
                setEditorActiveNodeContext(undefined);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all duration-300 cursor-pointer border ${
                activeTab === "generate" 
                  ? "bg-brand/10 text-brand border-brand/30" 
                  : "text-zinc-400 hover:text-white border-transparent"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI 编织炉</span>
            </button>
          </nav>

        </div>
      </header>

      {/* 2. Main content container area */}
      <main id="app-main-view" className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">
        
        {activeTab === "library" && (
          <StoryLib 
            onSelectStory={handleSelectStory} 
            onNavigateToTab={(target) => {
              setActiveTab(target);
              setEditorActiveNodeContext(undefined);
            }} 
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
            activeNodeId={editorActiveNodeContext}
          />
        )}

        {activeTab === "generate" && (
          <StoryGenerator 
            onStoryLoaded={handleSelectStory}
            onNavigateToTab={(target) => {
              setActiveTab(target);
              setEditorActiveNodeContext(undefined);
            }}
          />
        )}

      </main>

      {/* 3. Humble footer credit panels (Unsolicited metadata metrics excluded) */}
      <footer id="app-footer-credit" className="bg-zinc-950 border-t border-zinc-900 py-6 px-6 text-center text-zinc-600 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 select-none">
          <p className="font-light">
            © 2026 Story-to-Game. 携手 Gemini 开启中大容量交互文游的创造纪元。
          </p>

          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span className="flex items-center gap-1 text-zinc-500 hover:text-zinc-400">
              <Cpu className="w-3.5 h-3.5" />
              <span>Server-Side Gemini 3.5 API</span>
            </span>

            <span className="text-zinc-800">|</span>

            <a 
              href="https://github.com/Shanyin-ai/Story-to-game" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              <Github className="w-3.5 h-3.5" />
              <span>Shanyin-ai / Story-to-game GitHub</span>
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
