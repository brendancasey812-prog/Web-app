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
 *  Fixtures and doors use the same absolute floor coordinates, not
 *  room-relative ones. A door sits on the wall line it cuts through.
 *
 *  A room marked `exterior` is an unroofed slab outside the wall line — the
 *  balcony pad off the basement master. It is drawn and dimensioned, but it
 *  does not count toward a level's floor area.
 * ============================================================================
 */

/** Overall footprint. Edit these and every level resizes with them. */
export const HOUSE_WIDTH = 48; // ft, side to side
export const MAIN_DEPTH = 30; // ft, front wall to the back of the main rectangle
export const REAR_BUMP_WIDTH = 34; // ft, width of everything behind the main rectangle
/** First rear band, straight off the main rectangle: family room, man cave bump. */
export const REAR_BAND_DEPTH = 12;
/** Second rear band beyond it: master wing, guest suite, roof terrace. */
export const REAR_WING_DEPTH = 20;
/** Both bands together — how far the rear block runs behind the main rectangle. */
export const REAR_BUMP_DEPTH = REAR_BAND_DEPTH + REAR_WING_DEPTH; // 32 ft

/**
 * The three lower levels share one envelope. Where a level does not need
 * rooms all the way to the back, it fills the rest with a balcony rather than
 * stepping the wall in — so basement, main and upper stack as one clean box.
 */
export const FULL_DEPTH = MAIN_DEPTH + REAR_BUMP_DEPTH; // 62 ft
/** The art studio is the one level allowed to be smaller. */
export const STUDIO_DEPTH = 42;
/** The deepest the house gets, used for the overall envelope. */
export const HOUSE_DEPTH = FULL_DEPTH;

/**
 * The exterior wall line, walked clockwise from the front-left corner: the
 * same shape at every level — a rectangle with the extra room across the back
 * — stopping short only on the studio floor.
 */
const footprintOfDepth = (depth: number): [number, number][] => [
  [0, 0],
  [HOUSE_WIDTH, 0],
  [HOUSE_WIDTH, MAIN_DEPTH],
  [REAR_BUMP_WIDTH, MAIN_DEPTH],
  [REAR_BUMP_WIDTH, depth],
  [0, depth],
];

/** Basement, main level and upper level — one uniform envelope. */
export const FOOTPRINT_FULL = footprintOfDepth(FULL_DEPTH);
/** The art studio, which stops at the back of the first rear block. */
export const FOOTPRINT_STUDIO = footprintOfDepth(STUDIO_DEPTH);

/** Gross area inside the wall line of a full-depth level, in square feet. */
export const FULL_FLOOR_AREA =
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
  /** An unroofed slab outside the wall line. Drawn, but not floor area. */
  exterior?: boolean;
  fixtures?: Fixture[];
}

/**
 * A door, drawn the way a plan draws one: a gap in the wall, the leaf, and the
 * quarter-circle arc it sweeps.
 *
 *   `x`, `y`   the hinge, sitting on the wall line
 *   `axis`     "h" if the wall runs left-to-right, "v" if it runs front-to-back
 *   `w`        clear width of the opening, feet — also the radius of the swing
 *   `hand`     which way along the wall the opening runs from the hinge (+1/-1)
 *   `swing`    which side of the wall the leaf opens into (+1/-1)
 */
export interface Door {
  x: number;
  y: number;
  axis: "h" | "v";
  w: number;
  hand: 1 | -1;
  swing: 1 | -1;
  /** `opening` is a cased gap with no leaf; `slider` is a sliding glass door. */
  kind?: "door" | "opening" | "slider";
  label: string;
}

export interface Level {
  id: string;
  /** Tab label. */
  name: string;
  /** Small caption under the tab label. */
  subtitle: string;
  /** Finished ceiling height, feet. */
  ceiling: number;
  /** This level's exterior wall line — the main level reaches further back. */
  footprint: [number, number][];
  rooms: Room[];
  doors: Door[];
}

/* ==========================================================================
 *  BASEMENT — laundry at the front, man cave across the middle, then the home
 *  theatre and a guest suite filling the rear block, so the level matches the
 *  main floor's envelope exactly.
 * ========================================================================== */
const basement: Level = {
  id: "basement",
  name: "Basement",
  subtitle: "Man cave · theatre · guest suite",
  ceiling: 8.5,
  footprint: FOOTPRINT_FULL,
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
      note: "The man cave's own full bathroom — shower, toilet and vanity, off the stair landing.",
      fixtures: [
        { label: "Shower", x: 28.5, y: 0.5, w: 4, h: 4, kind: "plumb" },
        { label: "Toilet", x: 28.5, y: 6, w: 2.5, h: 2.5, kind: "plumb" },
        { label: "Vanity", x: 34.5, y: 0.5, w: 3, h: 6, kind: "plumb" },
      ],
    },
    {
      id: "b-laundry",
      name: "Laundry",
      cat: "service",
      x: 38,
      y: 0,
      w: 10,
      h: 14,
      note: "The house laundry, on the bottom floor. Deep enough for a folding counter and a drying rack as well as the machines.",
      fixtures: [
        { label: "Washer & dryer", x: 38.5, y: 0.5, w: 5.5, h: 2.5, kind: "plumb" },
        { label: "Utility sink", x: 44.6, y: 0.5, w: 2.8, h: 2.2, kind: "plumb" },
        { label: "Folding counter", x: 38.5, y: 5, w: 7, h: 2, kind: "built" },
        { label: "Drying rack", x: 38.5, y: 10, w: 6, h: 1.6, kind: "built" },
      ],
    },
    {
      id: "b-mancave",
      name: "Man Cave",
      cat: "living",
      x: 0,
      y: 14,
      w: 48,
      h: 16,
      note: "One long room across the whole width — screen and sectional at one end, pool table and wet bar at the other.",
      fixtures: [
        { label: "Media wall", x: 7, y: 14.4, w: 11, h: 1, kind: "built" },
        { label: "Coffee table", x: 9.5, y: 19.5, w: 5, h: 2.5, kind: "soft" },
        { label: "Sectional couch", x: 6, y: 23, w: 13, h: 3.5, kind: "soft" },
        { label: "Pool table", x: 24, y: 18.5, w: 9, h: 4.5, kind: "soft" },
        { label: "Recliners", x: 40, y: 17, w: 6, h: 3.5, kind: "soft" },
        { label: "Bar stools", x: 24, y: 25, w: 14, h: 1.4, kind: "soft" },
        { label: "Bar counter", x: 24, y: 26.5, w: 14, h: 2.5, kind: "built" },
        { label: "Beverage fridge", x: 39, y: 26.5, w: 3, h: 2.5, kind: "built" },
      ],
    },
    {
      id: "b-theater",
      name: "Home Theatre",
      cat: "living",
      x: 0,
      y: 30,
      w: 34,
      h: 14,
      note: "Behind the man cave, on its own door so the light can be shut out. Two rows of recliners facing the screen wall.",
      fixtures: [
        { label: "Screen wall", x: 8, y: 30.4, w: 18, h: 1, kind: "built" },
        { label: "Front row", x: 6, y: 34.5, w: 10, h: 3.5, kind: "soft" },
        { label: "Rear row", x: 18, y: 34.5, w: 10, h: 3.5, kind: "soft" },
        { label: "Snack counter", x: 6, y: 41, w: 12, h: 2, kind: "built" },
      ],
    },
    {
      id: "b-store",
      name: "Storage & Wine",
      cat: "service",
      x: 0,
      y: 44,
      w: 12,
      h: 18,
      note: "Cool corner at the back of the basement — wine racking and bulk shelving.",
      fixtures: [
        { label: "Wine racks", x: 0.4, y: 44.4, w: 1.8, h: 8, kind: "built" },
        { label: "Shelving", x: 0.4, y: 54, w: 10, h: 2, kind: "built" },
      ],
    },
    {
      id: "b-hall",
      name: "Guest Hall",
      cat: "circ",
      x: 12,
      y: 44,
      w: 10,
      h: 6,
      note: "Links the theatre to the guest suite, the bathroom and the stores.",
    },
    {
      id: "b-gbath",
      name: "Guest Bathroom",
      cat: "bath",
      x: 12,
      y: 50,
      w: 10,
      h: 12,
      note: "Off the guest hall, serving the guest bedroom.",
      fixtures: [
        { label: "Vanity", x: 12.5, y: 50.5, w: 5, h: 2.2, kind: "plumb" },
        { label: "Toilet", x: 12.5, y: 54, w: 2.5, h: 2.5, kind: "plumb" },
        { label: "Shower", x: 17, y: 57, w: 4.5, h: 4, kind: "plumb" },
      ],
    },
    {
      id: "b-guest",
      name: "Guest Bedroom",
      cat: "sleep",
      x: 22,
      y: 44,
      w: 12,
      h: 18,
      note: "The bedroom on the lower level, at the back of the basement with the guest bathroom across the hall.",
      fixtures: [
        { label: "Queen bed", x: 25, y: 44.5, w: 5.5, h: 7, kind: "soft" },
        { label: "Nightstand", x: 23.2, y: 44.5, w: 1.6, h: 1.8, kind: "soft" },
        { label: "Dresser", x: 31.6, y: 50, w: 2, h: 5, kind: "soft" },
        { label: "Closet", x: 22.4, y: 58.5, w: 8, h: 2.5, kind: "built" },
      ],
    },
  ],
  doors: [
    { x: 18, y: 3, axis: "v", w: 3, hand: 1, swing: -1, label: "Mechanical & Storage" },
    { x: 28, y: 3, axis: "v", w: 2.8, hand: 1, swing: 1, label: "Bathroom" },
    { x: 21, y: 14, axis: "h", w: 6, hand: 1, swing: 1, kind: "opening", label: "Landing into the man cave" },
    { x: 41, y: 14, axis: "h", w: 3, hand: 1, swing: -1, label: "Laundry" },
    { x: 15, y: 30, axis: "h", w: 3.5, hand: 1, swing: 1, label: "Home theatre" },
    { x: 15, y: 44, axis: "h", w: 3, hand: 1, swing: 1, label: "Guest hall" },
    { x: 12, y: 45, axis: "v", w: 3, hand: 1, swing: -1, label: "Storage & wine" },
    { x: 22, y: 45, axis: "v", w: 3, hand: 1, swing: 1, label: "Guest bedroom" },
    { x: 14, y: 50, axis: "h", w: 2.8, hand: 1, swing: 1, label: "Guest bathroom" },
  ],
};

/* ==========================================================================
 *  MAIN LEVEL — gym at the front, open kitchen + dining running back into the
 *  family room, and then, through a hall behind it, the master suite in a
 *  single-storey wing at the very back of the house.
 * ========================================================================== */
const main: Level = {
  id: "main",
  name: "Main Level",
  subtitle: "Kitchen · family · master suite",
  ceiling: 10,
  footprint: FOOTPRINT_FULL,
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
      id: "m-living",
      name: "Living Room",
      cat: "living",
      x: 28,
      y: 0,
      w: 20,
      h: 14,
      note: "Front-right sitting room, taking the space the office left when it moved up to the top floor.",
      fixtures: [
        { label: "Sofa", x: 30, y: 1, w: 8, h: 3, kind: "soft" },
        { label: "Coffee table", x: 32, y: 5.5, w: 4.5, h: 2.5, kind: "soft" },
        { label: "Shelving", x: 28.4, y: 9.5, w: 1.8, h: 4, kind: "built" },
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
      ],
    },
    {
      id: "m-family",
      name: "Family Room",
      cat: "living",
      x: 0,
      y: 30,
      w: REAR_BUMP_WIDTH,
      h: REAR_BAND_DEPTH,
      note: "The first rear band. Kitchen and dining lead straight into it; couch faces the fireplace, and the master hall opens off the back wall.",
      openTo: ["m-kitchen", "m-dining"],
      fixtures: [
        { label: "Sectional couch", x: 4, y: 32.5, w: 14, h: 3.5, kind: "soft" },
        { label: "Coffee table", x: 7.5, y: 37, w: 5.5, h: 2.5, kind: "soft" },
        { label: "Fireplace & TV", x: 5, y: 40.6, w: 12, h: 1.2, kind: "built" },
        { label: "Armchair", x: 24, y: 33.5, w: 3.5, h: 3.5, kind: "soft" },
        { label: "Armchair", x: 24, y: 38, w: 3.5, h: 3.5, kind: "soft" },
      ],
    },

    /* ---- The master wing: through the family room, down the hall. -------- */
    {
      id: "m-mcloset",
      name: "Master Walk-in Closet",
      cat: "sleep",
      x: 0,
      y: 42,
      w: 12,
      h: 6,
      note: "Off the master hall, so it does not eat into the bedroom.",
      fixtures: [{ label: "Hanging", x: 0.4, y: 42.4, w: 11, h: 2, kind: "built" }],
    },
    {
      id: "m-mhall",
      name: "Master Hall",
      cat: "circ",
      x: 12,
      y: 42,
      w: 10,
      h: 6,
      note: "The short hall that separates the master suite from the family room.",
    },
    {
      id: "m-mlinen",
      name: "Linen & Storage",
      cat: "service",
      x: 22,
      y: 42,
      w: 12,
      h: 6,
      note: "Linen store on the other side of the master hall.",
      fixtures: [{ label: "Shelving", x: 22.4, y: 42.4, w: 11, h: 2, kind: "built" }],
    },
    {
      id: "m-master",
      name: "Master Bedroom",
      cat: "sleep",
      x: 0,
      y: 48,
      w: 22,
      h: 14,
      note: "At the very back of the house, past the family room and down the hall. A slider in the rear wall opens onto the master patio, with the roof terrace one floor above it.",
      fixtures: [
        { label: "King bed", x: 7, y: 48.5, w: 6.6, h: 7, kind: "soft" },
        { label: "Nightstand", x: 5.2, y: 48.5, w: 1.6, h: 1.8, kind: "soft" },
        { label: "Nightstand", x: 14, y: 48.5, w: 1.6, h: 1.8, kind: "soft" },
        { label: "Dresser", x: 0.4, y: 54, w: 1.8, h: 5, kind: "soft" },
        { label: "Armchair", x: 17.5, y: 51, w: 3.5, h: 3.5, kind: "soft" },
        { label: "Sitting bench", x: 5, y: 57.5, w: 7, h: 2, kind: "soft" },
      ],
    },
    {
      id: "m-mbath",
      name: "Master Bathroom",
      cat: "bath",
      x: 22,
      y: 48,
      w: 12,
      h: 14,
      note: "Internal to the master bedroom — one door, no access from the hall.",
      fixtures: [
        { label: "Double vanity", x: 22.5, y: 48.5, w: 7, h: 2.2, kind: "plumb" },
        { label: "Water closet", x: 30.5, y: 48.5, w: 3, h: 4, kind: "plumb" },
        { label: "Soaking tub", x: 22.5, y: 52.5, w: 5.5, h: 3, kind: "plumb" },
        { label: "Linen", x: 30.5, y: 53.5, w: 3, h: 3, kind: "built" },
        { label: "Walk-in shower", x: 22.5, y: 57, w: 6, h: 4.5, kind: "plumb" },
      ],
    },
    {
      id: "m-pad",
      name: "Master Patio",
      cat: "living",
      x: 0,
      y: 62,
      w: 22,
      h: 10,
      exterior: true,
      note: "The master's own outdoor slab, at grade behind the rear wall. It is paving rather than a floor, so it sits outside the uniform envelope and is not counted in the floor area.",
      fixtures: [
        { label: "Outdoor sofa", x: 2.5, y: 64, w: 8, h: 3, kind: "soft" },
        { label: "Fire table", x: 12.5, y: 64.5, w: 4, h: 4, kind: "soft" },
        { label: "Loungers", x: 2.5, y: 68.5, w: 6, h: 2.5, kind: "soft" },
      ],
    },
  ],
  doors: [
    { x: 21, y: 0, axis: "h", w: 3.5, hand: 1, swing: 1, label: "Front door" },
    { x: 18, y: 3, axis: "v", w: 3, hand: 1, swing: -1, label: "Gym" },
    { x: 28, y: 3, axis: "v", w: 3, hand: 1, swing: 1, label: "Living room" },
    { x: 21, y: 14, axis: "h", w: 5, hand: 1, swing: 1, kind: "opening", label: "Foyer into the dining room" },
    { x: 34, y: 16, axis: "v", w: 3, hand: 1, swing: 1, label: "Pantry & mudroom" },
    { x: 48, y: 17, axis: "v", w: 3, hand: 1, swing: -1, label: "Side entry" },
    { x: 15, y: 42, axis: "h", w: 3.5, hand: 1, swing: 1, label: "Master hall, off the family room" },
    { x: 12, y: 43.5, axis: "v", w: 3, hand: 1, swing: -1, label: "Master walk-in closet" },
    { x: 22, y: 43.5, axis: "v", w: 2.8, hand: 1, swing: 1, label: "Linen & storage" },
    { x: 14, y: 48, axis: "h", w: 3.5, hand: 1, swing: 1, label: "Master bedroom" },
    { x: 22, y: 50, axis: "v", w: 3, hand: 1, swing: 1, label: "Master bathroom" },
    { x: 6, y: 62, axis: "h", w: 6, hand: 1, swing: 1, kind: "slider", label: "Slider to the master patio" },
  ],
};

/* ==========================================================================
 *  UPPER LEVEL — the two bedrooms and the hall bathroom at the front, a game
 *  room and the office through the middle, and a roof terrace over the master
 *  wing filling out the back so this level matches the envelope below.
 * ========================================================================== */
const upper: Level = {
  id: "upper",
  name: "Upper Level",
  subtitle: "2 bedrooms · game room · terrace",
  ceiling: 9,
  footprint: FOOTPRINT_FULL,
  rooms: [
    {
      id: "u-bed2",
      name: "Bedroom 2",
      cat: "sleep",
      x: 0,
      y: 0,
      w: 18,
      h: 14,
      note: "Front-left bedroom, with its own walk-in closet through the back wall.",
      fixtures: [
        { label: "Queen bed", x: 5.5, y: 1, w: 5.5, h: 7, kind: "soft" },
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
      note: "Stairs down to the main level and up to the art studio, opening back into the hall.",
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
      id: "u-b2closet",
      name: "Bedroom 2 Closet",
      cat: "sleep",
      x: 0,
      y: 14,
      w: 10,
      h: 8,
      note: "Walk-in closet entered from Bedroom 2.",
      fixtures: [{ label: "Hanging", x: 0.4, y: 14.4, w: 9, h: 2, kind: "built" }],
    },
    {
      id: "u-hall",
      name: "Hall",
      cat: "circ",
      x: 10,
      y: 14,
      w: 28,
      h: 8,
      note: "Runs the width of the floor, from the office door across to the hall bathroom, with the game room opening off the back of it.",
    },
    {
      id: "u-hallbath",
      name: "Hall Bathroom",
      cat: "bath",
      x: 38,
      y: 14,
      w: 10,
      h: 8,
      note: "The shared bathroom off the hall, serving both front bedrooms.",
      fixtures: [
        { label: "Double vanity", x: 38.5, y: 14.4, w: 5.5, h: 2, kind: "plumb" },
        { label: "Tub / shower", x: 38.5, y: 19.4, w: 5, h: 2.5, kind: "plumb" },
        { label: "Toilet", x: 45, y: 19, w: 2.5, h: 2.5, kind: "plumb" },
      ],
    },
    {
      id: "u-office",
      name: "Office",
      cat: "work",
      x: 0,
      y: 22,
      w: 14,
      h: 26,
      note: "The house office, on the top floor with a door off the hall so calls stay out of the way.",
      fixtures: [
        { label: "Desk", x: 3.5, y: 23, w: 6.5, h: 2.5, kind: "soft" },
        { label: "Shelving", x: 0.4, y: 27, w: 1.8, h: 8, kind: "built" },
        { label: "Meeting table", x: 4, y: 36, w: 7, h: 4, kind: "soft" },
        { label: "Reading chair", x: 9.5, y: 43, w: 3.5, h: 3.5, kind: "soft" },
      ],
    },
    {
      id: "u-game",
      name: "Game Room",
      cat: "living",
      x: 14,
      y: 22,
      w: 20,
      h: 26,
      note: "Over the family room below — table, screen and seating, with a slider straight out onto the roof terrace.",
      fixtures: [
        { label: "Media wall", x: 16, y: 22.4, w: 10, h: 1, kind: "built" },
        { label: "Sofa", x: 16, y: 27, w: 9, h: 3, kind: "soft" },
        { label: "Games table", x: 17, y: 32, w: 9, h: 5, kind: "soft" },
        { label: "Arcade cabinets", x: 30, y: 24, w: 3.5, h: 7, kind: "built" },
        { label: "Bar cart", x: 29.5, y: 43.5, w: 4, h: 2.5, kind: "soft" },
      ],
    },
    {
      id: "u-terrace",
      name: "Roof Terrace",
      cat: "living",
      x: 0,
      y: 48,
      w: 34,
      h: 14,
      exterior: true,
      note: "The balcony that squares this level off with the two below: an open deck on the roof of the master wing, so the envelope stays 48 ft by 62 ft without carrying rooms it does not need.",
      fixtures: [
        { label: "Outdoor sofa", x: 4, y: 50, w: 9, h: 3, kind: "soft" },
        { label: "Fire table", x: 15.5, y: 50.5, w: 4, h: 4, kind: "soft" },
        { label: "Loungers", x: 4, y: 55, w: 7, h: 2.5, kind: "soft" },
        { label: "Planters", x: 28.5, y: 50, w: 4, h: 10, kind: "built" },
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
      note: "Linen and household storage, opening off the back of the hall.",
      fixtures: [{ label: "Shelving", x: 34.4, y: 22.4, w: 13, h: 2, kind: "built" }],
    },
  ],
  doors: [
    { x: 18, y: 3, axis: "v", w: 3, hand: 1, swing: -1, label: "Bedroom 2" },
    { x: 28, y: 3, axis: "v", w: 3, hand: 1, swing: 1, label: "Bedroom 3" },
    { x: 21, y: 14, axis: "h", w: 6, hand: 1, swing: 1, kind: "opening", label: "Landing into the hall" },
    { x: 4, y: 14, axis: "h", w: 3, hand: 1, swing: 1, label: "Bedroom 2 closet" },
    { x: 38, y: 16, axis: "v", w: 2.8, hand: 1, swing: 1, label: "Hall bathroom" },
    { x: 10.5, y: 22, axis: "h", w: 3, hand: 1, swing: 1, label: "Office" },
    { x: 18, y: 22, axis: "h", w: 6, hand: 1, swing: 1, kind: "opening", label: "Hall into the game room" },
    { x: 34.5, y: 22, axis: "h", w: 3, hand: 1, swing: 1, label: "Linen & storage" },
    { x: 20, y: 48, axis: "h", w: 6, hand: 1, swing: 1, kind: "slider", label: "Slider to the roof terrace" },
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
  footprint: FOOTPRINT_STUDIO,
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
      h: REAR_BAND_DEPTH,
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
  doors: [
    { x: 18, y: 3, axis: "v", w: 3, hand: 1, swing: -1, label: "Supply & storage" },
    { x: 28, y: 3, axis: "v", w: 3, hand: 1, swing: 1, label: "Wash-up & kiln" },
    { x: 20, y: 14, axis: "h", w: 8, hand: 1, swing: 1, kind: "opening", label: "Landing into the studio" },
  ],
};

/** Bottom of the house to the top, in the order the tabs appear. */
export const LEVELS: Level[] = [basement, main, upper, studio];


export const roomArea = (r: Room) => r.w * r.h;

/** Enclosed floor area of a level — the balcony pad and any other slab is not it. */
export function levelArea(l: Level) {
  return l.rooms.reduce((sum, r) => (r.exterior ? sum : sum + roomArea(r)), 0);
}

/** The bounding box of a level's wall line. */
export function footprintBounds(l: Level) {
  const xs = l.footprint.map((p) => p[0]);
  const ys = l.footprint.map((p) => p[1]);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
  };
}

/** Everything that has to fit on the sheet, including slabs outside the walls. */
export function levelBounds(l: Level) {
  const f = footprintBounds(l);
  let x0 = f.x, y0 = f.y, x1 = f.x + f.w, y1 = f.y + f.h;
  for (const r of l.rooms) {
    x0 = Math.min(x0, r.x);
    y0 = Math.min(y0, r.y);
    x1 = Math.max(x1, r.x + r.w);
    y1 = Math.max(y1, r.y + r.h);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

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
  const out: {
    ax: number;
    ay: number;
    bx: number;
    by: number;
    open: boolean;
    /** True where the wall separates heated rooms from a balcony or terrace. */
    outer: boolean;
  }[] = [];
  const rooms = level.rooms;
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i];
      const b = rooms[j];
      const seg = sharedWall(a, b);
      if (!seg) continue;
      /* Two slabs meeting each other is a paving joint, not a wall. */
      if (a.exterior && b.exterior) continue;
      const open = !!(a.openTo?.includes(b.id) || b.openTo?.includes(a.id));
      out.push({ ...seg, open, outer: !!(a.exterior || b.exterior) });
    }
  }
  return out;
}

/** The doors that open into a room — those whose hinge sits on its wall line. */
export function doorsForRoom(level: Level, room: Room): Door[] {
  const e = 1e-6;
  return level.doors.filter((d) => {
    const onV =
      (Math.abs(d.x - room.x) < e || Math.abs(d.x - (room.x + room.w)) < e) &&
      d.y > room.y - e &&
      d.y < room.y + room.h + e;
    const onH =
      (Math.abs(d.y - room.y) < e || Math.abs(d.y - (room.y + room.h)) < e) &&
      d.x > room.x - e &&
      d.x < room.x + room.w + e;
    return d.axis === "v" ? onV : onH;
  });
}

/** Every enclosed square foot in the house, across all four levels. */
export const TOTAL_AREA = LEVELS.reduce((sum, l) => sum + levelArea(l), 0);
