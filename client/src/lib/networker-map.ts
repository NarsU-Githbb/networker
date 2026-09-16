// The logical maze is shared data. The renderer turns each character into a
// DOM tile, while the game engine uses the same data for wall collision.
export const NETWORKER_MAP = [
  "#############",
  "#     #     #",
  "# ### # ### #",
  "# #       # #",
  "# # ##### # #",
  "#   #   #   #",
  "### # # # ###",
  "#   #   #   #",
  "# # ##### # #",
  "# #       # #",
  "# ### # ### #",
  "#     #     #",
  "#############",
] as const

// `#` cells are walls and space cells are walkable. Keep this layout as the
// single source of truth so rendering and collision detection use the same maze.

export const NETWORKER_MAP_ROWS = NETWORKER_MAP.length
export const NETWORKER_MAP_COLUMNS = NETWORKER_MAP[0].length

export function isNetworkerWall(row: number, col: number) {
  return NETWORKER_MAP[row]?.[col] === "#"
}

export function isNetworkerWalkable(row: number, col: number) {
  return NETWORKER_MAP[row]?.[col] === " "
}

export const NETWORKER_PLAYER_START = { row: 1, col: 1 }

// One walkable spawn per maze corner (the layout is symmetric, so all four
// are open floor tiles). Indexed by a player's seat - their stable position
// in the room's player list - so spawn corners stay consistent across
// clients without any extra coordination.
export const NETWORKER_SPAWN_POINTS = [
  { row: 1, col: 1 },
  { row: 1, col: NETWORKER_MAP_COLUMNS - 2 },
  { row: NETWORKER_MAP_ROWS - 2, col: 1 },
  { row: NETWORKER_MAP_ROWS - 2, col: NETWORKER_MAP_COLUMNS - 2 },
] as const

export function getSpawnPoint(seat: number) {
  return NETWORKER_SPAWN_POINTS[seat % NETWORKER_SPAWN_POINTS.length]
}
