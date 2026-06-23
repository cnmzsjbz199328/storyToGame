import { useEffect, useMemo, useState } from "react";
// ambient.mjs 是零依赖纯 JS 库（唯一真源）；allowJs 下 TS 可直接推断其导出
import { make } from "../lib/ambient.mjs";
import { resolveScene, type AmbientLayer } from "../lib/ambientScenes";

// 单帧 SVG 字符串 → data URI（# 会被 encodeURIComponent 转义为 %23）
function svgToDataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

interface BuiltLayer extends AmbientLayer {
  frames: string[]; // 预生成的逐帧 data URI
}

interface AmbientSceneProps {
  ambient?: string;
  theme?: string;
}

const FPS = 8; // svg-ambient 默认帧率；帧已预生成，播放只是切换显示哪一帧

/**
 * 深色动态 SVG 背景层：按节点的 ambient/theme 解析场景配方，分层平铺播放。
 * 帧一次性预生成、按 fps 切换，开销极低；尊重 prefers-reduced-motion；纯装饰、不拦截事件。
 */
export default function AmbientScene({ ambient, theme }: AmbientSceneProps) {
  const scene = useMemo(() => resolveScene(ambient, theme), [ambient, theme]);

  // 每个场景只生成一次帧（memo 在 scene 上）
  const layers = useMemo<BuiltLayer[]>(() => {
    if (!scene) return [];
    return scene.layers.map((L) => {
      const raw = make(L.element, L.opts ?? {}) as string[];
      return { ...L, frames: raw.map(svgToDataUri) };
    });
  }, [scene]);

  const reduced = useMemo(
    () =>
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    []
  );

  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (reduced || layers.length === 0) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000 / FPS);
    return () => window.clearInterval(id);
  }, [reduced, layers.length]);

  if (!scene || layers.length === 0) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none overflow-hidden"
      style={{ opacity: 0.16 }}
      aria-hidden="true"
    >
      {layers.map((L, i) => {
        const frameIdx = (reduced ? 0 : tick) % L.frames.length;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: i,
              opacity: L.opacity ?? 1,
              backgroundImage: `url("${L.frames[frameIdx]}")`,
              backgroundRepeat: L.repeat ?? "repeat",
              backgroundSize: L.size ?? "256px 256px",
              backgroundPosition: L.position ?? "center",
            }}
          />
        );
      })}
    </div>
  );
}
