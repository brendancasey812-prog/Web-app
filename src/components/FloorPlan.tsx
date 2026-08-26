"use client";

import { useMemo } from "react";
import {
  MAIN_DEPTH,
  PALETTE,
  REAR_BUMP_WIDTH,
  footprintBounds,
  ftIn,
  interiorWalls,
  levelBounds,
  roomArea,
  type Door,
  type Level,
  type Room,
} from "@/lib/houseplan";

/* The drawing sheet, in px. The plan is fitted into it, so these never change. */
const SHEET_W = 1000;
const SHEET_PAD = 18;
/** Sheet height follows the plan's own proportions, within sane bounds. */
const sheetHeight = (frameW: number, frameH: number) =>
  Math.round(Math.min(1500, Math.max(760, (SHEET_W * frameH) / frameW)));

/** Margin of blank paper around whatever is being framed, in feet. */
const FRAME_MARGIN_FLOOR = 6.5;
const FRAME_MARGIN_ROOM = 5;

/* Black line on white paper, the way the drawing would come off a plotter. */
const PAPER = "#ffffff";
const INK = "#0b0b0c";
const INK_SOFT = "#3f4753";
const INK_FAINT = "#7b8595";
const PAPER_LINE = "#dbe3ee";
const PAPER_LINE_MAJOR = "#b6c4d6";
const PAPER_LINE_FINE = "#eef2f7";
const WALL = INK;
const DIM = INK;

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
        fill={PAPER}
        stroke={DIM}
        strokeOpacity={0.55}
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

/* ---- Room label block, on a chip so it stays readable over furniture. ----
 * Rooms are labelled the way a draughtsman would: horizontally where the name
 * fits, turned on its side in a tall narrow room, and dropped to just the name
 * (or nothing at all) when even that will not fit between the walls.
 */
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
  /* Turn the label 90 degrees in a genuinely narrow room, so `across` is always
     the direction the text runs and `down` the direction the lines stack. */
  const rotate = r.h > r.w * 2;
  const across = (rotate ? r.h : r.w) * s;
  const down = (rotate ? r.w : r.h) * s;
  if (across < 46 || down < 18) return null;

  const dims = `${ftIn(r.w)} × ${ftIn(r.h)}`;
  const area = `${Math.round(roomArea(r))} sq ft`;
  const widthOf = (full: boolean, withArea: boolean) =>
    Math.max(
      r.name.length * (full ? 7.2 : 5.8),
      full ? dims.length * 6.3 : 0,
      full && withArea ? area.length * 5.6 : 0,
    ) + 16;

  /* Step down through the variants until one fits between the walls. */
  let full = across > 96 && down > 52;
  let withArea = full && down > 74;
  if (full && widthOf(full, withArea) > across - 6) withArea = false;
  if (full && widthOf(full, withArea) > across - 6) full = false;
  const boxW = widthOf(full, withArea);
  if (boxW > across - 4) return null;
  const boxH = withArea ? 52 : full ? 38 : 18;
  if (boxH > down - 4) return null;

  return (
    <g
      pointerEvents="none"
      opacity={dim ? 0.4 : 1}
      transform={rotate ? `rotate(-90 ${cx} ${cy})` : undefined}
    >
      <rect
        x={cx - boxW / 2}
        y={cy - boxH / 2}
        width={boxW}
        height={boxH}
        rx={3}
        fill={PAPER}
        opacity={0.88}
      />
      <text
        x={cx}
        y={full ? cy - boxH / 2 + 16 : cy + 4}
        textAnchor="middle"
        fontSize={full ? 13 : 10}
        fontWeight={700}
        fill={INK}
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
            fill={INK_SOFT}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {dims}
          </text>
          {withArea && (
            <text x={cx} y={cy - boxH / 2 + 46} textAnchor="middle" fontSize={10} fill={INK_FAINT}>
              {area}
            </text>
          )}
        </>
      )}
    </g>
  );
}

/**
 * A door drawn the way a plan draws one: the wall is erased across the
 * opening, jambs are ticked, and the leaf sweeps a quarter-circle arc.
 * A cased opening gets the gap and jambs but no leaf; a slider gets two
 * offset panels instead of a swing.
 */
function DoorMark({
  d,
  s,
  X,
  Y,
}: {
  d: Door;
  s: number;
  X: (ft: number) => number;
  Y: (ft: number) => number;
}) {
  const hx = X(d.x), hy = Y(d.y);
  const along = d.axis === "h" ? { x: d.hand, y: 0 } : { x: 0, y: d.hand };
  const perp = d.axis === "h" ? { x: 0, y: d.swing } : { x: d.swing, y: 0 };
  const r = d.w * s;
  const ax = hx + along.x * r, ay = hy + along.y * r; // far jamb
  const bx = hx + perp.x * r, by = hy + perp.y * r; // leaf tip, swung open

  /* Which way round the arc runs, from the far jamb to the open leaf. */
  const cross = (ax - hx) * (by - hy) - (ay - hy) * (bx - hx);
  const sweep = cross > 0 ? 1 : 0;

  const t = 3.4; // jamb tick half-length, px
  return (
    <g pointerEvents="none">
      {/* Erase the wall across the opening */}
      <line x1={hx} y1={hy} x2={ax} y2={ay} stroke={PAPER} strokeWidth={7} strokeLinecap="butt" />
      {d.axis === "h" ? (
        <>
          <line x1={hx} y1={hy - t} x2={hx} y2={hy + t} stroke={INK} strokeWidth={1.6} />
          <line x1={ax} y1={ay - t} x2={ax} y2={ay + t} stroke={INK} strokeWidth={1.6} />
        </>
      ) : (
        <>
          <line x1={hx - t} y1={hy} x2={hx + t} y2={hy} stroke={INK} strokeWidth={1.6} />
          <line x1={ax - t} y1={ay} x2={ax + t} y2={ay} stroke={INK} strokeWidth={1.6} />
        </>
      )}

      {d.kind === "slider" ? (
        <>
          <line
            x1={hx + perp.x * 3} y1={hy + perp.y * 3}
            x2={hx + along.x * r * 0.55 + perp.x * 3} y2={hy + along.y * r * 0.55 + perp.y * 3}
            stroke={INK} strokeWidth={2.2}
          />
          <line
            x1={hx + along.x * r * 0.45 - perp.x * 3} y1={hy + along.y * r * 0.45 - perp.y * 3}
            x2={ax - perp.x * 3} y2={ay - perp.y * 3}
            stroke={INK} strokeWidth={2.2}
          />
        </>
      ) : d.kind === "opening" ? null : (
        <>
          <line x1={hx} y1={hy} x2={bx} y2={by} stroke={INK} strokeWidth={1.6} />
          <path
            d={`M ${ax} ${ay} A ${r} ${r} 0 0 ${sweep} ${bx} ${by}`}
            fill="none"
            stroke={INK}
            strokeWidth={0.9}
            opacity={0.75}
          />
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
  showDoors: boolean;
  /** Wash each room in its category tint. Off = a plain black-line-on-white drawing. */
  colorRooms: boolean;
}

export function FloorPlan({
  level,
  selectedId,
  onSelect,
  zoomToRoom,
  showGrid,
  showFixtures,
  showDoors,
  colorRooms,
}: FloorPlanProps) {
  const selected = level.rooms.find((r) => r.id === selectedId) ?? null;
  /** A slab outside the wall line gets dimensioned in place of the rear bump-out. */
  const foot0 = footprintBounds(level);
  /** A slab beyond the wall line gets dimensioned in place of the rear block. */
  const pad =
    level.rooms.find((r) => r.exterior && r.y + r.h > foot0.y + foot0.h + 1e-6) ?? null;

  /* ---- Fit the framed area onto the sheet: feet → px. ------------------- */
  const { s, ox, oy, sheetH } = useMemo(() => {
    const frame =
      selected && zoomToRoom
        ? {
            x: selected.x - FRAME_MARGIN_ROOM,
            y: selected.y - FRAME_MARGIN_ROOM,
            w: selected.w + FRAME_MARGIN_ROOM * 2,
            h: selected.h + FRAME_MARGIN_ROOM * 2,
          }
        : (() => {
            const b = levelBounds(level);
            return {
              x: b.x - FRAME_MARGIN_FLOOR,
              y: b.y - FRAME_MARGIN_FLOOR,
              w: b.w + FRAME_MARGIN_FLOOR * 2,
              h: b.h + FRAME_MARGIN_FLOOR * 2,
            };
          })();
    const h = sheetHeight(frame.w, frame.h);
    const scale = Math.min(
      (SHEET_W - SHEET_PAD * 2) / frame.w,
      (h - SHEET_PAD * 2) / frame.h,
    );
    return {
      s: scale,
      ox: (SHEET_W - frame.w * scale) / 2 - frame.x * scale,
      oy: (h - frame.h * scale) / 2 - frame.y * scale,
      sheetH: h,
    };
  }, [selected, zoomToRoom, level]);

  const X = (ft: number) => ox + ft * s;
  const Y = (ft: number) => oy + ft * s;

  /* ---- Graph paper, drawn across the whole sheet. ----------------------- */
  const grid = useMemo(() => {
    if (!showGrid) return null;
    const fx0 = Math.floor((0 - ox) / s) - 1;
    const fx1 = Math.ceil((SHEET_W - ox) / s) + 1;
    const fy0 = Math.floor((0 - oy) / s) - 1;
    const fy1 = Math.ceil((sheetH - oy) / s) + 1;
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
          y2={sheetH}
          stroke={major ? PAPER_LINE_MAJOR : whole ? PAPER_LINE : PAPER_LINE_FINE}
          strokeWidth={major ? 1 : 0.6}
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
          strokeWidth={major ? 1 : 0.6}
        />,
      );
    }
    return lines;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showGrid, s, ox, oy, sheetH]);

  const walls = useMemo(() => interiorWalls(level), [level]);
  const outline = level.footprint.map(([fx, fy]) => `${X(fx)},${Y(fy)}`).join(" ");
  const foot = foot0;

  /** Round bar length (ft) that draws at roughly 70px on the current zoom. */
  const barFt = [1, 2, 5, 10, 20].find((f) => f * s >= 70) ?? 20;

  return (
    <svg
      viewBox={`0 0 ${SHEET_W} ${sheetH}`}
      className="block h-auto w-full select-none"
      role="img"
      aria-label={`${level.name} floor plan`}
    >
      {/* Sheet */}
      <rect x={0} y={0} width={SHEET_W} height={sheetH} fill={PAPER} />
      {grid}

      {/* No slab fill — the graph paper reads straight through the house. */}

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
              fill={colorRooms ? PALETTE[r.cat].fill : "transparent"}
              fillOpacity={colorRooms ? 0.85 : 1}
              opacity={dim ? 0.45 : 1}
              className="cursor-pointer"
              stroke={r.exterior ? INK_FAINT : undefined}
              strokeWidth={r.exterior ? 1.4 : undefined}
              strokeDasharray={r.exterior ? "6 4" : undefined}
            />
            {selected?.id === r.id && (
              <rect
                x={X(r.x)}
                y={Y(r.y)}
                width={r.w * s}
                height={r.h * s}
                fill={colorRooms ? PALETTE[r.cat].accent : INK}
                opacity={colorRooms ? 0.16 : 0.06}
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
          return (
            <g key={`fx-${r.id}`} opacity={dim ? 0.25 : 1} pointerEvents="none">
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
                      fill={PAPER}
                      fillOpacity={0.5}
                      stroke={INK_SOFT}
                      strokeOpacity={0.75}
                      strokeWidth={0.9}
                      strokeDasharray={f.kind === "built" ? "3 2" : undefined}
                    />
                    {pw > f.label.length * 5.4 + 8 && ph > 14 && (
                      <text
                        x={X(f.x + f.w / 2)}
                        y={Y(f.y + f.h / 2) + 3.5}
                        textAnchor="middle"
                        fontSize={9.5}
                        fill={INK_SOFT}
                        opacity={0.85}
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
          stroke={w.open ? INK_FAINT : WALL}
          strokeWidth={w.open ? 1.2 : w.outer ? 4 : 2.6}
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
        strokeWidth={5}
        strokeLinejoin="miter"
        pointerEvents="none"
      />

      {/* Doors — drawn last so they cut the openings back out of the walls */}
      {showDoors && level.doors.map((d, i) => <DoorMark key={i} d={d} s={s} X={X} Y={Y} />)}

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
            stroke={INK}
            strokeWidth={2.6}
            pointerEvents="none"
          />
        </>
      ) : (
        <>
          <Dim axis="h" from={0} to={foot.w} at={-3.2} label={ftIn(foot.w)} side={1} X={X} Y={Y} />
          <Dim axis="v" from={0} to={foot.h} at={-3.2} label={ftIn(foot.h)} side={1} X={X} Y={Y} />
          <Dim
            axis="v"
            from={0}
            to={MAIN_DEPTH}
            at={foot.w + 3.2}
            label={ftIn(MAIN_DEPTH)}
            side={-1}
            X={X}
            Y={Y}
          />
          {pad ? (
            <>
              <Dim
                axis="h"
                from={pad.x}
                to={pad.x + pad.w}
                at={pad.y + pad.h + 3.2}
                label={ftIn(pad.w)}
                side={-1}
                X={X}
                Y={Y}
              />
              <Dim
                axis="v"
                from={pad.y}
                to={pad.y + pad.h}
                at={pad.x + pad.w + 3.2}
                label={ftIn(pad.h)}
                side={-1}
                X={X}
                Y={Y}
              />
            </>
          ) : (
            <Dim
              axis="h"
              from={0}
              to={REAR_BUMP_WIDTH}
              at={foot.h + 3.2}
              label={ftIn(REAR_BUMP_WIDTH)}
              side={-1}
              X={X}
              Y={Y}
            />
          )}
        </>
      )}

      {/* Orientation + scale note */}
      <g pointerEvents="none">
        <text x={SHEET_W / 2} y={18} textAnchor="middle" fontSize={10.5} fill={INK_FAINT} letterSpacing={2}>
          FRONT OF HOUSE ▲
        </text>
        <text
          x={SHEET_W / 2}
          y={sheetH - 8}
          textAnchor="middle"
          fontSize={10.5}
          fill={INK_FAINT}
          letterSpacing={2}
        >
          ▼ REAR OF HOUSE
        </text>
        {/* Graphic scale bar — a round number of feet, roughly 90px long */}
        <g transform={`translate(${SHEET_W - 150}, ${sheetH - 26})`}>
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
