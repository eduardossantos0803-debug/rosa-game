/** Tile map of Escola Rosa Bonfiglioli. '#' wall, letters are named rooms, 'G' is the exit gate. */

export const TILE = 2;

export const MAP: string[] = [
  "####################################",
  "#DDDDDD#PPPPPP#111111#222222#333333#",
  "#DDDDDD#PPPPPP#111111#222222#333333#",
  "#DDDDDD#PPPPPP#111111#222222#333333#",
  "#DDDDDD#PPPPPP#111111#222222#333333#",
  "###  #####  #####  #####  #####  ###",
  "#                                  #",
  "#                                  #",
  "#                                  #",
  "###  ###  ####  ####################",
  "#BBBB#AAA#4444#HHHHHHHHHHHHHHHHHHHH#",
  "#BBBB#AAA#4444#HHHHHHHHHHHHHHHHHHHH#",
  "#BBBB#AAA#4444#HHHHHHHHHHHHHHHHHHHH#",
  "#BBBB#AAA#4444#HHHHHHHHHHHHH     HH#",
  "#############################GG#####",
];

export const MAP_H = MAP.length;
export const MAP_W = MAP[0].length;
export const WORLD_W = MAP_W * TILE;
export const WORLD_D = MAP_H * TILE;

export const ROOM_NAME: Record<string, string> = {
  D: "Diretoria",
  P: "Sala dos Professores",
  "1": "Sala 1",
  "2": "Sala 2",
  "3": "Sala 3",
  "4": "Sala 4",
  B: "Banheiro",
  A: "Almoxarifado",
  H: "Hall",
};

export type AABB = { minx: number; maxx: number; minz: number; maxz: number };

export function charAt(tx: number, tz: number): string {
  if (tz < 0 || tz >= MAP_H || tx < 0 || tx >= MAP_W) return "#";
  return MAP[tz][tx];
}

export function tileOf(x: number, z: number): { tx: number; tz: number } {
  return { tx: Math.floor(x / TILE), tz: Math.floor(z / TILE) };
}

export function tileCenter(tx: number, tz: number): { x: number; z: number } {
  return { x: (tx + 0.5) * TILE, z: (tz + 0.5) * TILE };
}

export function isWallChar(c: string, gateClosed: boolean): boolean {
  return c === "#" || (c === "G" && gateClosed);
}

export function isBlocked(x: number, z: number, gateClosed: boolean): boolean {
  const { tx, tz } = tileOf(x, z);
  return isWallChar(charAt(tx, tz), gateClosed);
}

export function findTiles(ch: string): { tx: number; tz: number }[] {
  const out: { tx: number; tz: number }[] = [];
  for (let tz = 0; tz < MAP_H; tz++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      if (MAP[tz][tx] === ch) out.push({ tx, tz });
    }
  }
  return out;
}

export function roomBounds(ch: string): AABB | null {
  const tiles = findTiles(ch);
  if (!tiles.length) return null;
  let minx = Infinity,
    maxx = -Infinity,
    minz = Infinity,
    maxz = -Infinity;
  for (const t of tiles) {
    minx = Math.min(minx, t.tx * TILE);
    maxx = Math.max(maxx, (t.tx + 1) * TILE);
    minz = Math.min(minz, t.tz * TILE);
    maxz = Math.max(maxz, (t.tz + 1) * TILE);
  }
  return { minx, maxx, minz, maxz };
}

export function spawnIn(ch: string): { x: number; z: number } {
  const tiles = findTiles(ch);
  const t = tiles[Math.floor(tiles.length / 2)] ?? { tx: 20, tz: 2 };
  return tileCenter(t.tx, t.tz);
}

/** Circle vs nearby wall tiles. Resolves penetration. */
export function resolveCircle(
  px: number,
  pz: number,
  r: number,
  gateClosed: boolean,
  extras: AABB[],
): { x: number; z: number } {
  let x = px;
  let z = pz;
  const tx0 = Math.floor(x / TILE);
  const tz0 = Math.floor(z / TILE);
  for (let tz = tz0 - 2; tz <= tz0 + 2; tz++) {
    for (let tx = tx0 - 2; tx <= tx0 + 2; tx++) {
      if (!isWallChar(charAt(tx, tz), gateClosed)) continue;
      const hit = pushOut(x, z, r, tx * TILE, tz * TILE, (tx + 1) * TILE, (tz + 1) * TILE);
      x = hit.x;
      z = hit.z;
    }
  }
  for (const b of extras) {
    const hit = pushOut(x, z, r, b.minx, b.minz, b.maxx, b.maxz);
    x = hit.x;
    z = hit.z;
  }
  return { x, z };
}

function pushOut(
  x: number,
  z: number,
  r: number,
  minx: number,
  minz: number,
  maxx: number,
  maxz: number,
): { x: number; z: number } {
  const cx = Math.max(minx, Math.min(x, maxx));
  const cz = Math.max(minz, Math.min(z, maxz));
  let dx = x - cx;
  let dz = z - cz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return { x, z };
  if (d2 < 1e-8) {
    const left = x - minx;
    const right = maxx - x;
    const top = z - minz;
    const bot = maxz - z;
    const m = Math.min(left, right, top, bot);
    if (m === left) return { x: minx - r, z };
    if (m === right) return { x: maxx + r, z };
    if (m === top) return { x, z: minz - r };
    return { x, z: maxz + r };
  }
  const d = Math.sqrt(d2);
  const pen = r - d;
  return { x: x + (dx / d) * pen, z: z + (dz / d) * pen };
}

export function lineOfSight(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  gateClosed: boolean,
): boolean {
  const dx = bx - ax;
  const dz = bz - az;
  const dist = Math.hypot(dx, dz);
  const steps = Math.max(2, Math.ceil(dist / 0.45));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (isBlocked(ax + dx * t, az + dz * t, gateClosed)) return false;
  }
  return true;
}

export type DoorInfo = { x: number; z: number; label: string; facing: "n" | "s" | "e" | "w" };

export function collectDoors(): DoorInfo[] {
  const doors: DoorInfo[] = [];
  for (let tz = 0; tz < MAP_H; tz++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      if (MAP[tz][tx] !== " ") continue;
      const n = charAt(tx, tz - 1);
      const s = charAt(tx, tz + 1);
      const e = charAt(tx + 1, tz);
      const w = charAt(tx - 1, tz);
      let label = "";
      let facing: DoorInfo["facing"] = "s";
      if (ROOM_NAME[n]) {
        label = ROOM_NAME[n];
        facing = "s";
      } else if (ROOM_NAME[s]) {
        label = ROOM_NAME[s];
        facing = "n";
      } else if (ROOM_NAME[e]) {
        label = ROOM_NAME[e];
        facing = "w";
      } else if (ROOM_NAME[w]) {
        label = ROOM_NAME[w];
        facing = "e";
      }
      if (!label) continue;
      if (doors.some((d) => d.label === label && Math.hypot(d.x - (tx + 0.5) * TILE, d.z - (tz + 0.5) * TILE) < 3)) {
        continue;
      }
      const c = tileCenter(tx, tz);
      doors.push({ x: c.x, z: c.z, label, facing });
    }
  }
  return doors;
}
