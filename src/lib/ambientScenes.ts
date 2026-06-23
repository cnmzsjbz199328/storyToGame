// ─── 场景配方（scene recipe）─────────────────────────────────────────────────
// 编排层：把若干 svg-ambient 元素 + 暗色 palette + 平铺方式组合成命名场景。
// 驱动源是剧本里作者显式设置的 meta/node 的 `ambient`/`theme` 字段（权威意图），
// 不扫散文关键词，避免抖动与意图冲突。
//
// 注意：ambient.mjs 的 palette 是「命名键」（如 cloud / drop / cloth），不是数字槽位。
// 各元素的默认键名见 ambient.mjs 里对应 def(...) 的 palette 默认值。

export interface AmbientLayer {
  element: string;                          // svg-ambient 元素名
  opacity?: number;                         // 该层不透明度（再叠加场景整体压暗）
  size?: string;                            // CSS background-size
  repeat?: "repeat" | "repeat-x" | "repeat-y" | "no-repeat";
  position?: string;                        // CSS background-position
  opts?: Record<string, unknown>;           // 透传给 make() 的参数（palette/speed/density/scale…）
}

export interface AmbientRecipe {
  id: string;
  layers: AmbientLayer[];
}

// 一小批命名场景（深色优先）。每个场景是配方，不是单张 SVG。
const SCENES: Record<string, AmbientRecipe> = {
  // 雨夜：暗云顶部漂移 + 高密度细雨满屏
  rain: {
    id: "rain",
    layers: [
      { element: "cloud", repeat: "repeat-x", position: "top", size: "360px 200px", opacity: 0.45,
        opts: { palette: { cloud: "#1e293b" }, speed: 0.5 } },
      { element: "rain", repeat: "repeat", size: "220px 220px", opacity: 0.6,
        opts: { density: 2, palette: { drop: "#64748b" } } },
    ],
  },
  // 海：暗云 + 底部横向波浪
  sea: {
    id: "sea",
    layers: [
      { element: "cloud", repeat: "repeat-x", position: "top", size: "360px 200px", opacity: 0.35,
        opts: { palette: { cloud: "#1e293b" }, speed: 0.4 } },
      { element: "wave", repeat: "repeat-x", position: "bottom", size: "auto 45%", opacity: 0.6,
        opts: { speed: 0.7 } },
    ],
  },
  // 风：风之轨迹 + 飘落叶
  wind: {
    id: "wind",
    layers: [
      { element: "wind", repeat: "repeat", size: "300px 300px", opacity: 0.5,
        opts: { palette: { trail: "#475569" }, speed: 1 } },
      { element: "leaf", repeat: "repeat", size: "280px 280px", opacity: 0.4,
        opts: { palette: { a: "#7c4a2d", b: "#6b2d2d", vein: "#000000" } } },
    ],
  },
  // 热/烈日：暗红日冕脉动 + 微风
  heat: {
    id: "heat",
    layers: [
      { element: "ray", repeat: "repeat", position: "center", size: "320px 320px", opacity: 0.4,
        opts: { palette: { orb: "#7c2d12", ray: "#b45309" }, speed: 0.6 } },
      { element: "wind", repeat: "repeat", size: "300px 300px", opacity: 0.22,
        opts: { palette: { trail: "#92400e" }, speed: 0.4 } },
    ],
  },
  // 静电/噪点：灰色雪点漂浮，模拟噪声
  static: {
    id: "static",
    layers: [
      { element: "snow", repeat: "repeat", size: "160px 160px", opacity: 0.5,
        opts: { density: 2, palette: { flake: "#475569" }, speed: 1.4 } },
    ],
  },
  // 血色：暗红血雨 + 深红低云
  blood: {
    id: "blood",
    layers: [
      { element: "cloud", repeat: "repeat-x", position: "top", size: "360px 200px", opacity: 0.4,
        opts: { palette: { cloud: "#450a0a" }, speed: 0.4 } },
      { element: "rain", repeat: "repeat", size: "240px 240px", opacity: 0.55,
        opts: { density: 1.5, palette: { drop: "#7f1d1d" }, speed: 0.8 } },
    ],
  },
  // 夜：星光闪烁 + 极暗云
  night: {
    id: "night",
    layers: [
      { element: "star", repeat: "repeat", size: "300px 300px", opacity: 0.5,
        opts: { palette: { a: "#e2e8f0", b: "#fde68a" } } },
      { element: "cloud", repeat: "repeat-x", position: "top", size: "400px 220px", opacity: 0.3,
        opts: { palette: { cloud: "#0f172a" }, speed: 0.3 } },
    ],
  },
};

// ambient 字段（主驱动）→ 场景 ID。none/silence 显式无场景。
const AMBIENT_ALIAS: Record<string, string | null> = {
  rain: "rain",
  sea: "sea",
  tide: "sea",
  wind: "wind",
  heat: "heat",
  static: "static",
  blood: "blood",
  night: "night",
  silence: null,
  none: null,
};

// theme 字段（兜底驱动）→ 场景 ID。仅在 ambient 无匹配时使用。
const THEME_ALIAS: Record<string, string> = {
  tide: "sea",
  blood: "blood",
  night: "night",
  summer: "heat",
};

/** 按作者意图解析场景：先看 ambient，再用 theme 兜底；都没有则返回 null（不渲染）。*/
export function resolveScene(ambient?: string, theme?: string): AmbientRecipe | null {
  if (ambient && ambient in AMBIENT_ALIAS) {
    const id = AMBIENT_ALIAS[ambient];
    return id ? SCENES[id] : null;
  }
  if (theme && theme in THEME_ALIAS) {
    return SCENES[THEME_ALIAS[theme]] ?? null;
  }
  return null;
}
