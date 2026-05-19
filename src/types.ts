// ─── Segment（正文段落） ────────────────────────────────────────────────────
export interface Segment {
  text: string;
  speaker?: string;         // 角色名；"系统"/"旁白"/"Narrator" 显示为旁白样式
  effect?: string;          // shake / blur / noise / flash / blackout / silence / pulse / breath / glitch / drown / heat / cold / blood
  effects?: string[];
}

// ─── 场景 ─────────────────────────────────────────────────────────────────
export interface Scene {
  id?: string;
  name: string;
  type?: "major" | "transient";
  description?: string;
  arrival?: string;
  duration?: number;
}

// ─── 条件（字符串或对象格式） ───────────────────────────────────────────────
export type ConditionString = string; // "val >= 60" | "hasFlag 'x'" | "!hasFlag 'x'" | "default"

export interface ConditionAll { all: ConditionExpr[]; }
export interface ConditionAny { any: ConditionExpr[]; }
export interface ConditionNot { not: ConditionExpr; }
export interface ConditionVar { var: string; op: string; value: number | string; }
export interface ConditionFlag { flag: string; }

export type ConditionExpr =
  | ConditionString
  | ConditionAll
  | ConditionAny
  | ConditionNot
  | ConditionVar
  | ConditionFlag;

// ─── 选项变更（changes） ────────────────────────────────────────────────────
export interface Changes {
  val?: number;                      // val += n
  valSet?: number;                   // val = n
  set?: Record<string, unknown>;     // 自定义变量赋值
  addFlag?: string;
  addFlags?: string[];
  removeFlag?: string;
  importantFlag?: string | { flag: string; label: string };
  importantFlags?: string[];
  unlockAchievement?: string;
  unlockAchievements?: string[];
}

// ─── 路由（自动分流） ──────────────────────────────────────────────────────
export interface Route {
  condition: ConditionString;
  next: string;
}

// ─── 选项 ──────────────────────────────────────────────────────────────────
export interface Choice {
  text: string;
  next: string;
  condition?: ConditionString;
  effect?: string;
  changes?: Changes;
}

// ─── 故事节点 ──────────────────────────────────────────────────────────────
export interface StoryNode {
  chapterTitle?: string;    // 仅章节首个节点设置，触发章节动画
  title?: string;           // 场景标题
  scene?: Scene | string;   // 简写形式：字符串场景名
  progress?: number;        // 0-100，单调递增
  theme?: string;           // 覆盖全局 theme
  ambient?: string;         // 覆盖全局 ambient
  segments: Segment[];
  choices?: Choice[];
  next?: string;            // 无选项时自动跳转
  routes?: Route[];         // 条件自动路由（优先级高于 choices）
  isEnding?: boolean;
  title_end?: string;       // 结局标题（当 isEnding=true）
  type?: string;            // 结局类型（TRUE ENDING / BRANCH ENDING 等）
  description?: string;     // 结局正文
  closing?: string;         // 结局收束语
  achievement?: string;     // 结局解锁的成就
  effect?: string;
  effects?: string[];
}

// ─── 成就 ──────────────────────────────────────────────────────────────────
export interface Achievement {
  title: string;
  description: string;
}

// ─── meta ──────────────────────────────────────────────────────────────────
export interface Meta {
  title: string;
  author: string;
  version?: string;
  description?: string;
  theme?: string;
  ambient?: string;
  cover?: { label?: string; tagline?: string };
  variableName?: string;    // 主状态值的显示名称（如"缝线"、"灼见"）
  initialVariable?: number; // val 初始值（默认 50）
}

// ─── 完整剧本 ──────────────────────────────────────────────────────────────
export interface Story {
  meta: Meta;
  startNodeId: string;
  variables?: Record<string, unknown>;   // 自定义变量初始值
  achievements?: Record<string, Achievement>;
  nodes: Record<string, StoryNode>;      // 以节点 ID 为 key 的对象
}

// ─── 运行时游戏状态 ─────────────────────────────────────────────────────────
export interface GameState {
  currentNodeId: string;
  val: number;                           // 主状态值 0-100
  variables: Record<string, unknown>;    // 自定义变量
  flags: Set<string>;                    // 一次性事件标记
  unlockedAchievements: string[];
  history: HistorySnapshot[];
  importantFlags: Array<{ flag: string; label?: string }>;
}

export interface HistorySnapshot {
  nodeId: string;
  val: number;
  variables: Record<string, unknown>;
  flags: string[];
}
