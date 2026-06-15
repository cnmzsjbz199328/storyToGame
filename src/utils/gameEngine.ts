import { Story, GameState, Changes, HistorySnapshot } from "../types";

export function evalCondition(cond: string | undefined, state: GameState): boolean {
  try {
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
      // Quoted string value: compare as string
      const quotedStr = rawVal.match(/^'([^']*)'$/);
      if (quotedStr) {
        const lhs = String(state.variables[varName] ?? "");
        return op === "==" ? lhs === quotedStr[1] : lhs !== quotedStr[1];
      }
      // Numeric comparison
      const lhs = varName === "val" ? state.val : Number(state.variables[varName] ?? 0);
      const rhs = Number(rawVal);
      switch (op) {
        case ">=": return lhs >= rhs;
        case "<=": return lhs <= rhs;
        case ">":  return lhs > rhs;
        case "<":  return lhs < rhs;
        case "==": return lhs === rhs;
        case "!=": return lhs !== rhs;
      }
    }

    return true;
  } catch {
    console.warn("[gameEngine] evalCondition failed for:", cond);
    return true; // fail-open: show the choice rather than hiding it
  }
}

export function applyChanges(state: GameState, changes: Changes | undefined): Partial<GameState> {
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

export function initState(story: Story): GameState {
  return {
    currentNodeId: story.startNodeId,
    val: story.meta.initialVariable ?? 50,
    variables: { ...(story.variables ?? {}) },
    flags: new Set(),
    unlockedAchievements: [],
    history: [] as HistorySnapshot[],
    importantFlags: [],
  };
}
