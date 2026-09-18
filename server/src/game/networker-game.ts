import { randomUUID } from "node:crypto";

// Server-authoritative mirror of client/src/lib/networker-game.ts.
// Kept as a separate copy because the server and client are built as
// independent TS projects (different rootDir/module settings) - if this
// drifts from the client's shape, keep both in sync by hand.

export const WINNING_SCORE = 100;
export const MIN_CONNECTION_POINTS = 1;
export const MAX_CONNECTION_POINTS = 2;

// Mirrors client/src/lib/networker-map.ts's NETWORKER_MAP - needed here so
// random item spawns can be checked against walls without duplicating the
// whole client library on the server.
const NETWORKER_MAP = [
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
];

function isWalkableTile(row: number, col: number): boolean {
  return NETWORKER_MAP[row]?.[col] === " ";
}

// Flood-fills from a spawn corner so fully enclosed floor pockets (walkable
// tiles with no doorway in) are excluded - items must only spawn where a
// player can actually walk to collect them.
function findReachableCells(start: { row: number; col: number }): { row: number; col: number }[] {
  const visited = new Set<string>([`${start.row},${start.col}`]);
  const queue = [start];
  const reachable: { row: number; col: number }[] = [];

  while (queue.length > 0) {
    const cell = queue.shift();
    if (!cell) break;
    reachable.push(cell);

    for (const [deltaRow, deltaCol] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nextRow = cell.row + deltaRow;
      const nextCol = cell.col + deltaCol;
      const key = `${nextRow},${nextCol}`;
      if (isWalkableTile(nextRow, nextCol) && !visited.has(key)) {
        visited.add(key);
        queue.push({ row: nextRow, col: nextCol });
      }
    }
  }

  return reachable;
}

const WALKABLE_CELLS = findReachableCells({ row: 1, col: 1 });

export type GamePhase = "lobby" | "playing" | "paused" | "ended";

export type NetworkerPlayer = {
  username: string;
  score: number;
  row: number;
  col: number;
};

// One walkable spawn per maze corner - mirrors
// client/src/lib/networker-map.ts's NETWORKER_SPAWN_POINTS. The maze is
// 13x13 and symmetric, so all four corners are open floor tiles.
const SPAWN_POINTS = [
  { row: 1, col: 1 },
  { row: 1, col: 11 },
  { row: 11, col: 1 },
  { row: 11, col: 11 },
];

function getSpawnPoint(seat: number) {
  const spawnPoint = SPAWN_POINTS[seat % SPAWN_POINTS.length];
  if (!spawnPoint) throw new Error("SPAWN_POINTS is empty");
  return spawnPoint;
}

// "premium" items are the rare LinkedIn Premium pickup: a small points bonus,
// but their real value is the temporary speed boost the client applies to
// whoever collects one (see NetworkerMaze.tsx's speedBoostUntilRef).
export type NetworkerItemKind = "connection" | "premium";

export type NetworkerConnectionItem = {
  itemId: string;
  row: number;
  col: number;
  points: number;
  isCollected: boolean;
  kind: NetworkerItemKind;
};

export type NetworkerGameState = {
  phase: GamePhase;
  leadUsername: string;
  players: NetworkerPlayer[];
  connectionItems: NetworkerConnectionItem[];
  winnerUsername: string | null;
  // Server-authoritative elapsed match time, measured in whole seconds.
  elapsedTime: number;
  systemMessage: string | null;
};

// Same layout as client/src/lib/networker-map.ts's NETWORKER_MAP, so item
// row/col values line up with walkable floor tiles in the maze.
const INITIAL_CONNECTION_ITEMS: NetworkerConnectionItem[] = [
  { itemId: "c1", row: 1, col: 3, points: 1, isCollected: false, kind: "connection" },
  { itemId: "c2", row: 1, col: 9, points: 2, isCollected: false, kind: "connection" },
  { itemId: "c3", row: 3, col: 1, points: 1, isCollected: false, kind: "connection" },
  { itemId: "c4", row: 3, col: 7, points: 2, isCollected: false, kind: "connection" },
  { itemId: "c5", row: 5, col: 1, points: 1, isCollected: false, kind: "connection" },
  { itemId: "c6", row: 5, col: 9, points: 2, isCollected: false, kind: "connection" },
  { itemId: "c7", row: 7, col: 3, points: 1, isCollected: false, kind: "connection" },
  { itemId: "c8", row: 9, col: 7, points: 2, isCollected: false, kind: "connection" },
  { itemId: "c9", row: 11, col: 9, points: 1, isCollected: false, kind: "connection" },
];

// Builds the starting state for a real room's players once the lobby lead
// launches the match.
export function createNetworkerState(
  players: { username: string }[],
  leadUsername: string,
): NetworkerGameState {
  return {
    phase: "playing",
    leadUsername,
    winnerUsername: null,
    elapsedTime: 0,
    systemMessage: "Collect 100 LinkedIn connections before everyone else.",
    players: players.map((player, seat) => ({
      username: player.username,
      score: 0,
      ...getSpawnPoint(seat),
    })),
    connectionItems: INITIAL_CONNECTION_ITEMS.map((item) => ({ ...item })),
  };
}

export function collectItem(
  state: NetworkerGameState,
  username: string,
  itemId: string,
): NetworkerGameState {
  if (state.phase !== "playing") return state;

  const connection = state.connectionItems.find((item) => item.itemId === itemId);
  if (!connection || connection.isCollected) return state;

  const players = state.players.map((player) => {
    if (player.username !== username) return player;
    return { ...player, score: player.score + connection.points };
  });

  const winningPlayer = players.find((player) => player.score >= WINNING_SCORE);

  return {
    ...state,
    phase: winningPlayer ? "ended" : state.phase,
    winnerUsername: winningPlayer?.username ?? state.winnerUsername,
    players,
    connectionItems: state.connectionItems.map((item) =>
      item.itemId === itemId ? { ...item, isCollected: true } : item,
    ),
    systemMessage: `${username} collected ${connection.points} LinkedIn connections.`,
  };
}

// Caps how many connection items can be on the board at once, so a room left
// running for a long time doesn't accumulate an unbounded number of them.
// Raised alongside the smaller per-item point values and faster respawn rate
// (networkerSock.ts) - collecting single-digit points needs far more items
// in circulation to keep the board from ever running dry.
const MAX_ACTIVE_ITEMS = 30;

// One in five spawns is the rarer LinkedIn Premium pickup instead of a
// regular connection.
const PREMIUM_ITEM_CHANCE = 0.2;
const PREMIUM_ITEM_POINTS = 5;

// Drops one new item at a random empty walkable tile. Called on a timer per
// room so the board keeps refilling instead of running dry once the fixed
// starting items are gone. Returns the same state (no-op) if the match isn't
// running or the board is already full.
export function spawnRandomItem(state: NetworkerGameState): NetworkerGameState {
  if (state.phase !== "playing") return state;

  const activeItemCount = state.connectionItems.filter((item) => !item.isCollected).length;
  if (activeItemCount >= MAX_ACTIVE_ITEMS) return state;

  const occupied = new Set(
    state.connectionItems
      .filter((item) => !item.isCollected)
      .map((item) => `${item.row},${item.col}`),
  );
  const emptyCells = WALKABLE_CELLS.filter((cell) => !occupied.has(`${cell.row},${cell.col}`));
  if (emptyCells.length === 0) return state;

  const cell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  if (!cell) return state;

  const isPremium = Math.random() < PREMIUM_ITEM_CHANCE;
  const points = isPremium
    ? PREMIUM_ITEM_POINTS
    : MIN_CONNECTION_POINTS +
      Math.floor(Math.random() * (MAX_CONNECTION_POINTS - MIN_CONNECTION_POINTS + 1));

  const newItem: NetworkerConnectionItem = {
    itemId: randomUUID(),
    row: cell.row,
    col: cell.col,
    points,
    isCollected: false,
    kind: isPremium ? "premium" : "connection",
  };

  return {
    ...state,
    connectionItems: [...state.connectionItems, newItem],
  };
}
