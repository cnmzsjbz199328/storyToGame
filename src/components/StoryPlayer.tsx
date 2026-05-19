import { useState, useEffect } from "react";
import { 
  Play, RotateCcw, ArrowLeft, Terminal, ShieldAlert, Sparkles, 
  Settings, Check, Eye, ChevronRight, Wand2, RefreshCw, EyeOff
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Story, StoryNode, GameState } from "../types";

interface StoryPlayerProps {
  story: Story;
  onEditNode?: (nodeId: string) => void;
}

export default function StoryPlayer({ story, onEditNode }: StoryPlayerProps) {
  // Current game state
  const [gameState, setGameState] = useState<GameState>(() => {
    // Initialize state mapping
    const initialVars: Record<string, number | boolean> = {};
    story.variables.forEach(v => {
      if (v.type === "number") {
        initialVars[v.name] = Number(v.value);
      } else {
        initialVars[v.name] = v.value === "true";
      }
    });

    return {
      currentNodeId: story.initialNodeId,
      variables: initialVars,
      history: [],
      logs: []
    };
  });

  // Keep a local cache of generated node images to avoid re-generating
  const [nodeImages, setNodeImages] = useState<Record<string, string>>({});
  const [generatingImg, setGeneratingImg] = useState<boolean>(false);
  const [imageGenError, setImageGenError] = useState<string | null>(null);
  const [showConsole, setShowConsole] = useState<boolean>(false);
  const [actionNarratives, setActionNarratives] = useState<string[]>([]);

  // Find current node
  const currentNode = story.nodes.find(n => n.id === gameState.currentNodeId) || story.nodes[0];

  // Sync / Reset on story reload
  useEffect(() => {
    const initialVars: Record<string, number | boolean> = {};
    story.variables.forEach(v => {
      if (v.type === "number") {
        initialVars[v.name] = Number(v.value);
      } else {
        initialVars[v.name] = v.value === "true";
      }
    });

    setGameState({
      currentNodeId: story.initialNodeId,
      variables: initialVars,
      history: [],
      logs: [currentNode?.text || ""]
    });
    setActionNarratives([]);
  }, [story]);

  if (!currentNode) {
    return (
      <div id="no-start-node" className="flex flex-col items-center justify-center p-12 text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-2xl">
        <ShieldAlert className="w-12 h-12 text-amber-500 mb-4" />
        <p className="font-display font-medium text-lg">找不到起始节点...</p>
        <p className="text-xs text-zinc-500 mt-2">请确保您的剧本内包含 ID 为 "{story.initialNodeId}" 的节点。</p>
      </div>
    );
  }

  // 1. Evaluate whether choice satisfies comparative conditions
  const evaluateCondition = (choice: any) => {
    if (!choice.condition) return { met: true, reason: "" };
    const { name, comparator, value } = choice.condition;
    const currentVal = gameState.variables[name];

    if (currentVal === undefined) {
      return { met: false, reason: `缺少系统属性: ${name}` };
    }

    if (typeof currentVal === "boolean") {
      const targetBool = value === "true";
      if (comparator === "eq") {
        return { 
          met: currentVal === targetBool, 
          reason: currentVal === targetBool ? "" : `不满足: [${name}] 必须为 ${targetBool ? "是" : "否"}`
        };
      }
    } else if (typeof currentVal === "number") {
      const targetNum = Number(value);
      if (isNaN(targetNum)) return { met: false, reason: `目标数值非法: ${value}` };

      if (comparator === "eq") {
        return { met: currentVal === targetNum, reason: `要求 ${name} 等于 ${targetNum}` };
      }
      if (comparator === "gte") {
        return { met: currentVal >= targetNum, reason: `要求 ${name} 至少达到 ${targetNum} (当前: ${currentVal})` };
      }
      if (comparator === "lte") {
        return { met: currentVal <= targetNum, reason: `要求 ${name} 最大为 ${targetNum} (当前: ${currentVal})` };
      }
    }

    return { met: true, reason: "" };
  };

  // 2. Execute choice: applies effects & push onto log histories
  const handleSelectChoice = (choice: any) => {
    const { nextNodeId, text, variableEffect } = choice;
    const { met } = evaluateCondition(choice);
    if (!met) return; // Prevent clicking disabled ones

    // Apply variable effect if present
    const updatedVars = { ...gameState.variables };
    let logNote = "";

    if (variableEffect) {
      const { name, operation, value } = variableEffect;
      const originalVal = updatedVars[name];

      if (originalVal !== undefined) {
        if (typeof originalVal === "boolean") {
          updatedVars[name] = value === "true";
          logNote = `◈ 触发状态：[${name}] 改变为 ${value === "true" ? "是" : "否"}`;
        } else if (typeof originalVal === "number") {
          const delta = Number(value);
          if (!isNaN(delta)) {
            if (operation === "add") {
              // Clamp zero or keep unlimited
              const nextVal = originalVal + delta;
              updatedVars[name] = nextVal;
              logNote = `◈ 数值变动：[${name}] ${delta >= 0 ? "+" + delta : delta} (当前: ${nextVal})`;
            } else if (operation === "set") {
              updatedVars[name] = delta;
              logNote = `◈ 数值重设：[${name}] 设置为 ${delta}`;
            }
          }
        }
      }
    }

    // Next node lookup
    const nextNode = story.nodes.find(n => n.id === nextNodeId);
    const sceneText = nextNode ? nextNode.text : `[错误] 节点 ID "${nextNodeId}" 不存在。`;

    if (logNote) {
      setActionNarratives(prev => [...prev, `${text}`, logNote]);
    } else {
      setActionNarratives(prev => [...prev, `${text}`]);
    }

    // Save history as deep copy
    const snapshotVars = JSON.parse(JSON.stringify(gameState.variables));

    setGameState(prev => ({
      currentNodeId: nextNodeId,
      variables: updatedVars,
      history: [...prev.history, JSON.stringify({ nodeId: prev.currentNodeId, vars: snapshotVars })],
      logs: [...prev.logs, sceneText]
    }));
  };

  // 3. Backtrack one step
  const handleBacktrack = () => {
    if (gameState.history.length === 0) return;
    
    const lastIndex = gameState.history.length - 1;
    const prevHistoryStr = gameState.history[lastIndex];
    const { nodeId, vars } = JSON.parse(prevHistoryStr);

    setGameState(prev => ({
      currentNodeId: nodeId,
      variables: vars,
      history: prev.history.slice(0, lastIndex),
      logs: prev.logs.slice(0, prev.logs.length - 1)
    }));

    setActionNarratives(prev => prev.slice(0, Math.max(0, prev.length - 1)));
  };

  // 4. Reset entire game
  const handleResetGame = () => {
    const initialVars: Record<string, number | boolean> = {};
    story.variables.forEach(v => {
      if (v.type === "number") {
        initialVars[v.name] = Number(v.value);
      } else {
        initialVars[v.name] = v.value === "true";
      }
    });

    setGameState({
      currentNodeId: story.initialNodeId,
      variables: initialVars,
      history: [],
      logs: [story.nodes.find(n => n.id === story.initialNodeId)?.text || ""]
    });
    setActionNarratives([]);
  };

  // 5. Trigger server-side image generator for custom backdrop styling
  const generateBackdropArt = async () => {
    if (!currentNode.imagePrompt) return;
    setGeneratingImg(true);
    setImageGenError(null);

    try {
      const response = await fetch("/api/gemini/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: currentNode.imagePrompt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "网络服务故障，无法建立连接。");
      }

      const data = await response.json();
      if (data.imageUrl) {
        setNodeImages(prev => ({
          ...prev,
          [currentNode.id]: data.imageUrl
        }));
      }
    } catch (err: any) {
      console.error(err);
      setImageGenError(err.message || "图像生成超时，请稍后重试。");
    } finally {
      setGeneratingImg(false);
    }
  };

  // Dynamic background image state
  const cachedImg = nodeImages[currentNode.id];
  // Placeholder elegant vector scenery if no custom illustration is generated yet
  const backgroundStyle = cachedImg 
    ? { backgroundImage: `radial-gradient(circle at center, rgba(10,10,10,0.4) 0%, rgba(5,5,5,0.95) 100%), url(${cachedImg})` }
    : { backgroundImage: `radial-gradient(ellipse at bottom, rgba(15,15,15,0.85) 0%, rgba(5,5,5,1) 100%)` };

  return (
    <div id="story-player-root" className="grid grid-cols-1 lg:grid-cols-4 gap-8 min-h-[580px] font-sans">
      {/* Immersive Main Story View (Left - 3 cols) */}
      <div 
        id="player-viewport"
        className="lg:col-span-3 min-h-[520px] flex flex-col justify-between rounded-3xl overflow-hidden relative border border-border-medium transition-all duration-700 bg-cover bg-center"
        style={backgroundStyle}
      >
        {/* Top Control Overlay bar */}
        <div id="player-banner" className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/85 to-transparent p-5 flex items-center justify-between z-10 backdrop-blur-xs">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-brand/10 text-brand ring-1 ring-brand/30 rounded-full text-[10px] font-mono tracking-widest uppercase font-semibold">
              THEATER / 试演中
            </span>
            <h3 className="text-[10px] text-zinc-500 font-mono tracking-widest hidden md:block uppercase">
              NODE ID: <span className="text-brand font-bold">{currentNode.id}</span>
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick backtrack action */}
            <button 
              id="backtrack-btn"
              onClick={handleBacktrack}
              disabled={gameState.history.length === 0}
              className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-zinc-300 hover:text-white bg-bg-medium/80 hover:bg-bg-light/80 disabled:opacity-35 rounded-lg flex items-center gap-1.5 transition-all border border-border-medium font-mono cursor-pointer"
              title="退回上一个选择，重新斟酌您的决定"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>回溯 ({gameState.history.length})</span>
            </button>

            {/* Reset game */}
            <button 
              id="restart-game-btn"
              onClick={handleResetGame}
              className="p-1.5 text-zinc-300 hover:text-white bg-bg-medium/80 hover:bg-red-950/40 hover:border-red-800/85 rounded-lg transition-all border border-border-medium cursor-pointer"
              title="重头开始冒险"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Show variables console toggle */}
            <button 
              id="console-toggle-btn"
              onClick={() => setShowConsole(!showConsole)}
              className={`p-1.5 rounded-lg transition-all border cursor-pointer ${
                showConsole 
                  ? "bg-brand text-bg-darker border-brand" 
                  : "bg-bg-medium/80 text-brand hover:text-white border-border-medium"
              }`}
              title="展开剧本统计流与命令后台"
            >
              <Terminal className="w-4 h-4" />
            </button>

            {/* Edit current Node handle */}
            {onEditNode && (
              <button 
                id="direct-edit-node-btn"
                onClick={() => onEditNode(currentNode.id)}
                className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-brand bg-brand/10 border border-brand/35 rounded-lg hover:bg-brand/20 transition-all flex items-center gap-1.5 cursor-pointer font-mono font-medium"
                title="直接在编辑器中调试并查看此具体节点"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">修剪此节点</span>
              </button>
            )}
          </div>
        </div>

        {/* AI Drawing/Visual Generator Widget inside background */}
        <div id="ai-backdrop-helper" className="absolute top-20 right-4 z-15 flex flex-col items-end gap-2 max-w-xs">
          {!cachedImg ? (
            <button 
              id="trigger-ai-drawing-btn"
              onClick={generateBackdropArt}
              disabled={generatingImg}
              className="flex items-center gap-2 px-3 py-2 bg-bg-dark/95 text-brand border border-brand/45 rounded-xl hover:bg-bg-light hover:text-brand hover:scale-105 active:scale-95 transition-all shadow-lg text-[10px] tracking-wider font-mono uppercase leading-none disabled:opacity-60 cursor-pointer"
            >
              <Wand2 className={`w-3.5 h-3.5 ${generatingImg ? "animate-spin" : ""}`} />
              <span>{generatingImg ? "雕琢场景插画中..." : "用 AI 唤醒环境插绘"}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 bg-bg-dark/90 p-1.5 rounded-xl border border-border-medium">
              <span className="px-2 py-0.5 bg-brand/10 text-brand text-[9px] rounded font-mono uppercase tracking-widest border border-brand/20">
                AI 画卷就绪
              </span>
              <button 
                id="regenerate-art-btn"
                onClick={generateBackdropArt}
                disabled={generatingImg}
                className="p-1 bg-bg-medium text-zinc-400 hover:text-brand rounded border border-border-medium hover:border-brand transition-colors cursor-pointer"
                title="重新渲染场景"
              >
                <RefreshCw className={`w-3 h-3 ${generatingImg ? "animate-spin" : ""}`} />
              </button>
            </div>
          )}

          {imageGenError && (
            <div id="ai-art-error" className="p-2.5 bg-red-950/80 border border-red-500/40 rounded-xl text-[10px] text-red-200">
              {imageGenError}
            </div>
          )}
        </div>

        {/* Dynamic floating logs sidebar/overlay */}
        <AnimatePresence>
          {showConsole && (
            <motion.div 
              id="history-console-box"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="absolute left-4 top-20 bottom-4 w-72 bg-bg-dark/98 border border-border-medium rounded-2xl p-4 flex flex-col justify-between z-10 shadow-2xl backdrop-blur-md font-mono text-zinc-300"
            >
              <div className="flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between border-b border-border-dark pb-3 mb-3">
                  <span className="text-xs font-semibold text-brand flex items-center gap-1.5 uppercase tracking-wider">
                    <Terminal className="w-3.5 h-3.5" />
                    剧情控制枢纽
                  </span>
                  <button 
                    id="close-console-btn"
                    onClick={() => setShowConsole(false)}
                    className="text-zinc-500 hover:text-white text-xs cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                {/* Adventure Stats Custom Editor Widget */}
                <div className="mb-4">
                  <h4 className="text-[9px] text-[#888] uppercase tracking-widest font-semibold mb-2">调试面板: 操纵状态变量</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                    {Object.keys(gameState.variables).length === 0 ? (
                      <span className="text-zinc-500 text-[10px] block font-sans">暂无可用变量。</span>
                    ) : (
                      Object.entries(gameState.variables).map(([name, val]) => (
                        <div key={name} className="flex items-center justify-between bg-bg-medium/60 p-1.5 rounded border border-border-dark">
                          <span className="font-mono text-xs text-zinc-400 leading-none truncate max-w-[100px]" title={name}>{name}</span>
                          <div className="flex items-center gap-1">
                            {typeof val === "boolean" ? (
                              <button 
                                id={`toggle-bool-${name}`}
                                onClick={() => {
                                  setGameState(prev => ({
                                    ...prev,
                                    variables: { ...prev.variables, [name]: !val }
                                  }));
                                }}
                                className={`px-1.5 py-0.5 text-[10px] rounded leading-none border transition-colors ${
                                  val 
                                    ? "bg-brand/20 text-brand border-brand/40" 
                                    : "bg-red-950/20 text-red-400 border-red-900/40"
                                }`}
                              >
                                {val ? "ON" : "OFF"}
                              </button>
                            ) : (
                              <input 
                                id={`input-num-${name}`}
                                type="number"
                                value={val}
                                onChange={(e) => {
                                  const num = Number(e.target.value);
                                  if (!isNaN(num)) {
                                    setGameState(prev => ({
                                      ...prev,
                                      variables: { ...prev.variables, [name]: num }
                                    }));
                                  }
                                }}
                                className="w-16 bg-bg-darker border border-border-dark rounded px-1.5 py-0.5 text-[10px] text-zinc-200 font-mono text-right"
                              />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Console text log history */}
                <div className="flex-1 overflow-y-auto flex flex-col pr-1">
                  <h4 className="text-[9px] text-[#888] uppercase tracking-widest font-semibold mb-2">行动历史追踪 logs</h4>
                  <div className="space-y-2 text-xs font-sans">
                    {actionNarratives.length === 0 ? (
                      <span className="text-zinc-600 text-[10px] block italic font-sans font-light">静候行径，写录历险...</span>
                    ) : (
                      actionNarratives.map((act, idx) => (
                        <div key={idx} className={`p-1.5 rounded leading-relaxed border ${
                          act.startsWith("◈") 
                            ? "bg-bg-medium border-border-dark text-brand text-[10px] font-mono" 
                            : "bg-brand/5 border-brand/20 text-zinc-300 italic pl-3"
                        }`}>
                          {act}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-zinc-500 text-center font-mono pt-2 border-t border-border-dark">
                可撤回深度: {gameState.history.length}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty placeholder spacer so text pushes down gracefully */}
        <div id="spacer" className="h-40"></div>

        {/* Central Narrative Board & Actions (Artistic minimal floating console pane at bottom) */}
        <div id="narrative-pane" className="bg-bg-darker/98 md:bg-bg-darker/95 border-t border-border-medium p-6 md:p-8 relative z-5 flex flex-col gap-6 select-none">
          
          <div className="text-center">
            <span className="text-[10px] uppercase tracking-[0.3em] text-brand border-b border-brand/50 pb-1.5 font-display inline-block">
              Current Scene Node
            </span>
          </div>

          {/* Main Node Prose Paragraph */}
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentNode.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="space-y-4 max-h-56 overflow-y-auto pr-2 text-center"
            >
              <p className="text-[#F5F2ED] leading-[1.7] tracking-wider text-lg md:text-xl font-serif italic font-light drop-shadow-md">
                "{currentNode.text}"
              </p>

              {/* End of story flag indicator */}
              {currentNode.choices.length === 0 && (
                <div className="p-4 bg-brand/5 border border-brand/20 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-brand max-w-xl mx-auto">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand" />
                    <span className="font-serif italic text-zinc-300">"冒险已落成章，宿命到此定型。"</span>
                  </span>
                  <button 
                    id="restart-game-story-end-btn"
                    onClick={handleResetGame}
                    className="px-4 py-1.5 bg-brand text-[#0F0F0F] font-semibold uppercase tracking-wider text-[10px] hover:bg-brand-light transition-all cursor-pointer font-serif rounded-none"
                  >
                    <span>另一重宿命轮回</span>
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Choices Options Grid: Classic high contrast artistic layouts */}
          <div id="choices-grid" className="flex flex-col gap-3">
            {currentNode.choices.map((choice, index) => {
              const { met, reason } = evaluateCondition(choice);
              
              return (
                <button
                  key={index}
                  id={`choice-btn-${index}`}
                  disabled={!met}
                  onClick={() => handleSelectChoice(choice)}
                  className={`group flex items-center justify-between border p-4 transition-all text-left relative select-none ${
                    met 
                      ? "bg-bg-darker/90 hover:bg-bg-dark/95 border-border-medium hover:border-brand text-zinc-100 hover:shadow-[0_0_15px_rgba(197,164,126,0.1)] active:scale-[0.99] cursor-pointer" 
                      : "bg-bg-darker/40 border-border-dark text-zinc-650 cursor-not-allowed opacity-40"
                  }`}
                >
                  <div className="flex items-center gap-4 w-full">
                    <span className={`text-[10px] uppercase tracking-widest font-mono shrink-0 py-0.5 leading-none px-2 border ${
                      met 
                        ? "border-brand/40 text-brand group-hover:bg-brand group-hover:text-[#0F0F0F]" 
                        : "border-border-dark text-zinc-650"
                    }`}>
                      Option {String.fromCharCode(65 + index)}
                    </span>
                    <span className={`text-xs md:text-sm tracking-wide font-light ${met ? "group-hover:text-zinc-100" : ""}`}>
                      {choice.text}
                    </span>
                  </div>

                  {/* Condition badge if choice has constraints */}
                  {choice.condition && (
                    <div className="absolute right-12 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[9px] font-mono pr-2">
                      <span className={met ? "text-brand" : "text-zinc-600"}>🔒 需要:</span>
                      <span className={`inline-block px-1 rounded-sm leading-none shrink-0 ${
                        met 
                          ? "bg-brand/10 text-brand/90" 
                          : "bg-bg-dark text-zinc-500"
                      }`} title={reason}>
                        {choice.condition.name} {choice.condition.comparator === "eq" ? "=" : choice.condition.comparator === "gte" ? "≥" : "≤"} {choice.condition.value}
                      </span>
                    </div>
                  )}

                  {/* Nice action arrow indicator on hover */}
                  {met && (
                    <span className="opacity-0 group-hover:opacity-100 transform translate-x-[-4px] group-hover:translate-x-0 transition-all font-mono text-brand">
                      →
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Column (Elegant Art / Side HUD Room) */}
      <div id="state-widget-sidebar" className="flex flex-col gap-4 font-sans">
        {/* Story Metadata Cover Deck */}
        <div id="deck-metadata-pane" className="bg-bg-dark p-6 rounded-2xl border border-border-medium flex flex-col gap-4">
          <div>
            <h4 className="text-[9px] text-[#888] uppercase tracking-widest font-mono font-bold">MANUSCRIPT / 当前手卷</h4>
            <h2 className="text-base font-bold font-display text-brand-light leading-tight mt-1.5 truncate" title={story.title}>{story.title}</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">著者: <span className="text-zinc-300 font-sans tracking-normal">{story.author}</span></span>
              <span className="text-zinc-700 font-mono text-[9px]">•</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">场景: <span className="text-zinc-300 font-bold">{story.nodes.length}</span></span>
            </div>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed bg-[#0F0F0F] p-3 border border-[#222] font-serif italic max-h-24 overflow-y-auto scrollbar-thin">
            {story.description}
          </p>
        </div>

        {/* Global RPG Variables/Stats Panel (Formed as luxury flat HUD meters) */}
        <div id="deck-stats-pane" className="bg-bg-dark p-6 rounded-2xl border border-border-medium flex-1 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#222] pb-2">
            <h4 className="text-[9px] text-[#888] uppercase tracking-[0.2em] font-mono font-bold">PLAYER METERS / 角色量规</h4>
            <span className="text-brand text-[9px] font-mono uppercase tracking-widest">
              RPG COMPASS
            </span>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto pr-1 select-none">
            {Object.keys(gameState.variables).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center bg-bg-darker border border-border-dark p-4">
                <span className="text-zinc-650 text-[9px] font-mono uppercase tracking-wider leading-relaxed">本手卷无声望或道具限制</span>
                <span className="text-zinc-500 text-[9px] mt-1 tracking-wider uppercase font-mono">请在编辑器或生成炉自由增扩</span>
              </div>
            ) : (
              Object.entries(gameState.variables).map(([name, val]) => {
                const isHealthType = name.toLowerCase().includes("health") || name.toLowerCase().includes("hp");
                const isSanityType = name.toLowerCase().includes("sanity") || name.toLowerCase().includes("mental");
                
                return (
                  <div key={name} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between leading-none text-[10px] uppercase tracking-wider">
                      <span className="font-semibold text-zinc-400 font-mono text-[10px] truncate mr-2" title={name}>
                        {name === "health" ? "❤️生命值 / Health" : name === "sanity" ? "🔮理智度 / Sanity" : name}
                      </span>
                      <span className="font-bold text-brand font-mono text-[10px]">
                        {typeof val === "boolean" ? (val ? "YES" : "NO") : val}
                      </span>
                    </div>

                    {/* Highly stylized thin indicator lines like requested by mock HTML */}
                    {typeof val === "number" && (
                      <div className="w-full h-[2px] bg-[#222]">
                        <div 
                          className="h-full bg-brand transition-all duration-750"
                          style={{ width: `${Math.max(0, Math.min(100, val))}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-3 border-t border-[#222] flex items-center justify-between text-[10px] text-[#666] uppercase tracking-widest font-mono">
            <span>Steps:</span>
            <span className="text-brand">{gameState.history.length + 1} / PATHWAYS</span>
          </div>
        </div>
      </div>
    </div>
  );
}
