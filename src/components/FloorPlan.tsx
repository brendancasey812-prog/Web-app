"use client";

import { useMemo } from "react";
import {
  FOOTPRINT,
  HOUSE_DEPTH,
  HOUSE_WIDTH,
  MAIN_DEPTH,
  PALETTE,
  REAR_BUMP_WIDTH,
  ftIn,
  interiorWalls,
  roomArea,
  type Level,
  type Room,
} from "@/lib/houseplan";

/* The drawing sheet, in px. The plan is fitted into it, so these never change. */
const SHEET_W = 1000;
const SHEET_H = 820;
const SHEET_PAD = 18;

/** Margin of blank paper around whatever is being framed, in feet. */
const FRAME_MARGIN_FLOOR = 6.5;
const FRAME_MARGIN_ROOM = 5;

const WALL = "#e8ecf4";
const PAPER_LINE = "rgba(120, 190, 255, 0.16)";
const PAPER_LINE_MAJOR = "rgba(120, 190, 255, 0.32)";
const PAPER_LINE_FINE = "rgba(120, 190, 255, 0.07)";
const DIM = "#7dd3fc";

/* ---- A dimension string: slash ticks, witness lines, boxed label. ----- */
function Dim({
  from,
  to,
  at,
  axis,
  label,
  side = 1,
  X,
  Y,
}: {
  from: number;
  to: number;
  /** The other coordinate: the y of a horizontal string, the x of a vertical one. */
  at: number;
  axis: "h" | "v";
  label: string;
  /** Which way the short witness ticks point (1 or -1). */
  side?: number;
  X: (ft: number) => number;
  Y: (ft: number) => number;
}) {
  const t = 5; // tick length, px
  const a = axis === "h" ? { x: X(from), y: Y(at) } : { x: X(at), y: Y(from) };
  const b = axis === "h" ? { x: X(to), y: Y(at) } : { x: X(at), y: Y(to) };
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const boxW = label.length * 6.1 + 10;
  return (
    <g pointerEvents="none">
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={DIM} strokeWidth={1} />
      {[a, b].map((p, i) => (
        <g key={i}>
          <line
            x1={p.x - t}
            y1={p.y - t}
            x2={p.x + t}
            y2={p.y + t}
            stroke={DIM}
            strokeWidth={1.4}
          />
          <line
            x1={axis === "h" ? p.x : p.x - t * side}
            y1={axis === "h" ? p.y - t * side : p.y}
            x2={axis === "h" ? p.x : p.x + t * side * 1.6}
            y2={axis === "h" ? p.y + t * side * 1.6 : p.y}
            stroke={DIM}
            strokeWidth={0.9}
            opacity={0.6}
          />
        </g>
      ))}
      <rect
        x={mid.x - boxW / 2}
        y={mid.y - 8}
        width={boxW}
        height={16}
        rx={3}
        fill="#08090c"
        stroke={DIM}
        strokeOpacity={0.35}
      />
      <text
        x={mid.x}
        y={mid.y + 4}
        textAnchor="middle"
        fontSize={11}
        fill={DIM}
        fontWeight={600}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {label}
      </text>
    </g>
  );
}


/* ---- Room label block, sized down as the room gets small on screen. --- */
/* ---- Room label block, on a chip so it stays readable over furniture. --- */
function RoomLabel({
  r,
  dim,
  s,
  X,
  Y,
}: {
  r: Room;
  dim: boolean;
  s: number;
  X: (ft: number) => number;
  Y: (ft: number) => number;
}) {
  const cx = X(r.x + r.w / 2);
  const cy = Y(r.y + r.h / 2);
  const pw = r.w * s;
  const ph = r.h * s;
  if (pw < 42 || ph < 20) return null;
  const full = pw > 96 && ph > 52;
  const withArea = full && ph > 74;
  const accent = PALETTE[r.cat].accent;

  const dims = `${ftIn(r.w)} × ${ftIn(r.h)}`;
  const area = `${Math.round(roomArea(r))} sq ft`;
  const boxW =
    Math.max(
      r.name.length * (full ? 7.2 : 5.8),
      full ? dims.length * 6.3 : 0,
      withArea ? area.length * 5.6 : 0,
    ) + 16;
  const boxH = withArea ? 52 : full ? 38 : 18;

  return (
    <g pointerEvents="none" opacity={dim ? 0.35 : 1}>
      <rect
        x={cx - boxW / 2}
        y={cy - boxH / 2}
        width={boxW}
        height={boxH}
        rx={4}
        fill="#0a0d12"
        opacity={0.86}
      />
      <text
        x={cx}
        y={full ? cy - boxH / 2 + 16 : cy + 4}
        textAnchor="middle"
        fontSize={full ? 13 : 10}
        fontWeight={600}
        fill={accent}
      >
        {r.name}
      </text>
      {full && (
        <>
          <text
            x={cx}
            y={cy - boxH / 2 + 32}
            textAnchor="middle"
            fontSize={11.5}
            fill="#dfe4ec"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {dims}
          </text>
          {withArea && (
            <text x={cx} y={cy - boxH / 2 + 46} textAnchor="middle" fontSize={10} fill="#8b93a1">
              {area}
            </text>
          )}
        </>
      )}
    </g>
  );
}

export interface FloorPlanProps {
  level: Level;
  /** Room to frame and call out, or null for the whole floor. */
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Zoom the sheet onto the selected room instead of keeping the whole floor in view. */
  zoomToRoom: boolean;
  showGrid: boolean;
  showFixtures: boolean;
}

export function FloorPlan({
  level,
  selectedId,
  onSelect,
  zoomToRoom,
  showGrid,
  showFixtures,
}: FloorPlanProps) {
  const selected = level.rooms.find((r) => r.id === selectedId) ?? null;

  /* ---- Fit the framed area onto the sheet: feet → px. ------------------- */
  const { s, ox, oy } = useMemo(() => {
    const frame =
      selected && zoomToRoom
        ? {
            x: selected.x - FRAME_MARGIN_ROOM,
            y: selected.y - FRAME_MARGIN_ROOM,
            w: selected.w + FRAME_MARGIN_ROOM * 2,
            h: selected.h + FRAME_MARGIN_ROOM * 2,
          }
        : {
            x: -FRAME_MARGIN_FLOOR,
            y: -FRAME_MARGIN_FLOOR,
            w: HOUSE_WIDTH + FRAME_MARGIN_FLOOR * 2,
            h: HOUSE_DEPTH + FRAME_MARGIN_FLOOR * 2,
          };
    const scale = Math.min(
      (SHEET_W - SHEET_PAD * 2) / frame.w,
      (SHEET_H - SHEET_PAD * 2) / frame.h,
    );
    return {
      s: scale,
      ox: (SHEET_W - frame.w * scale) / 2 - frame.x * scale,
      oy: (SHEET_H - frame.h * scale) / 2 - frame.y * scale,
    };
  }, [selected, zoomToRoom]);

  const X = (ft: number) => ox + ft * s;
  const Y = (ft: number) => oy + ft * s;

  /* ---- Graph paper, drawn across the whole sheet. ----------------------- */
  const grid = useMemo(() => {
    if (!showGrid) return null;
    const fx0 = Math.floor((0 - ox) / s) - 1;
    const fx1 = Math.ceil((SHEET_W - ox) / s) + 1;
    const fy0 = Math.floor((0 - oy) / s) - 1;
    const fy1 = Math.ceil((SHEET_H - oy) / s) + 1;
    const fine = s >= 34 ? 0.5 : 0; // 6" subdivisions once we are zoomed in far enough
    const lines: React.ReactElement[] = [];
    const step = fine || 1;
    for (let f = fx0; f <= fx1; f += step) {
      const major = Math.abs(f % 5) < 1e-6;
      const whole = Math.abs(f % 1) < 1e-6;
      lines.push(
        <line
          key={`vx${f}`}
          x1={X(f)}
          y1={0}
          x2={X(f)}
          y2={SHEET_H}
          stroke={major ? PAPER_LINE_MAJOR : whole ? PAPER_LINE : PAPER_LINE_FINE}
          strokeWidth={major ? 1.1 : 0.7}
        />,
      );
    }
    for (let f = fy0; f <= fy1; f += step) {
      const major = Math.abs(f % 5) < 1e-6;
      const whole = Math.abs(f % 1) < 1e-6;
      lines.push(
        <line
          key={`hy${f}`}
          x1={0}
          y1={Y(f)}
          x2={SHEET_W}
          y2={Y(f)}
          stroke={major ? PAPER_LINE_MAJOR : whole ? PAPER_LINE : PAPER_LINE_FINE}
          strokeWidth={major ? 1.1 : 0.7}
        />,
      );
    }
    return lines;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showGrid, s, ox, oy]);

  const walls = useMemo(() => interiorWalls(level), [level]);
  const outline = FOOTPRINT.map(([fx, fy]) => `${X(fx)},${Y(fy)}`).join(" ");

  /** Round bar length (ft) that draws at roughly 70px on the current zoom. */
  const barFt = [1, 2, 5, 10, 20].find((f) => f * s >= 70) ?? 20;

  return (
    <svg
      viewBox={`0 0 ${SHEET_W} ${SHEET_H}`}
      className="block h-auto w-full select-none"
      role="img"
      aria-label={`${level.name} floor plan`}
    >
      {/* Sheet */}
      <rect x={0} y={0} width={SHEET_W} height={SHEET_H} fill="#0a0d12" />
      {grid}

      {/* Slab / footprint */}
      <polygon points={outline} fill="#0e1218" stroke="none" />

      {/* Rooms */}
      {level.rooms.map((r) => {
        const dim = !!selected && selected.id !== r.id;
        return (
          <g key={r.id} onClick={() => onSelect(r.id === selectedId ? null : r.id)}>
            <rect
              x={X(r.x)}
              y={Y(r.y)}
              width={r.w * s}
              height={r.h * s}
              fill={PALETTE[r.cat].fill}
              opacity={dim ? 0.4 : 1}
              className="cursor-pointer"
            />
            {selected?.id === r.id && (
              <rect
                x={X(r.x)}
                y={Y(r.y)}
                width={r.w * s}
                height={r.h * s}
                fill={PALETTE[r.cat].accent}
                opacity={0.09}
                pointerEvents="none"
              />
            )}
          </g>
        );
      })}

      {/* Fixtures */}
      {showFixtures &&
        level.rooms.map((r) => {
          const dim = !!selected && selected.id !== r.id;
          const accent = PALETTE[r.cat].accent;
          return (
            <g key={`fx-${r.id}`} opacity={dim ? 0.22 : 0.95} pointerEvents="none">
              {(r.fixtures ?? []).map((f, i) => {
                const pw = f.w * s;
                const ph = f.h * s;
                return (
                  <g key={i}>
                    <rect
                      x={X(f.x)}
                      y={Y(f.y)}
                      width={pw}
                      height={ph}
                      rx={f.kind === "soft" ? Math.min(4, pw / 6) : 1}
                      fill={accent}
                      fillOpacity={0.09}
                      stroke={accent}
                      strokeOpacity={0.55}
                      strokeWidth={1}
                      strokeDasharray={f.kind === "built" ? "3 2" : undefined}
                    />
                    {pw > f.label.length * 5.4 + 8 && ph > 14 && (
                      <text
                        x={X(f.x + f.w / 2)}
                        y={Y(f.y + f.h / 2) + 3.5}
                        textAnchor="middle"
                        fontSize={9.5}
                        fill={accent}
                        opacity={0.75}
                      >
                        {f.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}

      {/* Interior walls — solid where there is a wall, dashed at cased openings */}
      {walls.map((w, i) => (
        <line
          key={i}
          x1={X(w.ax)}
          y1={Y(w.ay)}
          x2={X(w.bx)}
          y2={Y(w.by)}
          stroke={w.open ? "rgba(232,236,244,0.3)" : WALL}
          strokeWidth={w.open ? 1.4 : 3}
          strokeDasharray={w.open ? "7 6" : undefined}
          strokeLinecap="square"
          pointerEvents="none"
        />
      ))}

      {/* Exterior wall */}
      <polygon
        points={outline}
        fill="none"
        stroke={WALL}
        strokeWidth={6}
        strokeLinejoin="miter"
        pointerEvents="none"
      />

      {/* Room labels */}
      {level.rooms.map((r) => (
        <RoomLabel key={`lb-${r.id}`} r={r} dim={!!selected && selected.id !== r.id} s={s} X={X} Y={Y} />
      ))}

      {/* Dimension strings */}
      {selected ? (
        <>
          <Dim
            axis="h"
            from={selected.x}
            to={selected.x + selected.w}
            at={selected.y - 2.2}
            label={ftIn(selected.w)}
            side={-1}
            X={X}
            Y={Y}
          />
          <Dim
            axis="v"
            from={selected.y}
            to={selected.y + selected.h}
            at={selected.x - 2.2}
            label={ftIn(selected.h)}
            side={-1}
            X={X}
            Y={Y}
          />
          <rect
            x={X(selected.x)}
            y={Y(selected.y)}
            width={selected.w * s}
            height={selected.h * s}
            fill="none"
            stroke={PALETTE[selected.cat].accent}
            strokeWidth={2.5}
            pointerEvents="none"
          />
        </>
      ) : (
        <>
          <Dim axis="h" from={0} to={HOUSE_WIDTH} at={-3.2} label={ftIn(HOUSE_WIDTH)} side={1} X={X} Y={Y} />
          <Dim axis="v" from={0} to={HOUSE_DEPTH} at={-3.2} label={ftIn(HOUSE_DEPTH)} side={1} X={X} Y={Y} />
          <Dim
            axis="v"
            from={0}
            to={MAIN_DEPTH}
            at={HOUSE_WIDTH + 3.2}
            label={ftIn(MAIN_DEPTH)}
            side={-1}
            X={X}
            Y={Y}
          />
          <Dim
            axis="h"
            from={0}
            to={REAR_BUMP_WIDTH}
            at={HOUSE_DEPTH + 3.2}
            label={ftIn(REAR_BUMP_WIDTH)}
            side={-1}
            X={X}
            Y={Y}
          />
        </>
      )}

      {/* Orientation + scale note */}
      <g pointerEvents="none">
        <text x={SHEET_W / 2} y={18} textAnchor="middle" fontSize={10.5} fill="#6b7480" letterSpacing={2}>
          FRONT OF HOUSE ▲
        </text>
        <text
          x={SHEET_W / 2}
          y={SHEET_H - 8}
          textAnchor="middle"
          fontSize={10.5}
          fill="#6b7480"
          letterSpacing={2}
        >
          ▼ REAR OF HOUSE
        </text>
        {/* Graphic scale bar — a round number of feet, roughly 90px long */}
        <g transform={`translate(${SHEET_W - 150}, ${SHEET_H - 26})`}>
          <rect x={0} y={-7} width={barFt * s} height={7} fill="none" stroke={DIM} strokeWidth={1} />
          <rect x={0} y={-7} width={(barFt * s) / 2} height={7} fill={DIM} fillOpacity={0.5} />
          <text x={barFt * s + 6} y={0} fontSize={10} fill={DIM}>
            {barFt}&apos;
          </text>
        </g>
      </g>
    </svg>
  );
}
