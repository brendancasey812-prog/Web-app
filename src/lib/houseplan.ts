/**
 * ============================================================================
 *  HOUSE PLAN — SINGLE SOURCE OF TRUTH FOR EVERY DIMENSION
 * ============================================================================
 *
 *  Every number in this file is in FEET. Change a number here and the drawing,
 *  the dimension strings, the areas and the schedules all update together.
 *
 *  Coordinate system (matches how the plan is drawn):
 *
 *      x = 0 ────────────────────────────────► x = 48   (WIDTH, left → right)
 *      │  FRONT OF HOUSE (street side)
 *      │
 *      ▼
 *      y = 42  REAR OF HOUSE                            (DEPTH, front → back)
 *
 *  A room is `{ x, y, w, h }` = its top-left corner plus width and depth, so
 *  the room covers x → x + w and y → y + h. Rooms tile the footprint exactly;
 *  walls are drawn wherever two rooms meet, and `openTo` removes that wall to
 *  make a cased opening instead (used for the open kitchen / dining / family).
 *
 *  Fixtures use the same absolute floor coordinates, not room-relative ones.
 * ============================================================================
 */

/** Overall footprint. Edit these two and every level resizes with them. */
export const HOUSE_WIDTH = 48; // ft, side to side
export const MAIN_DEPTH = 30; // ft, front wall to the back of the main rectangle
export const REAR_BUMP_WIDTH = 34; // ft, width of the rear bump-out
export const REAR_BUMP_DEPTH = 12; // ft, how far the bump-out projects past the main rectangle
export const HOUSE_DEPTH = MAIN_DEPTH + REAR_BUMP_DEPTH; // 42 ft overall

/**
 * The exterior wall line, walked clockwise from the front-left corner:
 * a plain rectangle with the extra room across the back.
 */
export const FOOTPRINT: [number, number][] = [
  [0, 0],
  [HOUSE_WIDTH, 0],
  [HOUSE_WIDTH, MAIN_DEPTH],
  [REAR_BUMP_WIDTH, MAIN_DEPTH],
  [REAR_BUMP_WIDTH, HOUSE_DEPTH],
  [0, HOUSE_DEPTH],
];

/** Area of one full floor, in square feet. */
export const FLOOR_AREA =
  HOUSE_WIDTH * MAIN_DEPTH + REAR_BUMP_WIDTH * REAR_BUMP_DEPTH;

/**
 * Colour families, so rooms of a kind read the same across every level.
 * `fill` is the whisper-light wash printed on the white drawing sheet;
 * `accent` is the saturated version used for tabs and legends in the dark UI.
 */
export const PALETTE = {
  living: { fill: "#ecf7f1", accent: "#34d399" },
  cook: { fill: "#fdf6e6", accent: "#fbbf24" },
  sleep: { fill: "#f2f0fc", accent: "#a78bfa" },
  bath: { fill: "#e9f4fc", accent: "#38bdf8" },
  work: { fill: "#fcecf3", accent: "#f472b6" },
  service: { fill: "#f3f5f8", accent: "#94a3b8" },
  circ: { fill: "#fbfbfc", accent: "#cbd5e1" },
} as const;

export type Category = keyof typeof PALETTE;

export interface Fixture {
  label: string;
  /** Absolute floor coordinates in feet. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** `soft` = furniture, `plumb` = plumbing fixture, `built` = built-in / millwork. */
  kind?: "soft" | "plumb" | "built";
}

export interface Room {
  id: string;
  name: string;
  cat: Category;
  x: number;
  y: number;
  w: number;
  h: number;
  /** One line of intent, shown on the room's own tab. */
  note: string;
  /** Room ids this room is fully open to — the shared wall becomes an opening. */
  openTo?: string[];
  fixtures?: Fixture[];
}

export interface Level {
  id: string;
  /** Tab label. */
  name: string;
  /** Small caption under the tab label. */
  subtitle: string;
  /** Finished ceiling height, feet. */
  ceiling: number;
  rooms: Room[];
}

/* ==========================================================================
 *  BASEMENT — the man cave, with one bathroom.
 * ========================================================================== */
const basement: Level = {
  id: "basement",
  name: "Basement",
  subtitle: "Man cave",
  ceiling: 8.5,
  rooms: [
    {
      id: "b-utility",
      name: "Mechanical & Storage",
      cat: "service",
      x: 0,
      y: 0,
      w: 18,
      h: 14,
      note: "Furnace, water heater, panel and long-term storage, kept behind a door so the lounge stays clean.",
      fixtures: [
        { label: "Furnace", x: 1, y: 1, w: 3.5, h: 3, kind: "built" },
        { label: "Water heater", x: 5.5, y: 1, w: 2.5, h: 2.5, kind: "built" },
        { label: "Shelving", x: 0.4, y: 6, w: 1.8, h: 7, kind: "built" },
      ],
    },
    {
      id: "b-stair",
      name: "Stair Landing",
      cat: "circ",
      x: 18,
      y: 0,
      w: 10,
      h: 14,
      note: "Stair up to the main level, stacked directly under the flights above.",
      fixtures: [{ label: "Stair up", x: 19, y: 2, w: 4.5, h: 11, kind: "built" }],
    },
    {
      id: "b-bath",
      name: "Bathroom",
      cat: "bath",
      x: 28,
      y: 0,
      w: 10,
      h: 14,
      note: "The basement's single full bathroom — shower, toilet and vanity.",
      fixtures: [
        { label: "Shower", x: 28.5, y: 0.5, w: 4, h: 4, kind: "plumb" },
        { label: "Toilet", x: 28.5, y: 6, w: 2.5, h: 2.5, kind: "plumb" },
        { label: "Vanity", x: 34.5, y: 0.5, w: 3, h: 6, kind: "plumb" },
      ],
    },
    {
      id: "b-cold",
      name: "Cold Storage",
      cat: "service",
      x: 38,
      y: 0,
      w: 10,
      h: 14,
      note: "Unheated shelving room for bulk goods and seasonal gear.",
      fixtures: [{ label: "Shelving", x: 38.4, y: 1, w: 1.8, h: 12, kind: "built" }],
    },
    {
      id: "b-mancave",
      name: "Man Cave",
      cat: "living",
      x: 0,
      y: 14,
      w: 48,
      h: 30 - 14,
      note: "One long room across the whole width — screen at one end, pool table at the other, open to the bar behind it.",
      openTo: ["b-bar"],
      fixtures: [
        { label: "Media wall", x: 7, y: 14.4, w: 11, h: 1, kind: "built" },
        { label: "Sectional couch", x: 6, y: 23, w: 13, h: 3.5, kind: "soft" },
        { label: "Coffee table", x: 9.5, y: 19.5, w: 5, h: 2.5, kind: "soft" },
        { label: "Pool table", x: 28, y: 18.5, w: 9, h: 4.5, kind: "soft" },
        { label: "Recliners", x: 40, y: 20, w: 6, h: 3.5, kind: "soft" },
      ],
    },
    {
      id: "b-bar",
      name: "Bar & Games",
      cat: "living",
      x: 0,
      y: 30,
      w: REAR_BUMP_WIDTH,
      h: REAR_BUMP_DEPTH,
      note: "The rear bump-out: wet bar with stools along it, poker table beside it.",
      openTo: ["b-mancave"],
      fixtures: [
        { label: "Bar counter", x: 3, y: 35.5, w: 16, h: 2.5, kind: "built" },
        { label: "Stools", x: 3, y: 38.3, w: 16, h: 1.5, kind: "soft" },
        { label: "Beverage fridge", x: 20, y: 35.5, w: 3, h: 2.5, kind: "built" },
        { label: "Poker table", x: 25, y: 33, w: 7, h: 7, kind: "soft" },
      ],
    },
  ],
};

/* ==========================================================================
 *  MAIN LEVEL — gym at the front, open kitchen + dining running back into
 *  the family room in the rear bump-out.
 * ========================================================================== */
const main: Level = {
  id: "main",
  name: "Main Level",
  subtitle: "Kitchen · dining · family",
  ceiling: 10,
  rooms: [
    {
      id: "m-gym",
      name: "Gym",
      cat: "work",
      x: 0,
      y: 0,
      w: 18,
      h: 14,
      note: "Front-left corner of the house, street-facing windows, mirrored on the outside wall.",
      fixtures: [
        { label: "Squat rack", x: 1.5, y: 1, w: 4.5, h: 3, kind: "soft" },
        { label: "Bench", x: 8, y: 1.5, w: 2, h: 5, kind: "soft" },
        { label: "Treadmill", x: 14, y: 1, w: 3, h: 6, kind: "soft" },
        { label: "Free weights", x: 1.5, y: 11, w: 8, h: 1.8, kind: "built" },
        { label: "Mirror wall", x: 0.35, y: 1, w: 0.5, h: 9, kind: "built" },
      ],
    },
    {
      id: "m-foyer",
      name: "Foyer & Stairs",
      cat: "circ",
      x: 18,
      y: 0,
      w: 10,
      h: 14,
      note: "Front door, coat closet, and the main stair running up and down through every level.",
      fixtures: [
        { label: "Stair up / down", x: 19, y: 2, w: 4.5, h: 11, kind: "built" },
        { label: "Coat closet", x: 24.5, y: 1, w: 3, h: 4, kind: "built" },
      ],
    },
    {
      id: "m-office",
      name: "Office",
      cat: "work",
      x: 28,
      y: 0,
      w: 20,
      h: 14,
      note: "Front-right room with a door, so calls stay out of the open living space.",
      fixtures: [
        { label: "Desk", x: 30, y: 2, w: 6.5, h: 2.5, kind: "soft" },
        { label: "Shelving", x: 28.4, y: 6.5, w: 1.8, h: 7, kind: "built" },
        { label: "Reading chair", x: 43.5, y: 9.5, w: 3.5, h: 3.5, kind: "soft" },
      ],
    },
    {
      id: "m-kitchen",
      name: "Kitchen",
      cat: "cook",
      x: 0,
      y: 14,
      w: 17,
      h: 16,
      note: "Runs straight into the dining room with no wall between them — one big open room.",
      openTo: ["m-dining", "m-family"],
      fixtures: [
        { label: "Perimeter counter", x: 0.4, y: 14.4, w: 2.5, h: 15, kind: "built" },
        { label: "Island", x: 5.5, y: 19.5, w: 10, h: 4, kind: "built" },
        { label: "Range", x: 0.4, y: 21, w: 2.5, h: 2.5, kind: "plumb" },
        { label: "Refrigerator", x: 4, y: 14.4, w: 3, h: 2.5, kind: "built" },
      ],
    },
    {
      id: "m-dining",
      name: "Dining Room",
      cat: "cook",
      x: 17,
      y: 14,
      w: 17,
      h: 16,
      note: "Open on three sides — kitchen to the left, family room straight behind.",
      openTo: ["m-kitchen", "m-family"],
      fixtures: [
        { label: "Dining table (seats 10)", x: 20.5, y: 19, w: 10, h: 4.5, kind: "soft" },
        { label: "Sideboard", x: 18, y: 14.4, w: 6, h: 1.6, kind: "built" },
      ],
    },
    {
      id: "m-mud",
      name: "Pantry & Mudroom",
      cat: "service",
      x: 34,
      y: 14,
      w: 14,
      h: 16,
      note: "Walk-in pantry off the kitchen, rear entry with a bench and lockers.",
      fixtures: [
        { label: "Pantry shelving", x: 34.4, y: 15, w: 1.8, h: 7, kind: "built" },
        { label: "Bench & lockers", x: 40, y: 27.5, w: 7, h: 2, kind: "built" },
        { label: "Rear door", x: 45.5, y: 15, w: 2.2, h: 3, kind: "built" },
      ],
    },
    {
      id: "m-family",
      name: "Family Room",
      cat: "living",
      x: 0,
      y: 30,
      w: REAR_BUMP_WIDTH,
      h: REAR_BUMP_DEPTH,
      note: "The rear bump-out. Kitchen and dining lead straight into it; couch faces the fireplace on the back wall.",
      openTo: ["m-kitchen", "m-dining"],
      fixtures: [
        { label: "Sectional couch", x: 4, y: 32.5, w: 14, h: 3.5, kind: "soft" },
        { label: "Coffee table", x: 7.5, y: 37, w: 5.5, h: 2.5, kind: "soft" },
        { label: "Fireplace & TV", x: 5, y: 40.6, w: 12, h: 1.2, kind: "built" },
        { label: "Armchair", x: 24, y: 33.5, w: 3.5, h: 3.5, kind: "soft" },
        { label: "Armchair", x: 24, y: 38, w: 3.5, h: 3.5, kind: "soft" },
      ],
    },
  ],
};

/* ==========================================================================
 *  UPPER LEVEL — reached by the stairs up: master suite, two bedrooms and
 *  one bathroom off the hall.
 * ========================================================================== */
const upper: Level = {
  id: "upper",
  name: "Upper Level",
  subtitle: "Master + 2 bedrooms",
  ceiling: 9,
  rooms: [
    {
      id: "u-bed2",
      name: "Bedroom 2",
      cat: "sleep",
      x: 0,
      y: 0,
      w: 18,
      h: 14,
      note: "Front-left bedroom with its own closet wall.",
      fixtures: [
        { label: "Queen bed", x: 5.5, y: 1, w: 5.5, h: 7, kind: "soft" },
        { label: "Closet", x: 0.4, y: 10.5, w: 7, h: 2.5, kind: "built" },
        { label: "Dresser", x: 15.5, y: 4, w: 2, h: 5, kind: "soft" },
      ],
    },
    {
      id: "u-landing",
      name: "Stair Landing",
      cat: "circ",
      x: 18,
      y: 0,
      w: 10,
      h: 14,
      note: "Stairs down to the main level and up to the art studio, plus the hall running back to the master.",
      fixtures: [
        { label: "Stair down", x: 19, y: 2, w: 4.5, h: 11, kind: "built" },
        { label: "Stair up to studio", x: 24, y: 2, w: 3.5, h: 11, kind: "built" },
      ],
    },
    {
      id: "u-bed3",
      name: "Bedroom 3",
      cat: "sleep",
      x: 28,
      y: 0,
      w: 20,
      h: 14,
      note: "Front-right bedroom, large enough for a desk as well as the bed.",
      fixtures: [
        { label: "Queen bed", x: 35, y: 1, w: 5.5, h: 7, kind: "soft" },
        { label: "Closet", x: 28.4, y: 10.5, w: 7, h: 2.5, kind: "built" },
        { label: "Desk", x: 44.5, y: 3, w: 3, h: 5, kind: "soft" },
      ],
    },
    {
      id: "u-mcloset",
      name: "Master Walk-in Closet",
      cat: "sleep",
      x: 0,
      y: 14,
      w: 18,
      h: 8,
      note: "Full-width closet buffering the master bedroom from the front bedrooms.",
      fixtures: [
        { label: "Hanging", x: 0.4, y: 14.4, w: 17, h: 2, kind: "built" },
        { label: "Drawer island", x: 6, y: 18, w: 6, h: 2.5, kind: "built" },
      ],
    },
    {
      id: "u-hall",
      name: "Hall",
      cat: "circ",
      x: 18,
      y: 14,
      w: 10,
      h: 8,
      note: "Connects the landing, the hall bathroom, the laundry and the master suite door.",
    },
    {
      id: "u-hallbath",
      name: "Hall Bathroom",
      cat: "bath",
      x: 28,
      y: 14,
      w: 10,
      h: 8,
      note: "The shared bathroom off the hall, serving both front bedrooms.",
      fixtures: [
        { label: "Double vanity", x: 28.5, y: 14.4, w: 5.5, h: 2, kind: "plumb" },
        { label: "Tub / shower", x: 28.5, y: 19.4, w: 5, h: 2.5, kind: "plumb" },
        { label: "Toilet", x: 35, y: 19, w: 2.5, h: 2.5, kind: "plumb" },
      ],
    },
    {
      id: "u-laundry",
      name: "Laundry",
      cat: "service",
      x: 38,
      y: 14,
      w: 10,
      h: 8,
      note: "On the bedroom level, next to the hall bathroom's plumbing wall.",
      fixtures: [
        { label: "Washer & dryer", x: 38.5, y: 14.4, w: 5.5, h: 2.5, kind: "plumb" },
        { label: "Folding counter", x: 38.5, y: 19, w: 7, h: 2, kind: "built" },
      ],
    },
    {
      id: "u-master",
      name: "Master Bedroom",
      cat: "sleep",
      x: 0,
      y: 22,
      w: 26,
      h: 20,
      note: "Same 20 ft length as the master bathroom but much wider, spanning the whole rear bump-out.",
      fixtures: [
        { label: "King bed", x: 9.5, y: 22.5, w: 6.6, h: 7, kind: "soft" },
        { label: "Nightstand", x: 7.6, y: 22.5, w: 1.6, h: 1.8, kind: "soft" },
        { label: "Nightstand", x: 16.4, y: 22.5, w: 1.6, h: 1.8, kind: "soft" },
        { label: "Dresser", x: 0.4, y: 30, w: 2, h: 6, kind: "soft" },
        { label: "Sitting sofa", x: 4.5, y: 38.5, w: 8, h: 3, kind: "soft" },
        { label: "Armchair", x: 18, y: 36.5, w: 3.5, h: 3.5, kind: "soft" },
      ],
    },
    {
      id: "u-mbath",
      name: "Master Bathroom",
      cat: "bath",
      x: 26,
      y: 22,
      w: 8,
      h: 20,
      note: "Internal to the master bedroom — one door, no hall access. 20 ft long by 8 ft wide, as specified.",
      fixtures: [
        { label: "Double vanity", x: 26.4, y: 22.5, w: 7.2, h: 2.2, kind: "plumb" },
        { label: "Water closet", x: 26.4, y: 25.5, w: 3.2, h: 4, kind: "plumb" },
        { label: "Soaking tub", x: 30.3, y: 26, w: 3.3, h: 5.5, kind: "plumb" },
        { label: "Linen", x: 26.4, y: 32, w: 2, h: 3.5, kind: "built" },
        { label: "Walk-in shower", x: 26.4, y: 36.5, w: 7.2, h: 5, kind: "plumb" },
      ],
    },
    {
      id: "u-linen",
      name: "Linen & Storage",
      cat: "service",
      x: 34,
      y: 22,
      w: 14,
      h: 8,
      note: "Fills out the back-right corner of the main rectangle behind the laundry.",
      fixtures: [{ label: "Shelving", x: 34.4, y: 22.5, w: 13, h: 2, kind: "built" }],
    },
  ],
};

/* ==========================================================================
 *  TOP LEVEL — the art studio.
 * ========================================================================== */
const studio: Level = {
  id: "studio",
  name: "Art Studio",
  subtitle: "Top floor",
  ceiling: 12,
  rooms: [
    {
      id: "s-supply",
      name: "Supply & Storage",
      cat: "service",
      x: 0,
      y: 0,
      w: 18,
      h: 14,
      note: "Paper, stretcher bar and finished-work storage, out of the daylight.",
      fixtures: [
        { label: "Flat files", x: 0.4, y: 1, w: 2.5, h: 8, kind: "built" },
        { label: "Paper storage", x: 5, y: 0.4, w: 8, h: 2, kind: "built" },
      ],
    },
    {
      id: "s-landing",
      name: "Stair Landing",
      cat: "circ",
      x: 18,
      y: 0,
      w: 10,
      h: 14,
      note: "Top of the stairs from the bedroom level.",
      fixtures: [{ label: "Stair down", x: 24, y: 2, w: 3.5, h: 11, kind: "built" }],
    },
    {
      id: "s-wash",
      name: "Wash-Up & Kiln",
      cat: "service",
      x: 28,
      y: 0,
      w: 20,
      h: 14,
      note: "Wet zone kept separate from the studio floor — deep sink, kiln, glaze shelving.",
      fixtures: [
        { label: "Utility sink", x: 28.5, y: 0.5, w: 4, h: 2.4, kind: "plumb" },
        { label: "Kiln", x: 43.5, y: 1, w: 4, h: 4, kind: "built" },
        { label: "Glaze shelving", x: 28.5, y: 11.5, w: 9, h: 1.8, kind: "built" },
      ],
    },
    {
      id: "s-studio",
      name: "Art Studio",
      cat: "work",
      x: 0,
      y: 14,
      w: 48,
      h: 16,
      note: "Full 48 ft width, 12 ft ceiling, open straight through to the north-light alcove behind.",
      openTo: ["s-alcove"],
      fixtures: [
        { label: "Work table", x: 8, y: 19, w: 10, h: 4, kind: "soft" },
        { label: "Easel", x: 22, y: 16, w: 2.5, h: 2.5, kind: "soft" },
        { label: "Easel", x: 26, y: 16, w: 2.5, h: 2.5, kind: "soft" },
        { label: "Easel", x: 30, y: 16, w: 2.5, h: 2.5, kind: "soft" },
        { label: "Canvas storage", x: 43.5, y: 15, w: 4, h: 11, kind: "built" },
      ],
    },
    {
      id: "s-alcove",
      name: "North-Light Alcove",
      cat: "work",
      x: 0,
      y: 30,
      w: REAR_BUMP_WIDTH,
      h: REAR_BUMP_DEPTH,
      note: "The rear bump-out, glazed along the back wall for even light. Drafting and drying live here.",
      openTo: ["s-studio"],
      fixtures: [
        { label: "Drafting table", x: 4, y: 33, w: 6, h: 3.5, kind: "soft" },
        { label: "Drying rack", x: 13, y: 33, w: 6, h: 2.5, kind: "built" },
        { label: "Print station", x: 23, y: 33.5, w: 7, h: 3, kind: "soft" },
        { label: "Window seat", x: 2, y: 40.4, w: 15, h: 1.4, kind: "built" },
      ],
    },
  ],
};

/** Bottom of the house to the top, in the order the tabs appear. */
export const LEVELS: Level[] = [basement, main, upper, studio];

export const roomArea = (r: Room) => r.w * r.h;

/** `20` → `20'-0"`, `4.5` → `4'-6"`. */
export function ftIn(v: number): string {
  const sign = v < 0 ? "-" : "";
  const a = Math.abs(v);
  let feet = Math.floor(a + 1e-6);
  let inches = Math.round((a - feet) * 12);
  if (inches === 12) {
    feet += 1;
    inches = 0;
  }
  return `${sign}${feet}'-${inches}"`;
}

/** Shared wall segment between two rooms, or null if they do not touch. */
export function sharedWall(a: Room, b: Room) {
  const eps = 1e-6;
  const touchesV =
    Math.abs(a.x + a.w - b.x) < eps ? a.x + a.w : Math.abs(b.x + b.w - a.x) < eps ? b.x + b.w : null;
  if (touchesV !== null) {
    const lo = Math.max(a.y, b.y);
    const hi = Math.min(a.y + a.h, b.y + b.h);
    if (hi - lo > eps) return { ax: touchesV, ay: lo, bx: touchesV, by: hi };
  }
  const touchesH =
    Math.abs(a.y + a.h - b.y) < eps ? a.y + a.h : Math.abs(b.y + b.h - a.y) < eps ? b.y + b.h : null;
  if (touchesH !== null) {
    const lo = Math.max(a.x, b.x);
    const hi = Math.min(a.x + a.w, b.x + b.w);
    if (hi - lo > eps) return { ax: lo, ay: touchesH, bx: hi, by: touchesH };
  }
  return null;
}

/** Every interior wall on a level, flagged as a solid wall or a cased opening. */
export function interiorWalls(level: Level) {
  const out: { ax: number; ay: number; bx: number; by: number; open: boolean }[] = [];
  for (let i = 0; i < level.rooms.length; i++) {
    for (let j = i + 1; j < level.rooms.length; j++) {
      const a = level.rooms[i];
      const b = level.rooms[j];
      const seg = sharedWall(a, b);
      if (!seg) continue;
      const open = !!(a.openTo?.includes(b.id) || b.openTo?.includes(a.id));
      out.push({ ...seg, open });
    }
  }
  return out;
}
