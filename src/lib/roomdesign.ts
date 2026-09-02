"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { LEVELS, fixtureHeight, type Level, type Room } from "./houseplan";

/**
 * ============================================================================
 *  ROOM STUDIO — your own layout for a room, kept separate from the plans
 * ============================================================================
 *
 *  The floor plans in `houseplan.ts` are the drawing set: I edit those when you
 *  ask for a dimension change. What you arrange in the studio is yours, saved
 *  in this browser, and seeded from the plan's own furniture the first time you
 *  open a room. Resetting a room throws your arrangement away and takes the
 *  plan's furniture again.
 *
 *  Everything is in feet, measured from the room's own front-left corner — so
 *  a piece at (0, 0) sits in the corner nearest the front of the house.
 * ============================================================================
 */

export interface DesignItem {
  id: string;
  label: string;
  /** Room-local feet, from the room's front-left corner. */
  x: number;
  y: number;
  /** Footprint. */
  w: number;
  h: number;
  /** How tall it stands. */
  z: number;
}

/** Pieces you can drop into a room. Sizes are typical real ones, in feet. */
export const CATALOGUE: { label: string; w: number; h: number; z: number }[] = [
  { label: "Sofa", w: 7, h: 3, z: 2.6 },
  { label: "Sectional", w: 11, h: 3.5, z: 2.6 },
  { label: "Armchair", w: 3.5, h: 3.5, z: 3 },
  { label: "Coffee table", w: 4, h: 2.5, z: 1.5 },
  { label: "Media wall", w: 8, h: 1, z: 4.5 },
  { label: "Projector screen", w: 12, h: 0.8, z: 8 },
  { label: "Pool table", w: 9, h: 4.5, z: 2.7 },
  { label: "Poker table", w: 6, h: 6, z: 2.5 },
  { label: "Shuffleboard", w: 22, h: 2.5, z: 2.6 },
  { label: "Foosball table", w: 5, h: 2.5, z: 3 },
  { label: "Arcade cabinet", w: 2.5, h: 2.5, z: 6 },
  { label: "Bar counter", w: 10, h: 2.5, z: 3.5 },
  { label: "Bar stool", w: 1.5, h: 1.5, z: 2.5 },
  { label: "Beverage fridge", w: 3, h: 2.5, z: 6 },
  { label: "Bookshelf", w: 4, h: 1.5, z: 6 },
  { label: "Desk", w: 5, h: 2.5, z: 2.5 },
  { label: "Dining table", w: 8, h: 4, z: 2.5 },
  { label: "Bed", w: 6.5, h: 7, z: 2 },
  { label: "Recliner row", w: 18, h: 3.5, z: 3.4 },
  { label: "Rug", w: 10, h: 8, z: 0.1 },
];

const uid = () => Math.random().toString(36).slice(2, 10);

/**
 * The plan's own furniture, moved into the room's local coordinates.
 *
 * The ids are derived from the room and the fixture's position in it, not
 * generated — a seeded room is recomputed on every render, and random ids
 * would change underneath the selection and the drag that is using them.
 */
export function seedItems(room: Room): DesignItem[] {
  return (room.fixtures ?? []).map((f, i) => ({
    id: `${room.id}-plan-${i}`,
    label: f.label,
    x: +(f.x - room.x).toFixed(2),
    y: +(f.y - room.y).toFixed(2),
    w: f.w,
    h: f.h,
    z: fixtureHeight(f),
  }));
}

export function findRoom(roomId: string): { level: Level; room: Room } | null {
  for (const level of LEVELS) {
    const room = level.rooms.find((r) => r.id === roomId);
    if (room) return { level, room };
  }
  return null;
}

interface DesignState {
  /** Arrangements the user has actually touched, keyed by room id. */
  rooms: Record<string, DesignItem[]>;
  /** Items for a room, seeding from the plan the first time it is opened. */
  itemsFor: (roomId: string) => DesignItem[];
  add: (roomId: string, item: Omit<DesignItem, "id">) => string;
  update: (roomId: string, id: string, patch: Partial<DesignItem>) => void;
  remove: (roomId: string, id: string) => void;
  reset: (roomId: string) => void;
  /** True once the user has changed a room away from the plan's furniture. */
  isCustomised: (roomId: string) => boolean;
}

export const useRoomDesign = create<DesignState>()(
  persist(
    (set, get) => ({
      rooms: {},

      itemsFor: (roomId) => {
        const saved = get().rooms[roomId];
        if (saved) return saved;
        const found = findRoom(roomId);
        return found ? seedItems(found.room) : [];
      },

      add: (roomId, item) => {
        const id = `own-${uid()}`;
        set((s) => ({
          rooms: { ...s.rooms, [roomId]: [...get().itemsFor(roomId), { ...item, id }] },
        }));
        return id;
      },

      update: (roomId, id, patch) =>
        set((s) => ({
          rooms: {
            ...s.rooms,
            [roomId]: get()
              .itemsFor(roomId)
              .map((it) => (it.id === id ? { ...it, ...patch } : it)),
          },
        })),

      remove: (roomId, id) =>
        set((s) => ({
          rooms: {
            ...s.rooms,
            [roomId]: get()
              .itemsFor(roomId)
              .filter((it) => it.id !== id),
          },
        })),

      reset: (roomId) =>
        set((s) => {
          const rooms = { ...s.rooms };
          delete rooms[roomId];
          return { rooms };
        }),

      isCustomised: (roomId) => !!get().rooms[roomId],
    }),
    { name: "house-room-studio-v1" },
  ),
);
