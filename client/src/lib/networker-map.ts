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
