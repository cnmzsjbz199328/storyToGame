import { useState, useEffect } from "react";
import {
  Save, Download, Upload, CheckCircle, AlertTriangle, Layers,
  Clipboard, Check, Plus, Trash2, BookOpen, Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Story, StoryNode } from "../types";

interface StoryEditorProps {
  story: Story | null;
  onStorySaved: (updated: Story) => void;
  activeNodeId?: string;
}

interface ValidationReport {
  errors: string[];
  warnings: string[];
}

function validateStory(story: Story): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const nodeIds = new Set(Object.keys(story.nodes));

  if (!nodeIds.has(story.startNodeId)) {
    errors.push(`起始节点 "${story.startNodeId}" 不存在`);
  }

  // BFS reachability
  const visited = new Set<string>();
  const queue = [story.startNodeId];
  visited.add(story.startNodeId);
  while (queue.length) {
    const id = queue.shift()!;
    const node = story.nodes[id];
    if (!node) continue;

    const nexts: string[] = [];
    node.choices?.forEach(c => nexts.push(c.next));
    node.routes?.forEach(r => nexts.push(r.next));
    if (node.next) nexts.push(node.next);

    nexts.forEach(nid => {
      if (!nodeIds.has(nid)) {
        errors.push(`节点 "${id}" 引用了不存在的节点 "${nid}"`);
      } else if (!visited.has(nid)) {
        visited.add(nid);
        queue.push(nid);
      }
    });
  }

  nodeIds.forEach(id => {
    if (!visited.has(id)) warnings.push(`节点 "${id}" 从起始节点不可达`);
  });

  const endingCount = Object.values(story.nodes).filter(n => n.isEnding).length;
  if (endingCount === 0) warnings.push("没有设置任何结局节点（isEnding: true）");

  const achCount = Object.keys(story.achievements ?? {}).length;
  if (achCount > 0 && endingCount > achCount) {
    warnings.push("成就数量少于结局数量（建议成就数 > 结局数）");
  }

  return { errors, warnings };
}

export default function StoryEditor({ story, onStorySaved, activeNodeId }: StoryEditorProps) {
  const [local, setLocal] = useState<Story | null>(story ? JSON.parse(JSON.stringify(story)) : null);
  const [selectedId, setSelectedId] = useState<string | null>(activeNodeId ?? story?.startNodeId ?? null);
  const [validation, setValidation] = useState<ValidationReport | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    if (story) {
      setLocal(JSON.parse(JSON.stringify(story)));
      setSelectedId(activeNodeId ?? story.startNodeId);
      setValidation(null);
    }
  }, [story, activeNodeId]);

  if (!local) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-zinc-500 gap-4 border border-zinc-800 rounded-2xl">
        <Info className="w-10 h-10 text-zinc-700" />
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-400">尚未载入剧本</p>
          <p className="text-xs text-zinc-600 mt-1">请先在「剧本大厅」选择或导入一个剧本</p>
        </div>
      </div>
    );
  }

  const nodeIds = Object.keys(local.nodes);
  const activeNode: StoryNode | null = selectedId ? local.nodes[selectedId] ?? null : null;

  const update = (updated: Story) => {
    setLocal(updated);
    onStorySaved(updated);
  };

  const updateNode = (id: string, patch: Partial<StoryNode>) => {
    update({ ...local, nodes: { ...local.nodes, [id]: { ...local.nodes[id], ...patch } } });
  };

  const addNode = () => {
    const id = `new_node_${nodeIds.length + 1}`;
    const newNode: StoryNode = {
      segments: [{ text: "在这里撰写剧情叙述..." }],
      choices: [],
    };
    update({ ...local, nodes: { ...local.nodes, [id]: newNode } });
    setSelectedId(id);
  };

  const deleteNode = (id: string) => {
    if (nodeIds.length <= 1) return alert("至少保留一个节点");
    const { [id]: _, ...rest } = local.nodes;
    const nextStart = local.startNodeId === id ? Object.keys(rest)[0] : local.startNodeId;
    update({ ...local, startNodeId: nextStart, nodes: rest });
    if (selectedId === id) setSelectedId(nextStart);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(local, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${local.meta.title.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(local, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const save = () => {
    onStorySaved(local);
    const rep = validateStory(local);
    setValidation(rep);
    setSaveOk(true);
    setTimeout(() => setSaveOk(false), 2000);
  };

  const handleImport = () => {
    setImportError(null);
    try {
      const parsed = JSON.parse(importText) as Story;
      if (!parsed.meta || !parsed.startNodeId || !parsed.nodes) {
        throw new Error("缺少必要字段：meta / startNodeId / nodes");
      }
      update(parsed);
      setSelectedId(parsed.startNodeId);
      setShowImport(false);
      setImportText("");
    } catch (e: any) {
      setImportError(e.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans relative">

      {/* Sidebar (4 cols) */}
      <div className="lg:col-span-4 flex flex-col gap-4">

        {/* Meta panel */}
        <div className="bg-zinc-900/90 p-5 rounded-2xl border border-zinc-800 space-y-3">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono font-bold">书卷元信息</p>
          {(["title", "author", "description"] as const).map(field => (
            <div key={field}>
              <label className="text-[10px] font-semibold text-zinc-400 font-mono uppercase">{field}</label>
              {field === "description" ? (
                <textarea
                  value={local.meta[field] ?? ""}
                  onChange={e => update({ ...local, meta: { ...local.meta, [field]: e.target.value } })}
                  className="w-full mt-1 bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-zinc-200 text-xs rounded-lg p-2 min-h-[56px] max-h-[100px] resize-none focus:outline-none"
                />
              ) : (
                <input
                  type="text"
                  value={local.meta[field] ?? ""}
                  onChange={e => update({ ...local, meta: { ...local.meta, [field]: e.target.value } })}
                  className="w-full mt-1 bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-zinc-200 text-xs rounded-lg p-2 focus:outline-none"
                />
              )}
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-zinc-400 font-mono uppercase">variableName</label>
              <input
                type="text"
                value={local.meta.variableName ?? ""}
                onChange={e => update({ ...local, meta: { ...local.meta, variableName: e.target.value } })}
                className="w-full mt-1 bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-zinc-200 text-xs rounded-lg p-2 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-zinc-400 font-mono uppercase">initialVariable</label>
              <input
                type="number"
                min={0} max={100}
                value={local.meta.initialVariable ?? 50}
                onChange={e => update({ ...local, meta: { ...local.meta, initialVariable: Number(e.target.value) } })}
                className="w-full mt-1 bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-zinc-200 text-xs rounded-lg p-2 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-zinc-400 font-mono uppercase">startNodeId</label>
            <select
              value={local.startNodeId}
              onChange={e => update({ ...local, startNodeId: e.target.value })}
              className="w-full mt-1 bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-zinc-300 text-xs rounded-lg p-2 font-mono focus:outline-none"
            >
              {nodeIds.map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </div>
        </div>

        {/* Node list */}
        <div className="bg-zinc-900/90 p-5 rounded-2xl border border-zinc-800 flex flex-col gap-3 flex-1 min-h-[300px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
              节点目录 ({nodeIds.length})
            </span>
            <button
              onClick={addNode}
              className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-zinc-950 text-[11px] rounded-lg flex items-center gap-1 transition-all"
            >
              <Plus className="w-3 h-3" />新节点
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-80">
            {nodeIds.map(id => {
              const node = local.nodes[id];
              const isStart = id === local.startNodeId;
              const isEnding = node.isEnding;
              const isActive = id === selectedId;
              return (
                <div
                  key={id}
                  onClick={() => setSelectedId(id)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    isActive
                      ? "bg-amber-500/10 border-amber-500/50 text-amber-200"
                      : "bg-zinc-950/40 border-zinc-800 hover:border-zinc-700 text-zinc-400"
                  }`}
                >
                  <div className="flex flex-col truncate pr-2">
                    <span className="font-mono text-xs font-bold truncate">
                      {isStart ? "🏁 " : isEnding ? "🏆 " : "◈ "}{id}
                    </span>
                    <span className="text-[10px] text-zinc-600 truncate mt-0.5">
                      {node.chapterTitle ?? node.segments?.[0]?.text?.slice(0, 30) ?? ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[9px] font-mono bg-zinc-800 px-1 py-0.5 rounded text-zinc-500">
                      C:{node.choices?.length ?? 0}
                    </span>
                    {!isStart && (
                      <button
                        onClick={e => { e.stopPropagation(); deleteNode(id); }}
                        className="p-1 hover:text-red-400 text-zinc-700 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setValidation(validateStory(local))}
            className="w-full py-1.5 bg-zinc-950 border border-zinc-800 hover:border-amber-500/30 hover:text-amber-400 rounded-xl text-xs font-mono text-zinc-500 flex items-center justify-center gap-1.5 transition-colors"
          >
            <CheckCircle className="w-3.5 h-3.5" />验证剧情拓扑
          </button>
        </div>
      </div>

      {/* Main edit area (8 cols) */}
      <div className="lg:col-span-8 bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 flex flex-col gap-5 min-h-[500px]">
        {activeNode ? (
          <>
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded text-[10px] font-mono border border-amber-500/20 uppercase tracking-wider">
                ACTIVE NODE
              </span>
              <span className="text-zinc-400 text-xs font-mono">ID: <span className="text-zinc-100 font-bold">{selectedId}</span></span>
              {activeNode.isEnding && (
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[9px] font-mono border border-emerald-500/20">ENDING</span>
              )}
            </div>

            {/* chapterTitle */}
            <div>
              <label className="text-[10px] font-semibold text-zinc-400 font-mono uppercase">chapterTitle（仅章节首节点填写）</label>
              <input
                type="text"
                value={activeNode.chapterTitle ?? ""}
                onChange={e => updateNode(selectedId!, { chapterTitle: e.target.value || undefined })}
                placeholder="第一章：..."
                className="w-full mt-1 bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-zinc-200 text-xs rounded-xl p-2.5 focus:outline-none"
              />
            </div>

            {/* Segments */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-semibold text-zinc-400 font-mono uppercase flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-zinc-600" />段落 segments ({(activeNode.segments ?? []).length})
                </label>
                <button
                  onClick={() => updateNode(selectedId!, { segments: [...(activeNode.segments ?? []), { text: "" }] })}
                  className="text-amber-400 hover:text-amber-300 text-[11px] font-mono flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />添加段落
                </button>
              </div>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {(activeNode.segments ?? []).map((seg, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 bg-zinc-950/80 p-3 rounded-xl border border-zinc-800">
                    <div className="col-span-3">
                      <input
                        type="text"
                        value={seg.speaker ?? ""}
                        onChange={e => {
                          const segs = [...activeNode.segments];
                          segs[i] = { ...seg, speaker: e.target.value || undefined };
                          updateNode(selectedId!, { segments: segs });
                        }}
                        placeholder="speaker（留空=叙述）"
                        className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] rounded-lg p-1.5 font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="col-span-8">
                      <textarea
                        value={seg.text}
                        onChange={e => {
                          const segs = [...activeNode.segments];
                          segs[i] = { ...seg, text: e.target.value };
                          updateNode(selectedId!, { segments: segs });
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg p-1.5 min-h-[48px] resize-none focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="col-span-1 flex items-start justify-center pt-1">
                      <button
                        onClick={() => {
                          const segs = activeNode.segments.filter((_, j) => j !== i);
                          updateNode(selectedId!, { segments: segs });
                        }}
                        className="p-1 text-zinc-700 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* isEnding toggle */}
            <div className="flex items-center gap-3">
              <label className="text-[10px] font-semibold text-zinc-400 font-mono uppercase">isEnding</label>
              <button
                onClick={() => updateNode(selectedId!, { isEnding: !activeNode.isEnding })}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono border transition-colors ${
                  activeNode.isEnding
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-zinc-900 text-zinc-500 border-zinc-800"
                }`}
              >
                {activeNode.isEnding ? "✓ 结局节点" : "非结局"}
              </button>
              {activeNode.isEnding && (
                <input
                  type="text"
                  value={activeNode.title_end ?? ""}
                  onChange={e => updateNode(selectedId!, { title_end: e.target.value })}
                  placeholder="结局标题"
                  className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-zinc-200 text-xs rounded-lg p-2 focus:outline-none"
                />
              )}
            </div>

            {/* Choices (compact) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-semibold text-zinc-400 font-mono uppercase flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-zinc-600" />分支选项 ({activeNode.choices?.length ?? 0})
                </label>
                <button
                  onClick={() => updateNode(selectedId!, {
                    choices: [...(activeNode.choices ?? []), { text: "新选项...", next: nodeIds[0] ?? "" }]
                  })}
                  className="text-amber-400 hover:text-amber-300 text-[11px] font-mono flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />添加选项
                </button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {(activeNode.choices ?? []).map((choice, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 bg-zinc-950/80 p-3 rounded-xl border border-zinc-800">
                    <div className="col-span-6">
                      <input
                        type="text"
                        value={choice.text}
                        onChange={e => {
                          const cs = [...(activeNode.choices ?? [])];
                          cs[i] = { ...choice, text: e.target.value };
                          updateNode(selectedId!, { choices: cs });
                        }}
                        placeholder="选项文字"
                        className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg p-1.5 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="col-span-4">
                      <select
                        value={choice.next}
                        onChange={e => {
                          const cs = [...(activeNode.choices ?? [])];
                          cs[i] = { ...choice, next: e.target.value };
                          updateNode(selectedId!, { choices: cs });
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-lg p-1.5 font-mono focus:outline-none focus:border-amber-500"
                      >
                        {nodeIds.map(id => <option key={id} value={id}>{id}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2 flex items-center justify-center">
                      <button
                        onClick={() => {
                          const cs = (activeNode.choices ?? []).filter((_, j) => j !== i);
                          updateNode(selectedId!, { choices: cs });
                        }}
                        className="p-1 text-zinc-700 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 text-center p-8">
            <Info className="w-10 h-10 mb-3 text-zinc-800" />
            <p className="text-zinc-400 text-sm">请在左侧目录选择节点</p>
          </div>
        )}

        {/* Action strip */}
        <div className="bg-zinc-950 p-4 border border-zinc-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 mt-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImport(!showImport)}
              className="px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-lg hover:text-white text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              <Upload className="w-4 h-4" />导入 JSON
            </button>
            <button
              onClick={exportJson}
              className="px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-lg hover:text-white text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4" />导出文件
            </button>
            <button
              onClick={copyJson}
              className="px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-lg hover:text-white text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Clipboard className="w-4 h-4" />}
              {copied ? "已复制" : "复制 JSON"}
            </button>
          </div>
          <button
            onClick={save}
            className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-500 rounded-xl font-medium text-xs text-zinc-950 flex items-center justify-center gap-1.5 transition-all active:scale-95"
          >
            {saveOk ? <Check className="w-4 h-4 text-zinc-950" /> : <Save className="w-4 h-4" />}
            {saveOk ? "保存完毕" : "保存变更"}
          </button>
        </div>
      </div>

      {/* Validation modal */}
      <AnimatePresence>
        {validation && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl max-w-lg w-full shadow-2xl"
            >
              <div className="flex items-center gap-2.5 mb-4 border-b border-zinc-800 pb-3">
                <Layers className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-zinc-100">剧本逻辑审查报告</h3>
              </div>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {validation.errors.length > 0 && (
                  <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl space-y-1">
                    <span className="text-[10px] font-mono font-bold text-red-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />错误 ({validation.errors.length})
                    </span>
                    {validation.errors.map((e, i) => (
                      <p key={i} className="text-xs text-red-300 font-mono">{e}</p>
                    ))}
                  </div>
                )}
                {validation.warnings.length > 0 && (
                  <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-1">
                    <span className="text-[10px] font-mono font-bold text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />警告 ({validation.warnings.length})
                    </span>
                    {validation.warnings.map((w, i) => (
                      <p key={i} className="text-xs text-amber-300 font-mono">{w}</p>
                    ))}
                  </div>
                )}
                {validation.errors.length === 0 && validation.warnings.length === 0 && (
                  <div className="p-6 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl text-center">
                    <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2 animate-bounce" />
                    <p className="text-emerald-300 font-semibold text-sm">剧本逻辑无误，可以游玩！</p>
                  </div>
                )}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setValidation(null)}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-medium text-xs rounded-xl"
                >
                  关闭
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Import modal */}
      <AnimatePresence>
        {showImport && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl max-w-lg w-full shadow-2xl"
            >
              <h3 className="font-bold text-base text-zinc-100 flex items-center gap-2 border-b border-zinc-800 pb-3 mb-4">
                <Upload className="w-5 h-5 text-amber-400" />贴入 JSON 剧本
              </h3>
              <textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder='{ "meta": { "title": "..." }, "startNodeId": "start", "nodes": { ... } }'
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 focus:outline-none font-mono text-[11px] p-4 h-56 rounded-2xl text-zinc-200 resize-none"
              />
              {importError && (
                <p className="text-xs text-red-400 mt-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />{importError}
                </p>
              )}
              <div className="flex items-center justify-end gap-2 mt-4 border-t border-zinc-800 pt-4">
                <button onClick={() => setShowImport(false)} className="px-3.5 py-1.5 text-zinc-400 hover:text-white text-xs">取消</button>
                <button onClick={handleImport} className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-medium text-xs rounded-xl">
                  导入
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
