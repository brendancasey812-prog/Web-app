"use client";

import { useMemo, useRef, useState } from "react";
import { CATALOGUE, seedItems, useRoomDesign, type DesignItem } from "@/lib/roomdesign";
import { LEVELS, ftIn, type Level, type Room } from "@/lib/houseplan";

/* The sheet, in px. The room is fitted into it, so these never change. */
const SHEET_W = 1000;
const SHEET_H = 720;
const SHEET_PAD = 46;

/* Same drafting palette as the plans: black line on white, no colour. */
const PAPER = "#ffffff";
const INK = "#101114";
const INK_2 = "#454c58";
const INK_3 = "#79828f";
const GRID = "#dbe3ee";
const GRID_MAJOR = "#b6c4d6";
const FACE_TOP = "#ffffff";
const FACE_RIGHT = "#eceff4";
const FACE_FRONT = "#dfe4ec";

/* True isometric: 30° either side of vertical. */
const IX = Math.cos(Math.PI / 6);
const IY = Math.sin(Math.PI / 6);

/** Project a point in room-local feet onto the sheet, before scaling. */
const unit = (x: number, y: number, z: number) => ({
  ux: (x - y) * IX,
  uy: (x + y) * IY - z,
});

/** Everything is snapped to 3 inches, so nothing lands off the grid. */
const SNAP = 0.25;
const snap = (v: number) => Math.round(v / SNAP) * SNAP;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function RoomStudio() {
  const [levelId, setLevelId] = useState("basement");
  const [roomId, setRoomId] = useState("b-games");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const drag = useRef<{ id: string; cx: number; cy: number; x: number; y: number } | null>(null);
  /* Only a press that started on empty floor should clear the selection — a
     drag ends with its click on the sheet, which would otherwise deselect. */
  const pressedBackground = useRef(false);

  const { add, update, remove, reset } = useRoomDesign();

  const level: Level = LEVELS.find((l) => l.id === levelId) ?? LEVELS[0];
  const room: Room = level.rooms.find((r) => r.id === roomId) ?? level.rooms[0];

  /* Subscribe to just this room's arrangement, falling back to the plan's own
     furniture until the user changes something. */
  const saved = useRoomDesign((st) => st.rooms[room.id]);
  const items = useMemo(() => saved ?? seedItems(room), [saved, room]);
  const selected = items.find((i) => i.id === selectedId) ?? null;

  const W = room.w;
  const D = room.h;
  const H = level.ceiling;

  /* ---- Fit the room box onto the sheet. --------------------------------- */
  const { s, ox, oy } = useMemo(() => {
    const corners = [
      unit(0, 0, 0), unit(W, 0, 0), unit(W, D, 0), unit(0, D, 0),
      unit(0, 0, H), unit(W, 0, H), unit(W, D, H), unit(0, D, H),
    ];
    const xs = corners.map((c) => c.ux);
    const ys = corners.map((c) => c.uy);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const scale = Math.min(
      (SHEET_W - SHEET_PAD * 2) / (maxX - minX),
      (SHEET_H - SHEET_PAD * 2) / (maxY - minY),
    );
    return {
      s: scale,
      ox: (SHEET_W - (maxX - minX) * scale) / 2 - minX * scale,
      oy: (SHEET_H - (maxY - minY) * scale) / 2 - minY * scale,
    };
  }, [W, D, H]);

  const P = (x: number, y: number, z: number) => {
    const u = unit(x, y, z);
    return { x: ox + u.ux * s, y: oy + u.uy * s };
  };
  const poly = (pts: { x: number; y: number }[]) => pts.map((p) => `${p.x},${p.y}`).join(" ");

  /* ---- Dragging a piece across the floor. ------------------------------- */
  function svgScale() {
    const rect = svgRef.current?.getBoundingClientRect();
    return rect && rect.width > 0 ? SHEET_W / rect.width : 1;
  }
  function onPointerDown(e: React.PointerEvent, it: DesignItem) {
    e.stopPropagation();
    pressedBackground.current = false;
    setSelectedId(it.id);
    drag.current = { id: it.id, cx: e.clientX, cy: e.clientY, x: it.x, y: it.y };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const k = svgScale();
    /* Undo the projection: screen delta back to feet across the floor. */
    const a = ((e.clientX - d.cx) * k) / (IX * s);
    const b = ((e.clientY - d.cy) * k) / (IY * s);
    const it = items.find((i) => i.id === d.id);
    if (!it) return;
    update(room.id, d.id, {
      x: clamp(snap(d.x + (a + b) / 2), 0, Math.max(0, W - it.w)),
      y: clamp(snap(d.y + (b - a) / 2), 0, Math.max(0, D - it.h)),
    });
  }
  const endDrag = () => { drag.current = null; };

  /* ---- Grid lines on the floor and the two far walls. ------------------- */
  const grid = useMemo(() => {
    if (!showGrid) return null;
    const out: React.ReactElement[] = [];
    const line = (k: string, a: { x: number; y: number }, b: { x: number; y: number }, major: boolean) => (
      <line key={k} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
        stroke={major ? GRID_MAJOR : GRID} strokeWidth={major ? 1 : 0.6} />
    );
    for (let i = 0; i <= Math.ceil(W); i++) {
      const v = Math.min(i, W), maj = i % 5 === 0;
      out.push(line(`fx${i}`, P(v, 0, 0), P(v, D, 0), maj));
      out.push(line(`wx${i}`, P(v, 0, 0), P(v, 0, H), maj));
    }
    for (let j = 0; j <= Math.ceil(D); j++) {
      const v = Math.min(j, D), maj = j % 5 === 0;
      out.push(line(`fy${j}`, P(0, v, 0), P(W, v, 0), maj));
      out.push(line(`wy${j}`, P(0, v, 0), P(0, v, H), maj));
    }
    for (let k = 0; k <= Math.ceil(H); k++) {
      const v = Math.min(k, H), maj = k % 5 === 0;
      out.push(line(`hz${k}`, P(0, 0, v), P(W, 0, v), maj));
      out.push(line(`hy${k}`, P(0, 0, v), P(0, D, v), maj));
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showGrid, W, D, H, s, ox, oy]);

  /* Far pieces first, so nearer ones paint over them. */
  const ordered = [...items].sort((a, b) => a.x + a.y - (b.x + b.y));

  function addFrom(entry: (typeof CATALOGUE)[number]) {
    const w = Math.min(entry.w, W);
    const h = Math.min(entry.h, D);
    const id = add(room.id, {
      label: entry.label,
      w,
      h,
      z: entry.z,
      x: clamp(snap((W - w) / 2), 0, Math.max(0, W - w)),
      y: clamp(snap((D - h) / 2), 0, Math.max(0, D - h)),
    });
    setSelectedId(id);
  }

  function patchSelected(patch: Partial<DesignItem>) {
    if (!selected) return;
    const next = { ...selected, ...patch };
    update(room.id, selected.id, {
      ...patch,
      w: clamp(next.w, 0.5, W),
      h: clamp(next.h, 0.5, D),
      z: clamp(next.z, 0.1, H),
      x: clamp(next.x, 0, Math.max(0, W - clamp(next.w, 0.5, W))),
      y: clamp(next.y, 0, Math.max(0, D - clamp(next.h, 0.5, D))),
    });
  }

  const num = (label: string, value: number, onChange: (v: number) => void, step = 0.25) => (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="field w-full rounded-lg px-2 py-1.5 text-sm tabular-nums"
      />
    </label>
  );

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      {/* ---- The view ----------------------------------------------------- */}
      <section className="card overflow-hidden rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-zinc-200">
              {room.name} — {level.name}
            </div>
            <div className="text-[11px] text-zinc-500">
              {ftIn(W)} × {ftIn(D)}, {ftIn(H)} ceiling · 1 square = 1 ft · drag a piece to move it
            </div>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setShowGrid((v) => !v)}
              aria-pressed={showGrid}
              className={`h-9 rounded-lg border px-3 text-xs font-medium transition-colors ${
                showGrid
                  ? "border-sky-400/40 bg-sky-400/10 text-sky-200"
                  : "border-white/[0.08] bg-white/[0.02] text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setShowLabels((v) => !v)}
              aria-pressed={showLabels}
              className={`h-9 rounded-lg border px-3 text-xs font-medium transition-colors ${
                showLabels
                  ? "border-sky-400/40 bg-sky-400/10 text-sky-200"
                  : "border-white/[0.08] bg-white/[0.02] text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Labels
            </button>
            <button
              onClick={() => { reset(room.id); setSelectedId(null); }}
              className="h-9 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-300"
            >
              Reset
            </button>
          </div>
        </div>

        <svg
          ref={svgRef}
          viewBox={`0 0 ${SHEET_W} ${SHEET_H}`}
          className="block h-auto w-full touch-none select-none"
          role="img"
          aria-label={`Isometric view of the ${room.name}`}
          onPointerDown={() => { pressedBackground.current = true; }}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          onClick={() => {
            if (pressedBackground.current) setSelectedId(null);
            pressedBackground.current = false;
          }}
        >
          <rect x={0} y={0} width={SHEET_W} height={SHEET_H} fill={PAPER} />

          {/* Floor and the two far walls */}
          <polygon points={poly([P(0, 0, 0), P(W, 0, 0), P(W, D, 0), P(0, D, 0)])} fill={PAPER} />
          <polygon points={poly([P(0, 0, 0), P(W, 0, 0), P(W, 0, H), P(0, 0, H)])} fill="#fafbfd" />
          <polygon points={poly([P(0, 0, 0), P(0, D, 0), P(0, D, H), P(0, 0, H)])} fill="#f4f6f9" />
          {grid}

          {/* Room edges */}
          {(
            [
              [P(0, 0, 0), P(W, 0, 0)], [P(W, 0, 0), P(W, D, 0)],
              [P(W, D, 0), P(0, D, 0)], [P(0, D, 0), P(0, 0, 0)],
              [P(0, 0, 0), P(0, 0, H)], [P(W, 0, 0), P(W, 0, H)], [P(0, D, 0), P(0, D, H)],
              [P(0, 0, H), P(W, 0, H)], [P(0, 0, H), P(0, D, H)],
            ] as const
          ).map(([a, b], i) => (
            <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={INK} strokeWidth={2} />
          ))}

          {/* Furniture */}
          {ordered.map((it) => {
            const on = it.id === selectedId;
            const top = [P(it.x, it.y, it.z), P(it.x + it.w, it.y, it.z), P(it.x + it.w, it.y + it.h, it.z), P(it.x, it.y + it.h, it.z)];
            const right = [P(it.x + it.w, it.y, 0), P(it.x + it.w, it.y + it.h, 0), P(it.x + it.w, it.y + it.h, it.z), P(it.x + it.w, it.y, it.z)];
            const front = [P(it.x, it.y + it.h, 0), P(it.x + it.w, it.y + it.h, 0), P(it.x + it.w, it.y + it.h, it.z), P(it.x, it.y + it.h, it.z)];
            const c = top.reduce((a, p) => ({ x: a.x + p.x / 4, y: a.y + p.y / 4 }), { x: 0, y: 0 });
            const sw = on ? 2.4 : 1.1;
            return (
              <g
                key={it.id}
                onPointerDown={(e) => onPointerDown(e, it)}
                onClick={(e) => e.stopPropagation()}
                style={{ cursor: "move" }}
              >
                <polygon points={poly(front)} fill={on ? "#cfd8e6" : FACE_FRONT} stroke={INK} strokeWidth={sw} />
                <polygon points={poly(right)} fill={on ? "#dde4ee" : FACE_RIGHT} stroke={INK} strokeWidth={sw} />
                <polygon points={poly(top)} fill={on ? "#eaeff6" : FACE_TOP} stroke={INK} strokeWidth={sw} />
                {showLabels && it.w * s > 34 && (
                  <text x={c.x} y={c.y + 3} textAnchor="middle" fontSize={10} fill={INK_2} pointerEvents="none">
                    {it.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Which wall is which */}
          <text x={P(W / 2, 0, H).x} y={P(W / 2, 0, H).y - 10} textAnchor="middle" fontSize={10} fill={INK_3} letterSpacing={1.5}>
            FRONT WALL
          </text>
          <text x={P(0, D / 2, H).x} y={P(0, D / 2, H).y - 10} textAnchor="middle" fontSize={10} fill={INK_3} letterSpacing={1.5}>
            LEFT WALL
          </text>
        </svg>
      </section>

      {/* ---- Controls ------------------------------------------------------ */}
      <aside className="flex flex-col gap-4">
        <div className="card rounded-2xl p-4">
          <h3 className="mb-2 text-[10px] uppercase tracking-wide text-zinc-500">Room</h3>
          <select
            value={levelId}
            onChange={(e) => {
              const l = LEVELS.find((x) => x.id === e.target.value) ?? LEVELS[0];
              setLevelId(l.id);
              setRoomId(l.rooms[0].id);
              setSelectedId(null);
            }}
            className="field mb-2 w-full rounded-lg px-2 py-2 text-sm"
          >
            {[...LEVELS].reverse().map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <select
            value={roomId}
            onChange={(e) => { setRoomId(e.target.value); setSelectedId(null); }}
            className="field w-full rounded-lg px-2 py-2 text-sm"
          >
            {level.rooms.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <p className="mt-2 text-[11px] leading-5 text-zinc-500">
            {saved
              ? "Your own arrangement, saved in this browser. Reset takes the plan's furniture back."
              : "Starting from the furniture on the plan. Move anything and it becomes yours."}
          </p>
        </div>

        {selected ? (
          <div className="card rounded-2xl p-4">
            <h3 className="mb-2 text-[10px] uppercase tracking-wide text-zinc-500">Selected piece</h3>
            <input
              value={selected.label}
              onChange={(e) => patchSelected({ label: e.target.value })}
              className="field mb-3 w-full rounded-lg px-2 py-1.5 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              {num("Width", selected.w, (v) => patchSelected({ w: v }))}
              {num("Depth", selected.h, (v) => patchSelected({ h: v }))}
              {num("Height", selected.z, (v) => patchSelected({ z: v }))}
              {num("From left", selected.x, (v) => patchSelected({ x: v }))}
              {num("From front", selected.y, (v) => patchSelected({ y: v }))}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => patchSelected({ w: selected.h, h: selected.w })}
                className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-white/[0.06]"
              >
                Rotate 90°
              </button>
              <button
                onClick={() => { remove(room.id, selected.id); setSelectedId(null); }}
                className="flex-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-200 hover:bg-rose-500/20"
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="card rounded-2xl p-4 text-[11px] leading-5 text-zinc-500">
            Click a piece to select it, then drag it around the floor or set its size here.
          </div>
        )}

        <div className="card rounded-2xl p-4">
          <h3 className="mb-2 text-[10px] uppercase tracking-wide text-zinc-500">
            Add to this room
          </h3>
          <div className="grid grid-cols-2 gap-1.5">
            {CATALOGUE.map((entry) => (
              <button
                key={entry.label}
                onClick={() => addFrom(entry)}
                className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-2 py-2 text-left text-[11px] text-zinc-300 hover:border-white/20 hover:bg-white/[0.05]"
              >
                {entry.label}
                <span className="block text-[10px] tabular-nums text-zinc-600">
                  {ftIn(entry.w)} × {ftIn(entry.h)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
