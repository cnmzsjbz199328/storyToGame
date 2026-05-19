export interface Variable {
  name: string;
  type: "number" | "boolean";
  value: string; // Stored as string for uniform AI handling, easily parsed
}

export interface Condition {
  name: string;
  comparator: "eq" | "gte" | "lte";
  value: string;
}

export interface VariableEffect {
  name: string;
  operation: "set" | "add";
  value: string;
}

export interface Choice {
  text: string;
  nextNodeId: string;
  condition?: Condition;
  variableEffect?: VariableEffect;
}

export interface StoryNode {
  id: string;
  text: string;
  imagePrompt: string;
  choices: Choice[];
  imageUrl?: string; // Cache generated images dynamically
}

export interface Story {
  id?: string;
  title: string;
  description: string;
  author: string;
  initialNodeId: string;
  variables: Variable[];
  nodes: StoryNode[];
}

export interface GameState {
  currentNodeId: string;
  variables: Record<string, number | boolean>;
  history: string[]; // History of visited nodes (for back-tracking)
  logs: string[];    // Narrative logs/history of texts
}
