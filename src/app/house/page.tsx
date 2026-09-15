"use client";

import { useState } from "react";
import { Box, DoorOpen, Grid3x3, Layers, Maximize2, Palette, Ruler, Sofa } from "lucide-react";
import { RoomStudio } from "@/components/RoomStudio";
import { FloorPlan } from "@/components/FloorPlan";
import {
  HOUSE_DEPTH,
  HOUSE_WIDTH,
  LEVELS,
  PALETTE,
  TOTAL_AREA,
  doorsForRoom,
  footprintBounds,
  ftIn,
  levelArea,
  roomArea,
} from "@/lib/houseplan";

const CAT_LABEL: Record<string, string> = {
  living: "Living",
  cook: "Kitchen & dining",
  sleep: "Sleeping",
  bath: "Bathroom",
  work: "Work & studio",
  service: "Service",
  circ: "Circulation",
};

function Toggle({
  on,
  onClick,
  icon: Icon,
  label,
}: {
  on: boolean;
  onClick: () => void;
  icon: typeof Ruler;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition-colors ${
        on
          ? "border-sky-400/40 bg-sky-400/10 text-sky-200"
          : "border-white/[0.08] bg-white/[0.02] text-zinc-500 hover:text-zinc-300"
      }`}
    >
      <Icon size={14} /> {label}
    </button>
  );
}

export default function HousePlans() {
  const [mode, setMode] = useState<"plans" | "studio">("plans");
  const [levelId, setLevelId] = useState(LEVELS[1].id); // open on the main level
  const [roomId, setRoomId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showFixtures, setShowFixtures] = useState(true);
  const [zoomToRoom, setZoomToRoom] = useState(true);
  const [showDoors, setShowDoors] = useState(true);
  const [colorRooms, setColorRooms] = useState(false);

  const level = LEVELS.find((l) => l.id === levelId) ?? LEVELS[1];
  const room = level.rooms.find((r) => r.id === roomId) ?? null;

  const selectLevel = (id: string) => {
    setLevelId(id);
    setRoomId(null);
  };

  const enclosed = levelArea(level);
  const doors = room ? doorsForRoom(level, room) : [];

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">House plans</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Four levels · {ftIn(HOUSE_WIDTH)} × {ftIn(HOUSE_DEPTH)} overall ·{" "}
          {Math.round(TOTAL_AREA).toLocaleString()} sq ft enclosed. Every measurement is
          drawn to scale on the grid — ask me to change any of them.
        </p>
      </header>

      {/* ---- Plans or studio --------------------------------------------- */}
      <div className="mb-4 inline-flex rounded-xl border border-white/[0.08] bg-white/[0.02] p-1">
        {(
          [
            ["plans", "Floor plans", Ruler],
            ["studio", "Room studio", Box],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            aria-pressed={mode === id}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              mode === id ? "bg-emerald-400/15 text-emerald-300" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {mode === "studio" ? (
        <RoomStudio />
      ) : (
        <>
      {/* ---- Level tabs -------------------------------------------------- */}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {[...LEVELS].reverse().map((l) => {
          const active = l.id === level.id;
          return (
            <button
              key={l.id}
              onClick={() => selectLevel(l.id)}
              className={`shrink-0 rounded-xl border px-4 py-2.5 text-left transition-all ${
                active
                  ? "border-emerald-400/40 bg-emerald-400/10"
                  : "border-white/[0.07] bg-white/[0.02] hover:border-white/15"
              }`}
            >
              <div
                className={`text-sm font-semibold ${active ? "text-emerald-300" : "text-zinc-300"}`}
              >
                {l.name}
              </div>
              <div className="text-[11px] text-zinc-500">{l.subtitle}</div>
            </button>
          );
        })}
      </div>

      {/* ---- Room tabs for the selected level ---------------------------- */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        <button
          onClick={() => setRoomId(null)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            room === null
              ? "bg-white/[0.10] text-zinc-100"
              : "bg-white/[0.03] text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Full floor
        </button>
        {level.rooms.map((r) => {
          const active = r.id === room?.id;
          return (
            <button
              key={r.id}
              onClick={() => setRoomId(r.id)}
              style={active ? { color: PALETTE[r.cat].accent } : undefined}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                active ? "bg-white/[0.10]" : "bg-white/[0.03] text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: PALETTE[r.cat].accent, opacity: active ? 1 : 0.5 }}
              />
              {r.name}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* ---- Drawing sheet -------------------------------------------- */}
        <section className="card overflow-hidden rounded-2xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-zinc-200">
                {level.name}
                {room ? ` — ${room.name}` : ""}
              </div>
              <div className="text-[11px] text-zinc-500">
                {room
                  ? `${ftIn(room.w)} wide × ${ftIn(room.h)} deep · ${Math.round(roomArea(room))} sq ft`
                  : `Scaled plan · black line on white, 1 ft grid, heavier line every 5 ft`}
              </div>
            </div>
            <div className="flex gap-1.5">
              <Toggle on={showGrid} onClick={() => setShowGrid((v) => !v)} icon={Grid3x3} label="Grid" />
              <Toggle
                on={showFixtures}
                onClick={() => setShowFixtures((v) => !v)}
                icon={Sofa}
                label="Furniture"
              />
              <Toggle
                on={showDoors}
                onClick={() => setShowDoors((v) => !v)}
                icon={DoorOpen}
                label="Doors"
              />
              <Toggle
                on={colorRooms}
                onClick={() => setColorRooms((v) => !v)}
                icon={Palette}
                label="Colour"
              />
              <Toggle
                on={zoomToRoom}
                onClick={() => setZoomToRoom((v) => !v)}
                icon={Maximize2}
                label="Zoom to room"
              />
            </div>
          </div>
          <FloorPlan
            level={level}
            selectedId={room?.id ?? null}
            onSelect={setRoomId}
            zoomToRoom={zoomToRoom}
            showGrid={showGrid}
            showFixtures={showFixtures}
            showDoors={showDoors}
            colorRooms={colorRooms}
          />
        </section>

        {/* ---- Detail panel --------------------------------------------- */}
        <aside className="flex flex-col gap-4">
          {room ? (
            <div className="card rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: PALETTE[room.cat].accent }}
                />
                <h2 className="text-base font-semibold text-zinc-100">{room.name}</h2>
              </div>
              <p className="mt-2 text-xs leading-5 text-zinc-400">{room.note}</p>

              <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                {[
                  ["Width", ftIn(room.w)],
                  ["Depth", ftIn(room.h)],
                  [room.exterior ? "Slab area" : "Floor area", `${Math.round(roomArea(room))} sq ft`],
                  ["Ceiling", room.exterior ? "Open to sky" : ftIn(level.ceiling)],
                  ["Perimeter", ftIn(2 * (room.w + room.h))],
                  ["Type", CAT_LABEL[room.cat]],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                    <dt className="text-[10px] uppercase tracking-wide text-zinc-500">{k}</dt>
                    <dd className="mt-0.5 tabular-nums text-zinc-100">{v}</dd>
                  </div>
                ))}
              </dl>

              {room.openTo?.length ? (
                <p className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2 text-[11px] text-emerald-200">
                  Open (no wall) to{" "}
                  {room.openTo
                    .map((id) => level.rooms.find((r) => r.id === id)?.name ?? id)
                    .join(" and ")}
                  .
                </p>
              ) : null}

              {doors.length ? (
                <div className="mt-4">
                  <h3 className="mb-2 text-[10px] uppercase tracking-wide text-zinc-500">
                    Doors ({doors.length})
                  </h3>
                  <ul className="space-y-1">
                    {doors.map((d, i) => (
                      <li
                        key={i}
                        className="flex items-baseline justify-between gap-3 border-b border-white/[0.05] pb-1 text-xs last:border-0"
                      >
                        <span className="text-zinc-300">{d.label}</span>
                        <span className="shrink-0 tabular-nums text-zinc-500">
                          {d.kind === "opening" ? "cased" : d.kind === "slider" ? "slider" : "swing"} ·{" "}
                          {ftIn(d.w)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {room.fixtures?.length ? (
                <div className="mt-4">
                  <h3 className="mb-2 text-[10px] uppercase tracking-wide text-zinc-500">
                    In this room
                  </h3>
                  <ul className="space-y-1">
                    {room.fixtures.map((f, i) => (
                      <li
                        key={i}
                        className="flex items-baseline justify-between gap-3 border-b border-white/[0.05] pb-1 text-xs last:border-0"
                      >
                        <span className="text-zinc-300">{f.label}</span>
                        <span className="shrink-0 tabular-nums text-zinc-500">
                          {ftIn(f.w)} × {ftIn(f.h)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="card rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-emerald-400" />
                <h2 className="text-base font-semibold text-zinc-100">{level.name}</h2>
              </div>
              <p className="mt-2 text-xs leading-5 text-zinc-400">{level.subtitle}</p>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                {[
                  ["Rooms", String(level.rooms.filter((r) => !r.exterior).length)],
                  ["Ceiling", ftIn(level.ceiling)],
                  ["Floor area", `${Math.round(enclosed)} sq ft`],
                  [
                    "Footprint",
                    `${ftIn(footprintBounds(level).w)} × ${ftIn(footprintBounds(level).h)}`,
                  ],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                    <dt className="text-[10px] uppercase tracking-wide text-zinc-500">{k}</dt>
                    <dd className="mt-0.5 tabular-nums text-zinc-100">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-[11px] leading-5 text-zinc-500">
                Pick a room tab above — or click a room on the plan — to zoom in and dimension it.
              </p>
            </div>
          )}

          {/* Legend */}
          <div className="card rounded-2xl p-4">
            <h3 className="mb-2 text-[10px] uppercase tracking-wide text-zinc-500">
              Room types {colorRooms ? "" : "(turn on Colour to wash the plan)"}
            </h3>
            <ul className="space-y-1.5 text-xs text-zinc-400">
              {Object.entries(CAT_LABEL).map(([cat, label]) => (
                <li key={cat} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ background: PALETTE[cat as keyof typeof PALETTE].accent }}
                  />
                  {label}
                </li>
              ))}
            </ul>
            <div className="mt-3 space-y-1.5 border-t border-white/[0.06] pt-3 text-[11px] text-zinc-500">
              <div className="flex items-center gap-2">
                <svg width="30" height="14" className="shrink-0 rounded-sm bg-white">
                  <line x1="3" y1="7" x2="27" y2="7" stroke="#0b0b0c" strokeWidth="2.6" />
                </svg>
                Wall
              </div>
              <div className="flex items-center gap-2">
                <svg width="30" height="14" className="shrink-0 rounded-sm bg-white">
                  <line
                    x1="3"
                    y1="7"
                    x2="27"
                    y2="7"
                    stroke="#7b8595"
                    strokeWidth="1.2"
                    strokeDasharray="5 4"
                  />
                </svg>
                Cased opening (no wall)
              </div>
              <div className="flex items-center gap-2">
                <svg width="30" height="14" className="shrink-0 rounded-sm bg-white">
                  <line x1="2" y1="3" x2="7" y2="3" stroke="#0b0b0c" strokeWidth="2.4" />
                  <line x1="23" y1="3" x2="28" y2="3" stroke="#0b0b0c" strokeWidth="2.4" />
                  <line x1="7" y1="3" x2="7" y2="12" stroke="#0b0b0c" strokeWidth="1.4" />
                  <path d="M 23 3 A 9 9 0 0 0 7 12" fill="none" stroke="#0b0b0c" strokeWidth="0.9" />
                </svg>
                Door, showing its swing
              </div>
              <div className="flex items-center gap-2">
                <svg width="30" height="14" className="shrink-0 rounded-sm bg-white">
                  <line x1="2" y1="7" x2="7" y2="7" stroke="#0b0b0c" strokeWidth="2.4" />
                  <line x1="23" y1="7" x2="28" y2="7" stroke="#0b0b0c" strokeWidth="2.4" />
                  <line x1="7" y1="5" x2="17" y2="5" stroke="#0b0b0c" strokeWidth="1.8" />
                  <line x1="14" y1="9" x2="23" y2="9" stroke="#0b0b0c" strokeWidth="1.8" />
                </svg>
                Sliding door
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ---- Room schedule --------------------------------------------- */}
      <section className="card mt-4 rounded-2xl p-4">
        <div className="mb-3 flex items-center gap-2">
          <Ruler size={16} className="text-sky-400" />
          <h2 className="text-sm font-semibold text-zinc-200">
            Room schedule — {level.name}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-wide text-zinc-500">
                <th className="pb-2 pr-3 font-medium">Room</th>
                <th className="pb-2 pr-3 font-medium">Width</th>
                <th className="pb-2 pr-3 font-medium">Depth</th>
                <th className="pb-2 pr-3 font-medium">Area</th>
                <th className="pb-2 font-medium">Ceiling</th>
              </tr>
            </thead>
            <tbody>
              {level.rooms.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setRoomId(r.id)}
                  className={`cursor-pointer border-b border-white/[0.05] transition-colors last:border-0 hover:bg-white/[0.03] ${
                    r.id === room?.id ? "bg-white/[0.05]" : ""
                  }`}
                >
                  <td className="py-2 pr-3">
                    <span className="flex items-center gap-2 text-zinc-200">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: PALETTE[r.cat].accent }}
                      />
                      {r.name}
                      {r.exterior && (
                        <span className="text-[10px] uppercase tracking-wide text-zinc-600">
                          exterior
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="py-2 pr-3 tabular-nums text-zinc-400">{ftIn(r.w)}</td>
                  <td className="py-2 pr-3 tabular-nums text-zinc-400">{ftIn(r.h)}</td>
                  <td className="py-2 pr-3 tabular-nums text-zinc-400">
                    {Math.round(roomArea(r))} sq ft
                  </td>
                  <td className="py-2 tabular-nums text-zinc-400">
                    {r.exterior ? "—" : ftIn(level.ceiling)}
                  </td>
                </tr>
              ))}
              <tr className="text-zinc-300">
                <td className="pt-2 pr-3 font-semibold">Total enclosed</td>
                <td className="pt-2 pr-3" />
                <td className="pt-2 pr-3" />
                <td className="pt-2 pr-3 tabular-nums font-semibold">
                  {Math.round(enclosed)} sq ft
                </td>
                <td className="pt-2" />
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-[11px] leading-5 text-zinc-500">
          Every dimension on this page is driven by{" "}
          <code className="rounded bg-white/[0.06] px-1 py-0.5 text-zinc-300">
            src/lib/houseplan.ts
          </code>
          . Ask for a change in plain words — &ldquo;make the gym 22 ft wide&rdquo;, &ldquo;push the
          rear bump-out out another 4 ft&rdquo; — and the drawing, the dimension strings and this
          schedule all update together.
        </p>
      </section>
        </>
      )}
    </div>
  );
}
