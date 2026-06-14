import { useState, useEffect } from "react";
import {
  RotateCcw, ArrowLeft, Terminal, Settings, Sparkles, Trophy, ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Story, StoryNode, GameState, HistorySnapshot, Changes, ConditionString } from "../types";

interface StoryPlayerProps {
  story: Story | null;
  onEditNode?: (nodeId: string) => void;
}

// ─── 条件求值 ──────────────────────────────────────────────────────────────
function evalCondition(cond: string | undefined, state: GameState): boolean {
  if (!cond || cond === "default") return true;
  const s = cond.trim();

  const flagMatch = s.match(/^(!?)hasFlag\s+'([^']+)'$/);
  if (flagMatch) {
    const has = state.flags.has(flagMatch[2]);
    return flagMatch[1] === "!" ? !has : has;
  }

  const cmpMatch = s.match(/^(\w+)\s*(>=|<=|>|<|==|!=)\s*(.+)$/);
  if (cmpMatch) {
    const [, varName, op, rawVal] = cmpMatch;
    const lhs = varName === "val" ? state.val : Number(state.variables[varName] ?? 0);
    const rhs = isNaN(Number(rawVal)) ? rawVal.replace(/'/g, "") : Number(rawVal);
    switch (op) {
      case ">=": return lhs >= (rhs as number);
      case "<=": return lhs <= (rhs as number);
      case ">":  return lhs > (rhs as number);
      case "<":  return lhs < (rhs as number);
      case "==": return lhs == rhs;
      case "!=": return lhs != rhs;
    }
  }

  const strMatch = s.match(/^(\w+)\s*==\s*'([^']*)'$/);
  if (strMatch) return String(state.variables[strMatch[1]]) === strMatch[2];

  return true;
}

// ─── 应用 changes ──────────────────────────────────────────────────────────
function applyChanges(state: GameState, changes: Changes | undefined): Partial<GameState> {
  if (!changes) return {};
  const next: Partial<GameState> = {};

  let newVal = state.val;
  if (changes.val !== undefined) newVal = Math.max(0, Math.min(100, newVal + changes.val));
  if (changes.valSet !== undefined) newVal = Math.max(0, Math.min(100, changes.valSet));
  next.val = newVal;

  const vars = { ...state.variables };
  if (changes.set) Object.assign(vars, changes.set);
  next.variables = vars;

  const flags = new Set(state.flags);
  if (changes.addFlag) flags.add(changes.addFlag);
  if (changes.addFlags) changes.addFlags.forEach(f => flags.add(f));
  if (changes.removeFlag) flags.delete(changes.removeFlag);
  next.flags = flags;

  const achievements = [...state.unlockedAchievements];
  if (changes.unlockAchievement && !achievements.includes(changes.unlockAchievement))
    achievements.push(changes.unlockAchievement);
  if (changes.unlockAchievements)
    changes.unlockAchievements.forEach(a => { if (!achievements.includes(a)) achievements.push(a); });
  next.unlockedAchievements = achievements;

  const importantFlags = [...state.importantFlags];
  if (changes.importantFlag) {
    const imp = typeof changes.importantFlag === "string"
      ? { flag: changes.importantFlag }
      : changes.importantFlag;
    if (!importantFlags.some(f => f.flag === imp.flag)) importantFlags.push(imp);
    flags.add(imp.flag);
    next.flags = flags;
  }
  if (changes.importantFlags) {
    changes.importantFlags.forEach(f => {
      if (!importantFlags.some(x => x.flag === f)) importantFlags.push({ flag: f });
      flags.add(f);
    });
    next.flags = flags;
  }
  next.importantFlags = importantFlags;

  return next;
}

// ─── 初始化游戏状态 ────────────────────────────────────────────────────────
function initState(story: Story): GameState {
  return {
    currentNodeId: story.startNodeId,
    val: story.meta.initialVariable ?? 50,
    variables: { ...(story.variables ?? {}) },
    flags: new Set(),
    unlockedAchievements: [],
    history: [],
    importantFlags: [],
  };
}

const NARRATOR_SPEAKERS = ["系统", "旁白", "System", "Narrator"];
const GLITCH_CHARS = "!@#%&░▒▓│█▌◆●□▪╫╪";
const GLITCH_FRAMES = 10;

function isNarratorSeg(speaker: string | undefined) {
  return !speaker || NARRATOR_SPEAKERS.includes(speaker);
}

function scrambleText(text: string, resolveRatio: number): string {
  return Array.from(text).map(c => {
    if (/[\s，。！？、；：]/.test(c)) return c;
    if (Math.random() < resolveRatio) return c;
    return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
  }).join("");
}

export default function StoryPlayer({ story, onEditNode }: StoryPlayerProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showConsole, setShowConsole] = useState(false);
  const [importantToast, setImportantToast] = useState<string | null>(null);
  const [achToast, setAchToast] = useState<{ title: string; description: string } | null>(null);

  // 打字机状态
  const [typingSegIdx, setTypingSegIdx] = useState(0);
  const [typingCharIdx, setTypingCharIdx] = useState(0);
  const [typingDone, setTypingDone] = useState(false);
  const [typingReady, setTypingReady] = useState(false);
  const [glitchFrame, setGlitchFrame] = useState(-1);
  const [glitchDisplay, setGlitchDisplay] = useState("");

  // Story 切换时重置
  useEffect(() => {
    if (story) setGameState(initState(story));
  }, [story]);

  // 节点切换时重置打字机，延迟 1s 后开始
  useEffect(() => {
    setTypingSegIdx(0);
    setTypingCharIdx(0);
    setTypingDone(false);
    setTypingReady(false);
    setGlitchFrame(-1);
    setGlitchDisplay("");
    const t = setTimeout(() => setTypingReady(true), 1000);
    return () => clearTimeout(t);
  }, [gameState?.currentNodeId]);

  // 打字机驱动
  useEffect(() => {
    if (!gameState || !story || typingDone || !typingReady) return;
    const node = story.nodes[gameState.currentNodeId];
    const segments = node?.segments ?? [];

    if (typingSegIdx >= segments.length) {
      setTypingDone(true);
      return;
    }

    const seg = segments[typingSegIdx];

    // 旁白段落：瞬间跳过，立即推进
    if (isNarratorSeg(seg.speaker)) {
      setTypingSegIdx(i => i + 1);
      setTypingCharIdx(0);
      return;
    }

    // Glitch 段落：乱码逐帧解析
    if (seg.effect === "glitch") {
      if (glitchFrame < GLITCH_FRAMES) {
        const ratio = Math.max(0, glitchFrame) / GLITCH_FRAMES;
        setGlitchDisplay(scrambleText(seg.text, ratio));
        const t = setTimeout(() => setGlitchFrame(f => f + 1), 80);
        return () => clearTimeout(t);
      } else {
        setGlitchDisplay(seg.text);
        const t = setTimeout(() => {
          setGlitchFrame(-1);
          setGlitchDisplay("");
          setTypingSegIdx(i => i + 1);
          setTypingCharIdx(0);
        }, 400);
        return () => clearTimeout(t);
      }
    }

    // 普通对白段落：逐字输出
    if (typingCharIdx >= seg.text.length) {
      const t = setTimeout(() => {
        setTypingSegIdx(i => i + 1);
        setTypingCharIdx(0);
      }, 250);
      return () => clearTimeout(t);
    }

    const id = setInterval(() => setTypingCharIdx(i => i + 1), 35);
    return () => clearInterval(id);
  }, [typingSegIdx, typingCharIdx, typingDone, typingReady, glitchFrame, gameState?.currentNodeId]);

  // 重要 flag 浮动提示
  useEffect(() => {
    if (!gameState?.importantFlags.length) return;
    const latest = gameState.importantFlags[gameState.importantFlags.length - 1];
    setImportantToast(latest.label ?? "记录了关键决定");
    const t = setTimeout(() => setImportantToast(null), 3000);
    return () => clearTimeout(t);
  }, [gameState?.importantFlags.length]);

  // 成就解锁 toast
  useEffect(() => {
    if (!gameState?.unlockedAchievements.length || !story) return;
    const lastId = gameState.unlockedAchievements[gameState.unlockedAchievements.length - 1];
    const ach = story.achievements?.[lastId];
    if (!ach) return;
    setAchToast({ title: ach.title, description: ach.description });
    const t = setTimeout(() => setAchToast(null), 3500);
    return () => clearTimeout(t);
  }, [gameState?.unlockedAchievements.length]);

  if (!story || !gameState) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-zinc-500 gap-4 border border-zinc-800 rounded-2xl">
        <Sparkles className="w-12 h-12 text-zinc-700" />
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-400">尚未载入剧本</p>
          <p className="text-xs text-zinc-600 mt-1">请在「剧本大厅」选择或导入一个 JSON 剧本文件</p>
        </div>
      </div>
    );
  }

  const currentNode: StoryNode | undefined = story.nodes[gameState.currentNodeId];
  if (!currentNode) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-2xl gap-3">
        <p className="text-sm font-medium">找不到节点：<code className="text-amber-400 font-mono">{gameState.currentNodeId}</code></p>
        <button onClick={() => setGameState(initState(story))} className="text-xs text-zinc-500 underline">重置游戏</button>
      </div>
    );
  }

  const resolveRoutes = (node: StoryNode): string | null => {
    if (!node.routes?.length) return null;
    for (const route of node.routes) {
      if (evalCondition(route.condition, gameState)) return route.next;
    }
    return null;
  };

  const goToNode = (nextId: string, changes?: Changes) => {
    const updates = applyChanges(gameState, changes);
    const snapshot: HistorySnapshot = {
      nodeId: gameState.currentNodeId,
      val: gameState.val,
      variables: { ...gameState.variables },
      flags: Array.from(gameState.flags),
    };
    setGameState(prev => ({
      ...prev!,
      ...updates,
      currentNodeId: nextId,
      history: [...prev!.history, snapshot],
    }));
  };

  const autoNext = resolveRoutes(currentNode);
  const handleAutoAdvance = () => {
    if (autoNext) goToNode(autoNext);
    else if (currentNode.next) goToNode(currentNode.next);
  };

  const handleBacktrack = () => {
    if (!gameState.history.length) return;
    const snap = gameState.history[gameState.history.length - 1];
    setGameState(prev => ({
      ...prev!,
      currentNodeId: snap.nodeId,
      val: snap.val,
      variables: snap.variables,
      flags: new Set(snap.flags),
      history: prev!.history.slice(0, -1),
    }));
  };

  const handleReset = () => setGameState(initState(story));

  const isEnding = currentNode.isEnding;
  const hasChoices = (currentNode.choices?.length ?? 0) > 0;
  const hasAuto = !hasChoices && (!!autoNext || !!currentNode.next);
  const valPct = Math.max(0, Math.min(100, gameState.val));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[580px] font-sans relative">

      {/* 重要决定 toast */}
      <AnimatePresence>
        {importantToast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-amber-950/95 border border-amber-500/40 text-amber-300 text-xs font-mono px-4 py-2 rounded-xl shadow-xl backdrop-blur-sm whitespace-nowrap"
          >
            重要决定已记录：{importantToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 成就解锁 toast */}
      <AnimatePresence>
        {achToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            transition={{ duration: 0.3 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-zinc-900/98 border border-amber-500/50 rounded-2xl px-5 py-3.5 flex items-center gap-3 shadow-2xl backdrop-blur-sm"
          >
            <div className="w-8 h-8 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] text-amber-500 font-mono uppercase tracking-widest">成就解锁</p>
              <p className="text-sm font-bold text-zinc-100 leading-tight">{achToast.title}</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">{achToast.description}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main viewport (3 cols) */}
      <div className="lg:col-span-3 flex flex-col min-h-[520px] rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-950 relative">

        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-zinc-900/80 border-b border-zinc-800 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-[10px] font-mono uppercase tracking-widest">
              {isEnding ? "ENDING" : "THEATER"}
            </span>
            <span className="text-[10px] text-zinc-600 font-mono hidden md:block">
              NODE: <span className="text-amber-400/80">{currentNode.title ?? gameState.currentNodeId}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBacktrack}
              disabled={!gameState.history.length}
              className="px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 disabled:opacity-30 rounded-lg flex items-center gap-1 font-mono border border-zinc-700 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>回溯</span>
            </button>
            <button
              onClick={handleReset}
              className="p-1.5 text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-red-950/50 rounded-lg border border-zinc-700 transition-all"
              title="重头开始"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowConsole(!showConsole)}
              className={`p-1.5 rounded-lg border transition-all ${showConsole ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-zinc-800/80 text-zinc-400 border-zinc-700"}`}
            >
              <Terminal className="w-4 h-4" />
            </button>
            {onEditNode && (
              <button
                onClick={() => onEditNode(gameState.currentNodeId)}
                className="px-2.5 py-1.5 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 flex items-center gap-1 font-mono transition-all"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">修剪节点</span>
              </button>
            )}
          </div>
        </div>

        {/* Debug console */}
        <AnimatePresence>
          {showConsole && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="absolute left-4 top-16 bottom-4 w-64 bg-zinc-950/98 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 z-20 shadow-2xl backdrop-blur-md font-mono text-xs"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-amber-400 font-semibold uppercase tracking-wider text-[10px]">Debug Console</span>
                <button onClick={() => setShowConsole(false)} className="text-zinc-500 hover:text-white">✕</button>
              </div>
              <div>
                <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1">{story.meta.variableName ?? "val"}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-zinc-800 rounded">
                    <div className="h-full bg-amber-500 rounded transition-all" style={{ width: `${valPct}%` }} />
                  </div>
                  <span className="text-amber-400 font-bold">{gameState.val}</span>
                </div>
              </div>
              {Object.keys(gameState.variables).length > 0 && (
                <div>
                  <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1">Variables</p>
                  {Object.entries(gameState.variables).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-[10px] py-0.5 border-b border-zinc-800/50">
                      <span className="text-zinc-400">{k}</span>
                      <span className="text-amber-300">{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}
              {gameState.flags.size > 0 && (
                <div>
                  <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1">Flags</p>
                  <div className="flex flex-wrap gap-1">
                    {Array.from(gameState.flags).map(f => (
                      <span key={f} className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-[9px] text-zinc-400">{f}</span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Narrative pane */}
        <div className="bg-zinc-950/98 border-t border-zinc-800 p-6 md:p-8 flex flex-col gap-5">

          {/* Chapter title */}
          <AnimatePresence mode="wait">
            {currentNode.chapterTitle && (
              <motion.div
                key={currentNode.chapterTitle}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <span className="text-[10px] text-amber-500 font-mono tracking-[0.3em] uppercase border-b border-amber-500/30 pb-1">
                  {currentNode.chapterTitle}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Segments */}
          <AnimatePresence mode="wait">
            <motion.div
              key={gameState.currentNodeId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="space-y-3 max-h-64 overflow-y-auto pr-1"
            >
              {(currentNode.segments ?? []).map((seg, i) => {
                if (i > typingSegIdx) return null;
                const isNarrator = isNarratorSeg(seg.speaker);
                const isCurrent = i === typingSegIdx;
                const isGlitch = seg.effect === "glitch";

                let displayText: string;
                let showCursor = false;
                let isGlitching = false;

                if (isCurrent && isGlitch) {
                  isGlitching = glitchFrame >= 0 && glitchFrame < GLITCH_FRAMES;
                  displayText = glitchDisplay || "";
                } else if (isCurrent && !isNarrator) {
                  displayText = seg.text.slice(0, typingCharIdx);
                  showCursor = typingCharIdx < seg.text.length;
                } else {
                  displayText = seg.text;
                }

                return (
                  <div key={i} className={isNarrator ? "" : "pl-4 border-l-2 border-zinc-700"}>
                    {seg.speaker && !isNarrator && (
                      <span className="text-[10px] text-amber-400 font-mono uppercase tracking-wider block mb-0.5">
                        {seg.speaker}
                      </span>
                    )}
                    <p className={`leading-[1.75] tracking-wide font-mono ${
                      isNarrator
                        ? "text-zinc-200 text-sm md:text-base font-light italic font-sans"
                        : isGlitch
                          ? `text-sm transition-colors ${isGlitching ? "text-emerald-400/90" : "text-zinc-100"}`
                          : "text-zinc-100 text-sm"
                    } ${seg.speaker === "系统" || seg.speaker === "旁白" ? "text-zinc-400 text-xs" : ""}`}>
                      {isNarrator && !seg.speaker ? `"${displayText}"` : displayText}
                      {showCursor && (
                        <span className="animate-pulse text-amber-400 ml-0.5">▋</span>
                      )}
                    </p>
                  </div>
                );
              })}

              {/* Ending display */}
              {isEnding && (
                <div className="mt-4 p-4 bg-amber-950/20 border border-amber-500/20 rounded-xl space-y-2">
                  {currentNode.title_end && (
                    <p className="text-amber-400 font-bold text-sm font-display">{currentNode.title_end}</p>
                  )}
                  {currentNode.type && (
                    <span className="text-[9px] font-mono text-amber-500/60 uppercase tracking-widest">{currentNode.type}</span>
                  )}
                  {currentNode.description && (
                    <p className="text-xs text-zinc-300 leading-relaxed">{currentNode.description}</p>
                  )}
                  {currentNode.closing && (
                    <p className="text-xs text-zinc-500 italic border-t border-zinc-800 pt-2">{currentNode.closing}</p>
                  )}
                  <button
                    onClick={handleReset}
                    className="mt-2 px-4 py-1.5 bg-amber-600 text-zinc-950 font-semibold text-[10px] uppercase tracking-wider hover:bg-amber-500 transition-all rounded-none"
                  >
                    另一重宿命轮回
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Auto-advance / routes — 仅在打字完成后显示 */}
          <AnimatePresence>
            {hasAuto && !isEnding && typingDone && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={handleAutoAdvance}
                className="flex items-center gap-2 text-xs text-zinc-400 hover:text-amber-400 border border-zinc-800 hover:border-amber-500/30 rounded-xl px-4 py-2.5 transition-all self-start font-mono"
              >
                <ChevronRight className="w-4 h-4" />
                继续
              </motion.button>
            )}
          </AnimatePresence>

          {/* Choices — 仅在打字完成后显示 */}
          <AnimatePresence>
            {hasChoices && !isEnding && typingDone && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-2.5"
              >
                {currentNode.choices!.map((choice, idx) => {
                  const enabled = evalCondition(choice.condition as ConditionString, gameState);
                  return (
                    <button
                      key={idx}
                      disabled={!enabled}
                      onClick={() => goToNode(choice.next, choice.changes)}
                      className={`group flex items-center justify-between border p-4 text-left transition-all relative ${
                        enabled
                          ? "bg-zinc-950 hover:bg-zinc-900 border-zinc-800 hover:border-amber-500/50 text-zinc-100 cursor-pointer active:scale-[0.99]"
                          : "bg-zinc-950/40 border-zinc-900 text-zinc-700 cursor-not-allowed opacity-40"
                      }`}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <span className={`text-[10px] uppercase tracking-widest font-mono shrink-0 px-2 py-0.5 border leading-none ${
                          enabled ? "border-amber-500/30 text-amber-500 group-hover:bg-amber-500 group-hover:text-zinc-950" : "border-zinc-800 text-zinc-700"
                        } transition-colors`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="text-xs md:text-sm font-light tracking-wide">{choice.text}</span>
                      </div>
                      {choice.condition && !enabled && (
                        <span className="text-[9px] font-mono text-zinc-600 shrink-0 pr-2">🔒 {choice.condition}</span>
                      )}
                      {enabled && (
                        <span className="opacity-0 group-hover:opacity-100 transition-all text-amber-500 font-mono">→</span>
                      )}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Side HUD (1 col) */}
      <div className="flex flex-col gap-4">

        {/* Achievements — 有成就时显示在顶部 */}
        <AnimatePresence>
          {gameState.unlockedAchievements.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-5 space-y-3"
            >
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono flex items-center gap-1.5">
                <Trophy className="w-3 h-3 text-amber-500" />
                已解锁成就
              </p>
              {gameState.unlockedAchievements.map(id => {
                const ach = story.achievements?.[id];
                return ach ? (
                  <div key={id} className="bg-amber-950/10 border border-amber-500/20 rounded-xl p-2.5 space-y-0.5">
                    <p className="text-[10px] font-bold text-amber-400">{ach.title}</p>
                    <p className="text-[9px] text-zinc-500">{ach.description}</p>
                  </div>
                ) : null;
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Manuscript info */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
          <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono">当前手卷</p>
          <h2 className="text-sm font-bold text-amber-400/90 leading-tight">{story.meta.title}</h2>
          <p className="text-[10px] text-zinc-500 font-mono">著者：{story.meta.author}</p>
          {story.meta.description && (
            <p className="text-[11px] text-zinc-500 leading-relaxed font-serif italic line-clamp-3">{story.meta.description}</p>
          )}
        </div>

        {/* Val meter */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono">状态量规</p>
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-zinc-400">{story.meta.variableName ?? "val"}</span>
              <span className="text-amber-400 font-bold">{gameState.val}</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-amber-500 rounded-full"
                animate={{ width: `${valPct}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {Object.entries(gameState.variables).map(([k, v]) => (
            <div key={k} className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-zinc-500">{k}</span>
                <span className="text-zinc-300 font-bold">{String(v)}</span>
              </div>
              {typeof v === "number" && (
                <div className="h-0.5 bg-zinc-800">
                  <div className="h-full bg-zinc-500 transition-all" style={{ width: `${Math.min(100, Math.max(0, v as number))}%` }} />
                </div>
              )}
            </div>
          ))}

          <div className="pt-2 border-t border-zinc-800 flex justify-between text-[10px] font-mono text-zinc-600">
            <span>步数</span>
            <span className="text-amber-500/70">{gameState.history.length + 1}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
