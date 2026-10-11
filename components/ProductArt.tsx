import { useId } from "react";
import { hexOf, isLight } from "@/lib/colors";
import type { ArtKind } from "@/lib/types";

type Props = { kind: ArtKind; color: string; className?: string; title?: string };

/** Векторная иллюстрация товара в цвете ткани. Показывается, пока для товара нет фото (npm run images) */
export function ProductArt({ kind, color, className, title }: Props) {
  const id = useId().replace(/:/g, "");
  const fill = hexOf(color);
  const line = isLight(color) ? "rgba(22,27,21,.28)" : "rgba(255,255,255,.22)";
  const shade = isLight(color) ? "rgba(22,27,21,.16)" : "rgba(0,0,0,.28)";

  return (
    <svg viewBox="0 0 300 400" className={className} role="img" aria-label={title ?? "Иллюстрация товара"}>
      <defs>
        <pattern id={`weave-${id}`} width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M0 3h6M3 0v6" stroke={line} strokeWidth="0.6" opacity="0.5" />
        </pattern>
        <pattern id={`mesh-${id}`} width="7" height="7" patternUnits="userSpaceOnUse">
          <path d="M0 0h7v7" fill="none" stroke="rgba(30,35,30,.45)" strokeWidth="0.9" />
        </pattern>
        <linearGradient id={`glass-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="0.5" stopColor="#dfe9ee" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.75" />
        </linearGradient>
        <linearGradient id={`tint-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3d4448" stopOpacity="0.75" />
          <stop offset="1" stopColor="#20262a" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id={`fold-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.22" />
          <stop offset="0.35" stopColor="#fff" stopOpacity="0.1" />
          <stop offset="0.7" stopColor="#000" stopOpacity="0.12" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.08" />
        </linearGradient>
      </defs>

      {kind === "tarp" && <Tarp id={id} fill={fill} shade={shade} line={line} />}
      {(kind === "curtain" || kind === "curtain-window") && (
        <Curtain id={id} fill={fill} shade={shade} withWindow={kind === "curtain-window"} />
      )}
      {(kind === "window" || kind === "window-tint" || kind === "net") && (
        <Window id={id} fill={fill} line={line} inner={kind === "net" ? "mesh" : kind === "window-tint" ? "tint" : "glass"} />
      )}
      {kind === "roll" && <Roll id={id} fill={fill} shade={shade} line={line} />}
    </svg>
  );
}

function Grommets({ points }: { points: [number, number][] }) {
  return (
    <g>
      {points.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="5.2" fill="#c9ccc4" stroke="#7d8278" strokeWidth="1.2" />
          <circle cx={x} cy={y} r="2.2" fill="#2b2f2a" />
        </g>
      ))}
    </g>
  );
}

const along = (a: [number, number], b: [number, number], n: number) =>
  Array.from({ length: n }, (_, i) => {
    const t = (i + 0.5) / n;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] as [number, number];
  });

function Tarp({ id, fill, shade, line }: { id: string; fill: string; shade: string; line: string }) {
  return (
    <g>
      <ellipse cx="150" cy="352" rx="118" ry="12" fill="rgba(0,0,0,.12)" />
      <path d="M38 96 L262 78 Q270 200 276 318 L196 330 L32 326 Q34 210 38 96Z" fill={fill} />
      <path d="M38 96 L262 78 Q270 200 276 318 L196 330 L32 326 Q34 210 38 96Z" fill={`url(#weave-${id})`} />
      <path d="M90 92 Q96 210 84 326" stroke={shade} strokeWidth="14" fill="none" opacity=".6" />
      <path d="M180 85 Q188 200 176 329" stroke={shade} strokeWidth="10" fill="none" opacity=".45" />
      {/* загнутый угол */}
      <path d="M276 318 L196 330 L236 262Z" fill={shade} />
      <path d="M276 318 L236 262 L262 250Z" fill={fill} opacity=".85" />
      {/* двойной подгиб по краю */}
      <path d="M44 106 L256 89" stroke={line} strokeWidth="1.4" strokeDasharray="5 4" />
      <path d="M41 316 L190 320" stroke={line} strokeWidth="1.4" strokeDasharray="5 4" />
      <Grommets points={along([38, 96], [262, 78], 5)} />
      <Grommets points={along([32, 326], [196, 330], 4)} />
      {/* шнур */}
      <path d="M52 94 Q30 60 12 70" stroke="#e9d9a6" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </g>
  );
}

function Curtain({ id, fill, shade, withWindow }: { id: string; fill: string; shade: string; withWindow: boolean }) {
  return (
    <g>
      {/* каркас беседки */}
      <rect x="20" y="44" width="260" height="14" rx="3" fill="#6b5340" />
      <rect x="20" y="58" width="12" height="320" fill="#7a5f49" />
      <rect x="268" y="58" width="12" height="320" fill="#7a5f49" />
      <path d="M10 44 L150 6 L290 44Z" fill="#5a4535" />
      {/* полотно */}
      <path d="M34 62 H266 V352 Q150 360 34 352Z" fill={fill} />
      <path d="M34 62 H266 V352 Q150 360 34 352Z" fill={`url(#fold-${id})`} />
      <path d="M34 62 H266 V352 Q150 360 34 352Z" fill={`url(#weave-${id})`} />
      {[80, 130, 175, 222].map((x) => (
        <path key={x} d={`M${x} 64 Q${x + 6} 200 ${x - 3} 352`} stroke={shade} strokeWidth="5" fill="none" opacity=".55" />
      ))}
      {withWindow && (
        <g>
          <rect x="62" y="116" width="176" height="150" rx="6" fill={`url(#glass-${id})`} stroke="rgba(0,0,0,.18)" />
          <path d="M84 250 L150 128 M120 256 L196 122" stroke="#fff" strokeWidth="5" opacity=".6" />
        </g>
      )}
      {/* скобы */}
      {[52, 248].map((x) => (
        <g key={x}>
          <rect x={x - 7} y="330" width="14" height="22" rx="3" fill="#b9bdb3" stroke="#6f746b" />
        </g>
      ))}
      <Grommets points={along([34, 72], [266, 72], 6)} />
    </g>
  );
}

function Window({ id, fill, line, inner }: { id: string; fill: string; line: string; inner: "glass" | "tint" | "mesh" }) {
  return (
    <g>
      <ellipse cx="150" cy="364" rx="112" ry="10" fill="rgba(0,0,0,.1)" />
      <rect x="34" y="46" width="232" height="306" rx="8" fill={fill} />
      <rect x="34" y="46" width="232" height="306" rx="8" fill={`url(#weave-${id})`} />
      <rect x="40" y="52" width="220" height="294" rx="6" fill="none" stroke={line} strokeWidth="1.4" strokeDasharray="5 4" />
      <rect x="62" y="74" width="176" height="250" rx="3" fill={inner === "mesh" ? "#e9ece6" : `url(#${inner}-${id})`} />
      {inner === "mesh" && <rect x="62" y="74" width="176" height="250" fill={`url(#mesh-${id})`} />}
      {inner !== "mesh" && (
        <path d="M84 300 L170 90 M126 312 L222 110" stroke="#fff" strokeWidth="6" opacity={inner === "tint" ? 0.18 : 0.55} />
      )}
      <Grommets points={[...along([34, 61], [266, 61], 5), ...along([34, 337], [266, 337], 5)]} />
    </g>
  );
}

function Roll({ id, fill, shade, line }: { id: string; fill: string; shade: string; line: string }) {
  return (
    <g>
      <ellipse cx="150" cy="370" rx="120" ry="10" fill="rgba(0,0,0,.12)" />
      {/* размотанное полотно */}
      <path d="M70 168 L250 120 L270 352 L84 362Z" fill={fill} />
      <path d="M70 168 L250 120 L270 352 L84 362Z" fill={`url(#weave-${id})`} />
      <path d="M70 168 L250 120 L270 352 L84 362Z" fill={shade} opacity=".35" />
      <path d="M150 150 L176 356" stroke={line} strokeWidth="1.2" strokeDasharray="6 5" />
      {/* рулон */}
      <path d="M40 120 L232 68 L262 176 L70 228Z" fill={fill} />
      <path d="M40 120 L232 68 L262 176 L70 228Z" fill={`url(#fold-${id})`} />
      <ellipse cx="55" cy="174" rx="27" ry="55" transform="rotate(-15 55 174)" fill={fill} stroke={shade} strokeWidth="3" />
      {[20, 13, 7].map((r) => (
        <ellipse key={r} cx="55" cy="174" rx={r / 2} ry={r} transform="rotate(-15 55 174)" fill="none" stroke={shade} strokeWidth="2.4" />
      ))}
      <ellipse cx="55" cy="174" rx="3" ry="6" transform="rotate(-15 55 174)" fill="#3a3a34" />
    </g>
  );
}
