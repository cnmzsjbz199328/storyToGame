import type { Story } from "../types";

export function isValidStory(value: unknown): value is Story {
  if (!value || typeof value !== "object") return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.meta === "object" && s.meta !== null &&
    typeof s.startNodeId === "string" &&
    typeof s.nodes === "object" && s.nodes !== null
  );
}
