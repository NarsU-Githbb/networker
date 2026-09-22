import { randomUUID } from "node:crypto";

// Server-authoritative mirror of client/src/lib/networker-game.ts.
// Kept as a separate copy because the server and client are built as
// independent TS projects (different rootDir/module settings) - if this
// drifts from the client's shape, keep both in sync by hand.

export const WINNING_SCORE = 100;
export const MIN_CONNECTION_POINTS = 1;
export const MAX_CONNECTION_POINTS = 2;

// Keep the server catalog in sync with client/src/lib/networker-map.ts. The
// server selects the mapId and uses the selected layout for item spawning.
const NETWORKER_MAPS = {
	classic: [
		"#############", "#     #     #", "# ### # ### #", "# #       # #",
		"# # ## ## # #", "#   #   #   #", "### # # # ###", "#   #   #   #",
		"# # ##### # #", "# #       # #", "# ### # ### #", "#     #     #",
		"#############",
	],
	crossroads: [
		"#############", "#     #     #", "# ###   ### #", "# #       # #",
		"# # ##### # #", "#   #     # #", "### # ### # #", "# # #     # #",
		"# # ##### # #", "# #       # #", "# ###   ### #", "#     #     #",
		"#############",
	],
	zigzag: [
		"#############", "#   #       #", "# # # ##### #", "# # #       #",
		"# # ##### # #", "# #   #   # #", "# ### # # # #", "#   # # #   #",
		"# # # ##### #", "# # #       #", "# # ##### # #", "#       #   #",
		"#############",
	],
	loops: [
		"#############", "#     #     #", "# ### # ### #", "#   #   #   #",
		"### ##### ###", "#     #     #", "# ### # ### #", "# #   #   # #",
		"# # ####### #", "# #         #", "# ######### #", "#           #",
		"#############",
	],
	weave: [
		"#############", "#   #   #   #", "# # # # # # #", "# #     #   #",
		"# ##### ### #", "#     #     #", "# ### ##### #", "#   #     # #",
		"# # ### # # #", "# #   # #   #", "# ### # ### #", "#     #     #",
		"#############",
	],
} as const;

type NetworkerMapId = keyof typeof NETWORKER_MAPS;
const NETWORKER_MAP_IDS = Object.keys(NETWORKER_MAPS) as NetworkerMapId[];

function getNetworkerMap(mapId: NetworkerMapId): readonly string[] {
	return NETWORKER_MAPS[mapId] ?? NETWORKER_MAPS.classic;
}

function isWalkableTile(
	map: readonly string[],
	row: number,
	col: number,
): boolean {
	return map[row]?.[col] === " ";
}

// Flood-fills from a spawn corner so items only appear in reachable areas.
function findReachableCells(
	map: readonly string[],
	start: { row: number; col: number },
): { row: number; col: number }[] {
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
      if (isWalkableTile(map, nextRow, nextCol) && !visited.has(key)) {
        visited.add(key);
        queue.push({ row: nextRow, col: nextCol });
      }
    }
  }

  return reachable;
}

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

// An item is only ever present in NetworkerGameState.connectionItems while
// active; collectItem removes it outright instead of flagging it, so the
// array (rebroadcast on every state update, including the once-a-second
// elapsed-time tick) stays bounded for the whole match instead of growing
// with every item ever spawned.
export type NetworkerConnectionItem = {
  itemId: string;
  row: number;
  col: number;
  points: number;
  kind: NetworkerItemKind;
};

export type NetworkerGameState = {
  phase: GamePhase;
  leadUsername: string;
  mapId: NetworkerMapId;
  players: NetworkerPlayer[];
  connectionItems: NetworkerConnectionItem[];
  winnerUsername: string | null;
  // Server-authoritative elapsed match time, measured in whole seconds.
  elapsedTime: number;
  systemMessage: string | null;
};

function createInitialConnectionItems(
  mapId: NetworkerMapId,
): NetworkerConnectionItem[] {
  const map = getNetworkerMap(mapId);
  const spawnKeys = new Set(SPAWN_POINTS.map((point) => `${point.row},${point.col}`));
  const cells = findReachableCells(map, { row: 1, col: 1 }).filter(
    (cell) => !spawnKeys.has(`${cell.row},${cell.col}`),
  );

  return Array.from({ length: 9 }, (_, index) => {
    const cell = cells[Math.floor((index * cells.length) / 9)];
    if (!cell) throw new Error(`Map ${mapId} does not have enough item cells`);

    return {
      itemId: `c${index + 1}`,
      row: cell.row,
      col: cell.col,
      points: index % 2 === 0 ? 1 : 2,
      kind: "connection" as const,
    };
  });
}

// Builds the starting state for a real room's players once the lobby lead
// launches the match.
export function createNetworkerState(
  players: { username: string }[],
  leadUsername: string,
): NetworkerGameState {
  const mapId = NETWORKER_MAP_IDS[Math.floor(Math.random() * NETWORKER_MAP_IDS.length)];
  if (!mapId) throw new Error("No Networker maps are configured");

  return {
    phase: "playing",
    leadUsername,
    mapId,
    winnerUsername: null,
    elapsedTime: 0,
    systemMessage: "Collect 100 LinkedIn connections before everyone else.",
    players: players.map((player, seat) => ({
      username: player.username,
      score: 0,
      ...getSpawnPoint(seat),
    })),
    connectionItems: createInitialConnectionItems(mapId),
  };
}

export function collectItem(
  state: NetworkerGameState,
  username: string,
  itemId: string,
): NetworkerGameState {
  if (state.phase !== "playing") return state;

  const connection = state.connectionItems.find((item) => item.itemId === itemId);
  if (!connection) return state;

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
    connectionItems: state.connectionItems.filter((item) => item.itemId !== itemId),
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

  if (state.connectionItems.length >= MAX_ACTIVE_ITEMS) return state;

  const occupied = new Set(
    state.connectionItems.map((item) => `${item.row},${item.col}`),
  );
  const map = getNetworkerMap(state.mapId);
  const emptyCells = findReachableCells(map, { row: 1, col: 1 }).filter(
    (cell) => !occupied.has(`${cell.row},${cell.col}`),
  );
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
    kind: isPremium ? "premium" : "connection",
  };

  return {
    ...state,
    connectionItems: [...state.connectionItems, newItem],
  };
}
