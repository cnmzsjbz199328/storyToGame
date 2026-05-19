import { useState, useEffect, FormEvent } from "react";
import { 
  Plus, Trash2, Key, Info, HelpCircle, Save, Download, Upload, 
  Settings, CheckCircle, AlertTriangle, Layers, ListFilter, Clipboard, 
  Sparkles, Check, ChevronRight, CornerDownRight, BookOpen, UserCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Story, StoryNode, Choice, Variable, Condition, VariableEffect } from "../types";

interface StoryEditorProps {
  story: Story;
  onStorySaved: (updated: Story) => void;
  activeNodeId?: string; // Optional direct navigation context from Player
}

interface ValidationReport {
  status: "success" | "warning" | "error";
  unreachable: string[];
  deadEnds: string[];
  missingLinks: Array<{ node: string; choiceText: string; target: string }>;
  success: boolean;
}

export default function StoryEditor({ story, onStorySaved, activeNodeId }: StoryEditorProps) {
  // Main Story local working copy
  const [localStory, setLocalStory] = useState<Story>(() => JSON.parse(JSON.stringify(story)));
  const [selectedNodeId, setSelectedNodeId] = useState<string>(activeNodeId || story.initialNodeId);

  // Sub-forms active modal variables
  const [showVarModal, setShowVarModal] = useState<boolean>(false);
  const [newVarName, setNewVarName] = useState<string>("");
  const [newVarType, setNewVarType] = useState<"number" | "boolean">("number");
  const [newVarVal, setNewVarVal] = useState<string>("100");

  // Validations and messaging
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [clipboardCopied, setClipboardCopied] = useState<boolean>(false);
  const [importJsonText, setImportJsonText] = useState<string>("");
  const [importError, setImportError] = useState<string | null>(null);
  const [showImportPanel, setShowImportPanel] = useState<boolean>(false);

  // Sync state if story swaps externally
  useEffect(() => {
    setLocalStory(JSON.parse(JSON.stringify(story)));
    if (activeNodeId) {
      setSelectedNodeId(activeNodeId);
    } else {
      setSelectedNodeId(story.initialNodeId);
    }
    setValidationReport(null);
  }, [story, activeNodeId]);

  // Find currently editting node
  const activeNode = localStory.nodes.find(n => n.id === selectedNodeId) || localStory.nodes[0];

  // Apply overall model change callback
  const updateStoryAndNotify = (updated: Story) => {
    setLocalStory(updated);
    onStorySaved(updated);
    // Auto validate after modification
    validateGameTree(updated);
  };

  // 1. Validate complete game tree routing logic
  const validateGameTree = (targetStory: Story) => {
    const nodes = targetStory.nodes;
    const initialId = targetStory.initialNodeId;

    const allNodeIds = new Set(nodes.map(n => n.id));
    const visited = new Set<string>();
    const missingLinks: ValidationReport["missingLinks"] = [];

    // Simple BFS from start
    const queue: string[] = [initialId];
    visited.add(initialId);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const nodeObj = nodes.find(n => n.id === currentId);
      if (!nodeObj) continue;

      nodeObj.choices.forEach(choice => {
        if (!allNodeIds.has(choice.nextNodeId)) {
          missingLinks.push({
            node: currentId,
            choiceText: choice.text,
            target: choice.nextNodeId
          });
        } else if (!visited.has(choice.nextNodeId)) {
          visited.add(choice.nextNodeId);
          queue.push(choice.nextNodeId);
        }
      });
    }

    // Unreachable nodes
    const unreachable = nodes.filter(n => !visited.has(n.id)).map(n => n.id);

    // Warnings about normal nodes that have no choices but are NOT marked or are ending links
    const deadEnds = nodes.filter(n => n.id !== initialId && n.choices.length === 0).map(n => n.id);

    const report: ValidationReport = {
      status: missingLinks.length > 0 ? "error" : unreachable.length > 0 ? "warning" : "success",
      unreachable,
      deadEnds,
      missingLinks,
      success: missingLinks.length === 0
    };

    setValidationReport(report);
  };

  // 2. Add empty node
  const handleAddNewNode = () => {
    const baseId = "new_scene_" + (localStory.nodes.length + 1);
    const newNode: StoryNode = {
      id: baseId,
      text: "在这里撰写戏剧性的剧情叙述段落...",
      imagePrompt: "A descriptive art scene prompt for visual backgrounds (e.g., 'An illuminated gothic staircase in a dim hallway, digital concept paint')",
      choices: []
    };

    const updated = {
      ...localStory,
      nodes: [...localStory.nodes, newNode]
    };
    setSelectedNodeId(baseId);
    updateStoryAndNotify(updated);
  };

  // Delete node
  const handleDeleteNode = (nodeId: string) => {
    if (localStory.nodes.length <= 1) {
      alert("错误：剧本必须至少容纳 1 个核心剧情节点。");
      return;
    }
    const filteredNodes = localStory.nodes.filter(n => n.id !== nodeId);

    // If starting node deleted, shift start node to first available
    let nextInitialId = localStory.initialNodeId;
    if (localStory.initialNodeId === nodeId) {
      nextInitialId = filteredNodes[0].id;
    }

    const updated = {
      ...localStory,
      initialNodeId: nextInitialId,
      nodes: filteredNodes
    };

    // Swap active selected point
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(nextInitialId);
    }

    updateStoryAndNotify(updated);
  };

  // Edit current node properties
  const handleNodePropertyChange = (field: keyof StoryNode, val: any) => {
    if (!activeNode) return;

    // Handle rename node ID safely, fixing reference links inside core of choices
    if (field === "id") {
      const targetId = val.trim().replace(/\s+/g, "_");
      if (!targetId) return;

      // Duplicate check
      const duplicateExists = localStory.nodes.some(n => n.id === targetId && n.id !== activeNode.id);
      if (duplicateExists) return; // Prevent overwriting other nodes ID

      const originalId = activeNode.id;
      const updatedNodes = localStory.nodes.map(n => {
        if (n.id === originalId) {
          return { ...n, id: targetId };
        }
        // Rename choices targets pointing to this original ID
        const renamedChoices = n.choices.map(c => {
          if (c.nextNodeId === originalId) {
            return { ...c, nextNodeId: targetId };
          }
          return c;
        });
        return { ...n, choices: renamedChoices };
      });

      const updated = {
        ...localStory,
        initialNodeId: localStory.initialNodeId === originalId ? targetId : localStory.initialNodeId,
        nodes: updatedNodes
      };

      setSelectedNodeId(targetId);
      updateStoryAndNotify(updated);
      return;
    }

    // Normal attribute rewrite
    const updatedNodes = localStory.nodes.map(n => {
      if (n.id === activeNode.id) {
        return { ...n, [field]: val };
      }
      return n;
    });

    updateStoryAndNotify({ ...localStory, nodes: updatedNodes });
  };

  // Safe choice modifier utilities
  const handleAddNewChoice = () => {
    if (!activeNode) return;
    const defaultTarget = localStory.nodes.find(n => n.id !== activeNode.id)?.id || activeNode.id;
    
    const newChoice: Choice = {
      text: "新分支抉择描述...",
      nextNodeId: defaultTarget
    };

    const updatedNodes = localStory.nodes.map(n => {
      if (n.id === activeNode.id) {
        return { ...n, choices: [...n.choices, newChoice] };
      }
      return n;
    });

    updateStoryAndNotify({ ...localStory, nodes: updatedNodes });
  };

  const handleUpdateChoiceValue = (idx: number, field: keyof Choice, val: any) => {
    if (!activeNode) return;

    const updatedChoices = activeNode.choices.map((c, i) => {
      if (i === idx) {
        return { ...c, [field]: val };
      }
      return c;
    });

    const updatedNodes = localStory.nodes.map(n => {
      if (n.id === activeNode.id) {
        return { ...n, choices: updatedChoices };
      }
      return n;
    });

    updateStoryAndNotify({ ...localStory, nodes: updatedNodes });
  };

  const handleDeleteChoice = (idx: number) => {
    if (!activeNode) return;
    const filteredChoices = activeNode.choices.filter((_, i) => i !== idx);

    const updatedNodes = localStory.nodes.map(n => {
      if (n.id === activeNode.id) {
        return { ...n, choices: filteredChoices };
      }
      return n;
    });

    updateStoryAndNotify({ ...localStory, nodes: updatedNodes });
  };

  // 3. Choice sub-property controls (Condition / Variable Effects builders)
  const handleChoiceSetCondition = (choiceIdx: number, flagOn: boolean) => {
    if (!activeNode) return;
    const targetChoice = activeNode.choices[choiceIdx];

    const updatedChoices = activeNode.choices.map((c, i) => {
      if (i === choiceIdx) {
        if (flagOn) {
          const firstVar = localStory.variables[0]?.name || "health";
          return {
            ...c,
            condition: {
              name: firstVar,
              comparator: "eq",
              value: "true"
            }
          };
        } else {
          const { condition, ...rest } = c;
          return rest;
        }
      }
      return c;
    });

    const updatedNodes = localStory.nodes.map(n => {
      if (n.id === activeNode.id) {
        return { ...n, choices: updatedChoices };
      }
      return n;
    });

    updateStoryAndNotify({ ...localStory, nodes: updatedNodes });
  };

  const handleChoiceModifyCondition = (choiceIdx: number, subField: keyof Condition, val: any) => {
    if (!activeNode) return;
    const condObj = activeNode.choices[choiceIdx].condition;
    if (!condObj) return;

    const updatedChoices = activeNode.choices.map((c, i) => {
      if (i === choiceIdx) {
        return {
          ...c,
          condition: { ...condObj, [subField]: val }
        };
      }
      return c;
    });

    const updatedNodes = localStory.nodes.map(n => {
      if (n.id === activeNode.id) {
        return { ...n, choices: updatedChoices };
      }
      return n;
    });

    updateStoryAndNotify({ ...localStory, nodes: updatedNodes });
  };

  const handleChoiceSetEffect = (choiceIdx: number, flagOn: boolean) => {
    if (!activeNode) return;
    const targetChoice = activeNode.choices[choiceIdx];

    const updatedChoices = activeNode.choices.map((c, i) => {
      if (i === choiceIdx) {
        if (flagOn) {
          const firstVar = localStory.variables[0]?.name || "health";
          return {
            ...c,
            variableEffect: {
              name: firstVar,
              operation: "set",
              value: "true"
            }
          };
        } else {
          const { variableEffect, ...rest } = c;
          return rest;
        }
      }
      return c;
    });

    const updatedNodes = localStory.nodes.map(n => {
      if (n.id === activeNode.id) {
        return { ...n, choices: updatedChoices };
      }
      return n;
    });

    updateStoryAndNotify({ ...localStory, nodes: updatedNodes });
  };

  const handleChoiceModifyEffect = (choiceIdx: number, subField: keyof VariableEffect, val: any) => {
    if (!activeNode) return;
    const effectObj = activeNode.choices[choiceIdx].variableEffect;
    if (!effectObj) return;

    const updatedChoices = activeNode.choices.map((c, i) => {
      if (i === choiceIdx) {
        return {
          ...c,
          variableEffect: { ...effectObj, [subField]: val }
        };
      }
      return c;
    });

    const updatedNodes = localStory.nodes.map(n => {
      if (n.id === activeNode.id) {
        return { ...n, choices: updatedChoices };
      }
      return n;
    });

    updateStoryAndNotify({ ...localStory, nodes: updatedNodes });
  };

  // Variable management functions
  const handleAddNewVariable = () => {
    if (!newVarName.trim()) return;
    const cleanedName = newVarName.trim().toLowerCase().replace(/\s+/g, "_");

    // Avoid duplicate key
    if (localStory.variables.some(v => v.name === cleanedName)) {
      alert("错误：已经存在该名称的变量状态。");
      return;
    }

    const newVar: Variable = {
      name: cleanedName,
      type: newVarType,
      value: newVarVal
    };

    const updated = {
      ...localStory,
      variables: [...localStory.variables, newVar]
    };

    updateStoryAndNotify(updated);
    setNewVarName("");
    setShowVarModal(false);
  };

  const handleDeleteVariable = (varName: string) => {
    const filteredVars = localStory.variables.filter(v => v.name !== varName);
    const updated = {
      ...localStory,
      variables: filteredVars
    };
    updateStoryAndNotify(updated);
  };

  // 4. Import / Export JSON tools handles
  const exportStoryAsJsonFile = () => {
    const blob = new Blob([JSON.stringify(localStory, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeTitle = localStory.title.replace(/\s+/g, "_");
    a.href = url;
    a.download = `${safeTitle}_narrative_script.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyStoryToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(localStory, null, 2));
    setClipboardCopied(true);
    setTimeout(() => setClipboardCopied(false), 2000);
  };

  const handleImportJsonSubmit = (e: FormEvent) => {
    e.preventDefault();
    setImportError(null);

    try {
      const parsed = JSON.parse(importJsonText);
      
      // Basic structure validation
      if (!parsed.title || !parsed.initialNodeId || !parsed.nodes || !Array.isArray(parsed.nodes)) {
        throw new Error("格式不正确：必须确保有 title, initialNodeId, 且 nodes 是数组结构。");
      }

      setLocalStory(parsed);
      onStorySaved(parsed);
      validateGameTree(parsed);
      setSelectedNodeId(parsed.initialNodeId);
      setShowImportPanel(false);
      setImportJsonText("");
    } catch (err: any) {
      setImportError(err.message || "JSON 解析失败，请校对括号及引号标签。");
    }
  };

  // Save changes
  const saveAllEdits = () => {
    onStorySaved(localStory);
    validateGameTree(localStory);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2200);
  };

  return (
    <div id="story-editor-root" className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-sans relative">
      
      {/* Sidebar: Node selector & global config (4 cols) */}
      <div id="editor-sidebar" className="lg:col-span-4 flex flex-col gap-4">
        
        {/* Story Metadata Block panel */}
        <div id="editor-meta-panel" className="bg-zinc-900/90 p-5 rounded-2xl border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono font-bold">书卷配置及编目</h4>
            <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-300 rounded text-[9px] font-mono border border-amber-500/20">
              YAML WRAPPER
            </span>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="text-[10px] font-semibold text-zinc-400 font-mono uppercase">书名 Title</label>
              <input 
                id="edit-story-title-input"
                type="text"
                value={localStory.title}
                onChange={(e) => updateStoryAndNotify({ ...localStory, title: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-violet-500 text-zinc-200 text-xs rounded-lg p-2 mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-zinc-400 font-mono uppercase font-bold">著者 Author</label>
                <input 
                  id="edit-story-author-input"
                  type="text"
                  value={localStory.author}
                  onChange={(e) => updateStoryAndNotify({ ...localStory, author: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-violet-500 text-zinc-200 text-xs rounded-lg p-2 mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-zinc-400 font-mono uppercase font-bold font-mono">起始节点 Start</label>
                <select
                  id="edit-story-start-node-select"
                  value={localStory.initialNodeId}
                  onChange={(e) => updateStoryAndNotify({ ...localStory, initialNodeId: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-violet-500 text-zinc-300 text-xs rounded-lg p-2 mt-1 font-mono"
                >
                  {localStory.nodes.map(n => (
                    <option key={n.id} value={n.id}>{n.id}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-zinc-400 font-mono uppercase">故事梗概 Description</label>
              <textarea 
                id="edit-story-description-textarea"
                value={localStory.description}
                onChange={(e) => updateStoryAndNotify({ ...localStory, description: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-violet-500 text-zinc-200 text-xs rounded-lg p-2 mt-1 min-h-[60px] max-h-[120px] resize-none"
              />
            </div>
          </div>
        </div>

        {/* Global RPG Variables Config Panel */}
        <div id="editor-variables-panel" className="bg-zinc-900/90 p-5 rounded-2xl border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
              初始全局属性变量 ({localStory.variables.length})
            </span>
            <button 
              id="trigger-add-var-btn"
              onClick={() => setShowVarModal(true)}
              className="text-violet-400 hover:text-violet-300 text-xs flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>添加</span>
            </button>
          </div>

          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {localStory.variables.length === 0 ? (
              <span className="text-zinc-500 text-[11px] block text-center py-3">无活跃全局状态变量</span>
            ) : (
              localStory.variables.map((v) => (
                <div key={v.name} className="flex items-center justify-between bg-zinc-950/60 border border-zinc-800/80 p-2 rounded-xl">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-zinc-300 font-mono italic">{v.name}</span>
                    <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">{v.type} | 默认值: {v.value}</span>
                  </div>

                  <button 
                    id={`delete-var-btn-${v.name}`}
                    onClick={() => handleDeleteVariable(v.name)}
                    className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Dynamic game nodes directory sidebar select block */}
        <div id="editor-nodes-list-panel" className="bg-zinc-900/90 p-5 rounded-2xl border border-zinc-800 flex-1 flex flex-col gap-3 min-h-[300px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
              剧情节点目录 ({localStory.nodes.length})
            </span>
            <button 
              id="add-new-node-btn"
              onClick={handleAddNewNode}
              className="px-2 py-1 bg-violet-600 hover:bg-violet-500 text-white text-[11px] rounded-lg flex items-center gap-1 transition-all cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>新场景</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[350px]">
            {localStory.nodes.map(n => {
              const isStart = n.id === localStory.initialNodeId;
              const isTerminal = n.choices.length === 0;
              const isActive = n.id === selectedNodeId;

              return (
                <div 
                  key={n.id}
                  id={`edit-node-row-${n.id}`}
                  onClick={() => setSelectedNodeId(n.id)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                    isActive 
                      ? "bg-violet-600/10 border-violet-500 text-violet-200 shadow-md" 
                      : "bg-zinc-950/40 border-zinc-800/80 hover:border-zinc-700 text-zinc-400"
                  }`}
                >
                  <div className="flex flex-col truncate pr-2">
                    <span className="font-mono text-xs font-bold truncate">
                      {isStart ? "🏁 " : isTerminal ? "🏆 " : "◈ "}{n.id}
                    </span>
                    <span className="text-[10px] text-zinc-500 truncate mt-0.5 max-w-[170px]" title={n.text}>
                      {n.text}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[9px] font-mono bg-zinc-800 px-1 py-0.5 rounded text-zinc-400">
                      C:{n.choices.length}
                    </span>

                    {!isStart && (
                      <button 
                        id={`delete-node-btn-${n.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNode(n.id);
                        }}
                        className="p-1 hover:text-red-400 text-zinc-600 transition-colors"
                        title="删除此场景节点"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-zinc-800">
            <button 
              id="validate-tree-btn"
              onClick={() => validateGameTree(localStory)}
              className="w-full py-1.5 bg-zinc-950 border border-zinc-800 hover:border-violet-500/40 hover:text-violet-300 rounded-xl text-xs font-medium text-zinc-400 transition-colors flex items-center justify-center gap-1.5 cursor-pointer font-mono"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>验证全卷剧情逻辑拓扑</span>
            </button>
          </div>
        </div>

      </div>

      {/* Main Editing Area (8 cols) */}
      <div id="editor-main-panel" className="lg:col-span-8 bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 flex flex-col gap-6 min-h-[600px]">
        {activeNode ? (
          <div className="space-y-6 flex-1 flex flex-col justify-between">
            <div className="space-y-5">
              {/* Active node settings ID head fields */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-zinc-800 pb-3 gap-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-violet-500/10 text-violet-400 rounded text-[10px] font-mono border border-violet-500/20 uppercase tracking-wider leading-none">
                    ACTIVE NODE SCENE
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-zinc-600 text-xs">ID:</span>
                    <input 
                      id="edit-node-id-direct"
                      type="text"
                      value={activeNode.id}
                      onChange={(e) => handleNodePropertyChange("id", e.target.value)}
                      placeholder="起点通常设为 start"
                      className="bg-transparent border-b border-zinc-800 focus:border-violet-500 font-mono text-zinc-100 text-xs font-bold px-1.5 py-0.5 focus:outline-hidden w-40"
                    />
                  </div>
                </div>

                <div className="text-[10px] text-zinc-500 font-mono">
                  被起跑点设定: {activeNode.id === localStory.initialNodeId ? "起始位置" : "分支场景"}
                </div>
              </div>

              {/* Story segment textarea prose block */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 font-mono uppercase tracking-wide flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
                  剧情叙事描述 (Text Segment)
                </label>
                <textarea 
                  id="edit-node-text-direct"
                  value={activeNode.text}
                  onChange={(e) => handleNodePropertyChange("text", e.target.value)}
                  placeholder="利用第二人称讲述细节场景（例：'你推开大门，狂风大作...'）使游玩玩家产生身临其境的感觉..."
                  className="w-full p-4 bg-zinc-950 border border-zinc-800 focus:border-violet-500 focus:outline-hidden text-zinc-100 text-xs md:text-sm rounded-xl min-h-[140px] max-h-[220px] tracking-wide leading-relaxed font-light scrollbar-thin"
                />
              </div>

              {/* Image illustration prompt box */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-zinc-400 font-mono uppercase tracking-wide flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-zinc-500" />
                  环境插绘特制 AI 提示词 (Environment Image Prompt)
                </label>
                <input 
                  id="edit-node-imageprompt"
                  type="text"
                  value={activeNode.imagePrompt}
                  onChange={(e) => handleNodePropertyChange("imagePrompt", e.target.value)}
                  placeholder="例：A cinematic castle hallway illuminated by flickering torches, photorealistic concept art"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-violet-500 text-zinc-200 text-xs rounded-xl p-3"
                />
              </div>

              {/* Choices Paths custom editor */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-1.5">
                  <label className="text-xs font-semibold text-zinc-300 font-mono uppercase tracking-wide flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-zinc-500" />
                    分支抉择设定 ({activeNode.choices.length})
                  </label>
                  
                  <button 
                    id="add-choice-btn"
                    onClick={handleAddNewChoice}
                    className="text-violet-400 hover:text-violet-300 text-[11px] font-mono flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>添加选项分支</span>
                  </button>
                </div>

                {activeNode.choices.length === 0 ? (
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-center">
                    <span className="text-[11px] text-emerald-400 font-medium font-mono">🏆 该节点当前为「落幕终章」（无选择分支，即为成功逃脱或冒险落败）</span>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                    {activeNode.choices.map((choice, i) => (
                      <div key={i} className="p-4 bg-zinc-950/80 rounded-xl border border-zinc-800 space-y-4 relative">
                        {/* Choice title row */}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-zinc-500 uppercase font-mono">分支选项 #{i + 1}</span>
                          <button 
                            id={`delete-choice-row-btn-${i}`}
                            onClick={() => handleDeleteChoice(i)}
                            className="p-1 hover:text-red-400 text-zinc-600 transition-colors cursor-pointer"
                            title="移除此选项分支"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Interactive text and destination dropdown links */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                          <div className="md:col-span-8">
                            <label className="text-[9px] font-semibold text-zinc-500 uppercase font-mono">按钮抉择文字 (Action option label)</label>
                            <input 
                              id={`edit-choice-text-${i}`}
                              type="text"
                              value={choice.text}
                              onChange={(e) => handleUpdateChoiceValue(i, "text", e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 focus:border-violet-500 text-zinc-100 text-xs rounded-lg p-2 mt-1"
                            />
                          </div>

                          <div className="md:col-span-4">
                            <label className="text-[9px] font-semibold text-zinc-500 uppercase font-mono">指向下一个节点 ID (Next node target)</label>
                            <select
                              id={`edit-choice-nextnode-${i}`}
                              value={choice.nextNodeId}
                              onChange={(e) => handleUpdateChoiceValue(i, "nextNodeId", e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 focus:border-violet-500 text-zinc-300 text-xs rounded-lg p-2 mt-1 font-mono"
                            >
                              {localStory.nodes.map(n => (
                                <option key={n.id} value={n.id}>{n.id}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Conditions and variables effects flags toggles */}
                        <div className="flex flex-wrap items-center gap-3 border-t border-zinc-900 pt-3">
                          
                          {/* Condition toggle button */}
                          <div className="flex items-center gap-2">
                            <button 
                              type="button"
                              id={`toggle-choice-condition-${i}`}
                              onClick={() => handleChoiceSetCondition(i, !choice.condition)}
                              className={`px-2 py-1 text-[10px] font-mono rounded leading-none border cursor-pointer ${
                                choice.condition 
                                  ? "bg-violet-500/10 text-violet-300 border-violet-500/30 font-bold" 
                                  : "bg-zinc-900 text-zinc-500 border-zinc-800/80"
                              }`}
                            >
                              {choice.condition ? "✓ 启用准入限制" : "+ 增设解锁条件"}
                            </button>
                            
                            {choice.condition && (
                              <div className="flex items-center gap-1 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
                                <select 
                                  id={`edit-choice-cond-name-${i}`}
                                  value={choice.condition.name}
                                  onChange={(e) => handleChoiceModifyCondition(i, "name", e.target.value)}
                                  className="bg-transparent text-[10px] text-zinc-300 font-mono border-none focus:ring-0 p-0"
                                >
                                  {localStory.variables.map(v => (
                                    <option key={v.name} value={v.name}>{v.name}</option>
                                  ))}
                                </select>

                                <select 
                                  id={`edit-choice-cond-comp-${i}`}
                                  value={choice.condition.comparator}
                                  onChange={(e) => handleChoiceModifyCondition(i, "comparator", e.target.value)}
                                  className="bg-transparent text-[10px] text-violet-400 font-mono border-none focus:ring-0 p-0 font-bold"
                                >
                                  <option value="eq">=</option>
                                  <option value="gte">≥</option>
                                  <option value="lte">≤</option>
                                </select>

                                <input 
                                  id={`edit-choice-cond-val-${i}`}
                                  type="text"
                                  value={choice.condition.value}
                                  onChange={(e) => handleChoiceModifyCondition(i, "value", e.target.value)}
                                  className="bg-transparent text-[10px] text-zinc-300 font-mono border-none focus:ring-0 p-0 w-12 text-center"
                                />
                              </div>
                            )}
                          </div>

                          {/* Effect toggle button */}
                          <div className="flex items-center gap-2">
                            <button 
                              type="button"
                              id={`toggle-choice-effect-${i}`}
                              onClick={() => handleChoiceSetEffect(i, !choice.variableEffect)}
                              className={`px-2 py-1 text-[10px] font-mono rounded leading-none border cursor-pointer ${
                                choice.variableEffect 
                                  ? "bg-amber-500/10 text-amber-300 border-amber-500/30 font-bold" 
                                  : "bg-zinc-900 text-zinc-500 border-zinc-800/80"
                              }`}
                            >
                              {choice.variableEffect ? "✓ 启用数值变动" : "+ 增设置变物效"}
                            </button>

                            {choice.variableEffect && (
                              <div className="flex items-center gap-1 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
                                <select 
                                  id={`edit-choice-eff-name-${i}`}
                                  value={choice.variableEffect.name}
                                  onChange={(e) => handleChoiceModifyEffect(i, "name", e.target.value)}
                                  className="bg-transparent text-[10px] text-zinc-300 font-mono border-none focus:ring-0 p-0"
                                >
                                  {localStory.variables.map(v => (
                                    <option key={v.name} value={v.name}>{v.name}</option>
                                  ))}
                                </select>

                                <select 
                                  id={`edit-choice-eff-op-${i}`}
                                  value={choice.variableEffect.operation}
                                  onChange={(e) => handleChoiceModifyEffect(i, "operation", e.target.value)}
                                  className="bg-transparent text-[10px] text-amber-400 font-mono border-none focus:ring-0 p-0 font-bold"
                                >
                                  <option value="set">重置为</option>
                                  <option value="add">累加值</option>
                                </select>

                                <input 
                                  id={`edit-choice-eff-val-${i}`}
                                  type="text"
                                  value={choice.variableEffect.value}
                                  onChange={(e) => handleChoiceModifyEffect(i, "value", e.target.value)}
                                  className="bg-transparent text-[10px] text-zinc-300 font-mono border-none focus:ring-0 p-0 w-12 text-center"
                                />
                              </div>
                            )}
                          </div>

                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Overall operations action sheet bar */}
            <div id="editor-actions-strip" className="bg-zinc-950 p-4 border border-zinc-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
              <div className="flex items-center gap-2">
                <button 
                  id="import-panel-trigger"
                  onClick={() => setShowImportPanel(!showImportPanel)}
                  className="px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg hover:text-white hover:bg-zinc-800 transition-colors text-xs font-mono font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-4.5 h-4.5" />
                  <span>导引入 JSON</span>
                </button>

                <button 
                  id="export-script-btn"
                  onClick={exportStoryAsJsonFile}
                  className="px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg hover:text-white hover:bg-zinc-800 transition-colors text-xs font-mono font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4.5 h-4.5" />
                  <span>导出保存脚本</span>
                </button>

                <button 
                  id="copy-clipboard-json-btn"
                  onClick={copyStoryToClipboard}
                  className="px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg hover:text-white hover:bg-zinc-800 transition-colors text-xs font-mono font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  {clipboardCopied ? <Check className="w-4 h-4 text-emerald-400 animate-pulse" /> : <Clipboard className="w-4 h-4" />}
                  <span>{clipboardCopied ? "复制精装" : "复制 JSON"}</span>
                </button>
              </div>

              <button 
                id="save-all-editor-changes-btn"
                onClick={saveAllEdits}
                className="w-full sm:w-auto px-5 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-xl font-medium text-xs text-white hover:scale-105 active:scale-95 transition-all text-center border border-violet-500/20 flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-violet-900/10"
              >
                {saveSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
                <span>{saveSuccess ? "全卷保存完毕" : "保存剧本变更"}</span>
              </button>
            </div>
          </div>
        ) : (
          <div id="no-active-node-spot" className="flex-1 flex flex-col items-center justify-center text-zinc-500 text-center p-8">
            <Info className="w-12 h-12 mb-3 text-zinc-700" />
            <p className="font-semibold text-zinc-300 text-sm">暂未选定要编辑的场景</p>
            <p className="text-xs text-zinc-500 mt-1">请在左侧目录点击或新增一个分支场景节点。</p>
          </div>
        )}
      </div>

      {/* Verification modal results overlay card */}
      <AnimatePresence>
        {validationReport && (
          <div id="verification-overlay" className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl max-w-lg w-full shadow-2xl relative"
            >
              <div className="flex items-center gap-2.5 mb-4 border-b border-zinc-800 pb-3">
                <Layers className="w-5 h-5 text-violet-400" />
                <h3 className="font-display font-medium text-base text-zinc-100">剧本树逻辑审查报告</h3>
              </div>

              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                {/* 1. Missing links (CRITICAL EXCEPTION) */}
                {validationReport.missingLinks.length > 0 && (
                  <div className="p-3.5 bg-red-950/40 border border-red-500/30 rounded-xl space-y-1.5">
                    <span className="text-[10px] uppercase font-mono font-bold text-red-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      逻辑断层或空头引用 ({validationReport.missingLinks.length})
                    </span>
                    <p className="text-[11px] text-zinc-400">以下选项卡指向的下一个路径 ID 目前并不在任何有效节点之中：</p>
                    <div className="space-y-1">
                      {validationReport.missingLinks.map((ml, idx) => (
                        <div key={idx} className="bg-zinc-950 text-red-300 p-1.5 rounded font-mono text-[10px] flex items-center gap-1.5 leading-none">
                          <span className="text-zinc-500">[{ml.node}]</span>
                          <span>"{ml.choiceText}"</span>
                          <span className="text-zinc-400">➔</span>
                          <span className="text-red-400 font-bold decoration-wavy underline">{ml.target} (不存在)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Unreachable nodes */}
                {validationReport.unreachable.length > 0 && (
                  <div className="p-3.5 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-1.5">
                    <span className="text-[10px] uppercase font-mono font-bold text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      不可触达的神秘节点 ({validationReport.unreachable.length})
                    </span>
                    <p className="text-[11px] text-zinc-400">由起点出发，未能有任何抉择连通及指向以下场景。它们如同迷航荒岛：</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {validationReport.unreachable.map(nodeId => (
                        <span key={nodeId} className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded font-mono text-[9px] text-amber-300">
                          {nodeId}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Dead end triggers (Normal check tags) */}
                {validationReport.deadEnds.length > 0 && (
                  <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1.5">
                    <span className="text-[10px] uppercase font-mono font-bold text-zinc-400 flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-zinc-500" />
                      落幕结局场景点统计 ({validationReport.deadEnds.length})
                    </span>
                    <p className="text-[11px] text-zinc-500">游戏在走到以下分支时，将无路可选（请确保此处代表死亡、平局或胜利大团圆结局）：</p>
                    <div className="flex flex-wrap gap-1.5">
                      {validationReport.deadEnds.map(nodeId => (
                        <span key={nodeId} className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800/80 rounded font-mono text-[9px] text-violet-300">
                          {nodeId}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Output pristine success if clear */}
                {validationReport.success && validationReport.unreachable.length === 0 && (
                  <div className="p-6 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl text-center space-y-2">
                    <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                    <h4 className="font-display font-semibold text-emerald-300 text-sm">剧本逻辑无缺！完美演剧</h4>
                    <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">
                      太棒了！所有选项均实现双向因果连通，无断崖或迷航，可随时进入演播页畅快试玩。
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-zinc-800/80 flex items-center justify-end">
                <button 
                  id="dismiss-verification-btn"
                  onClick={() => setValidationReport(null)}
                  className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs rounded-xl cursor-pointer"
                >
                  掌握并关闭审查
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Add Variable Modal dialog slider */}
      <AnimatePresence>
        {showVarModal && (
          <div id="var-modal-overlay" className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl max-w-sm w-full shadow-2xl relative"
            >
              <h3 className="font-display font-medium text-base text-zinc-100 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-violet-400" />
                声明新玩家初始变量
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-semibold text-zinc-400 font-mono uppercase">变量 Key (Snake Case)</label>
                  <input 
                    id="new-variable-name"
                    type="text"
                    value={newVarName}
                    onChange={(e) => setNewVarName(e.target.value)}
                    placeholder="例如: gold, has_key, reputation..."
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-violet-500 font-mono text-xs rounded-lg p-2.5 mt-1 text-zinc-200 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-zinc-400 font-mono uppercase">数据类型 Type</label>
                  <div className="flex gap-2 mt-1">
                    <button 
                      type="button"
                      id="var-type-num"
                      onClick={() => {
                        setNewVarType("number");
                        setNewVarVal("100");
                      }}
                      className={`flex-1 py-1.5 text-xs font-mono border rounded ${
                        newVarType === "number" 
                          ? "bg-violet-600/15 border-violet-500 text-violet-300" 
                          : "bg-zinc-950 border-zinc-800 text-zinc-400"
                      }`}
                    >
                      数值 (Number)
                    </button>
                    <button 
                      type="button"
                      id="var-type-bool"
                      onClick={() => {
                        setNewVarType("boolean");
                        setNewVarVal("false");
                      }}
                      className={`flex-1 py-1.5 text-xs font-mono border rounded ${
                        newVarType === "boolean" 
                          ? "bg-violet-600/15 border-violet-500 text-violet-300" 
                          : "bg-zinc-950 border-zinc-800 text-zinc-400"
                      }`}
                    >
                      布尔 / 状态 (Boolean)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-zinc-400 font-mono uppercase">初始默认值 Value</label>
                  {newVarType === "number" ? (
                    <input 
                      id="new-val-num"
                      type="number"
                      value={newVarVal}
                      onChange={(e) => setNewVarVal(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-violet-500 font-mono text-xs rounded-lg p-2.5 mt-1 text-zinc-200 focus:outline-hidden"
                    />
                  ) : (
                    <select
                      id="new-val-bool"
                      value={newVarVal}
                      onChange={(e) => setNewVarVal(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-violet-500 font-mono text-xs rounded-lg p-2.5 mt-1 text-zinc-300 focus:outline-hidden"
                    >
                      <option value="false">FALSE (否)</option>
                      <option value="true">TRUE (是)</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-6 border-t border-zinc-800/80 pt-4">
                <button 
                  id="cancel-add-var"
                  onClick={() => setShowVarModal(false)}
                  className="px-3.5 py-1.5 text-zinc-400 hover:text-zinc-200 text-xs"
                >
                  取消
                </button>
                <button 
                  id="submit-add-var"
                  onClick={handleAddNewVariable}
                  className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs rounded-xl cursor-pointer"
                >
                  添加变量声明
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* JSON script importer drawer panel */}
      <AnimatePresence>
        {showImportPanel && (
          <div id="import-modal-overlay" className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl max-w-lg w-full shadow-2xl relative"
            >
              <h3 className="font-display font-medium text-base text-zinc-100 flex items-center gap-2 border-b border-zinc-800 pb-3 mb-4">
                <Upload className="w-5 h-5 text-violet-400" />
                贴入要导入的文游 JSON
              </h3>

              <form onSubmit={handleImportJsonSubmit} className="space-y-4">
                <div>
                  <textarea 
                    id="import-json-textarea"
                    value={importJsonText}
                    onChange={(e) => setImportJsonText(e.target.value)}
                    placeholder='例如:
{
  "title": "自创神秘大楼",
  "author": "探秘者",
  "initialNodeId": "start",
  "variables": [],
  "nodes": [
    {
      "id": "start",
      "text": "你站在古老大门前...",
      "imagePrompt": "A wooden gate illustration",
      "choices": []
    }
  ]
}'
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-violet-500 focus:outline-hidden font-mono text-[11px] leading-relaxed p-4 h-64 rounded-2xl text-zinc-200 scrollbar-thin"
                    required
                  />
                </div>

                {importError && (
                  <p id="import-json-error" className="text-xs text-red-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>错误：{importError}</span>
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 border-t border-zinc-800/80 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowImportPanel(false)}
                    className="px-3.5 py-1.5 text-zinc-400 hover:text-zinc-200 text-xs cursor-pointer"
                  >
                    取消
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs rounded-xl cursor-pointer"
                  >
                    编译并导入库沙盒
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
