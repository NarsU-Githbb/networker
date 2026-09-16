// Server-authoritative mirror of client/src/lib/networker-game.ts.
// Kept as a separate copy because the server and client are built as
// independent TS projects (different rootDir/module settings) - if this
// drifts from the client's shape, keep both in sync by hand.

export const WINNING_SCORE = 100;

export type GamePhase = "lobby" | "playing" | "paused" | "ended";

export type NetworkerPlayer = {
  username: string;
  score: number;
  row: number;
  col: number;
};

// Only one spawn point is defined so far (client/src/lib/networker-map.ts's
// NETWORKER_PLAYER_START) - every player starts there until spawn spreading
// is designed.
const PLAYER_START = { row: 1, col: 1 };

export type NetworkerConnectionItem = {
  itemId: string;
  row: number;
  col: number;
  points: number;
  isCollected: boolean;
};

export type NetworkerGameState = {
  phase: GamePhase;
  players: NetworkerPlayer[];
  connectionItems: NetworkerConnectionItem[];
  winnerUsername: string | null;
  systemMessage: string | null;
};

// Same layout as client/src/lib/networker-map.ts's NETWORKER_MAP, so item
// row/col values line up with walkable floor tiles in the maze.
const INITIAL_CONNECTION_ITEMS: NetworkerConnectionItem[] = [
  { itemId: "c1", row: 1, col: 3, points: 10, isCollected: false },
  { itemId: "c2", row: 1, col: 9, points: 15, isCollected: false },
  { itemId: "c3", row: 3, col: 1, points: 12, isCollected: false },
  { itemId: "c4", row: 3, col: 7, points: 8, isCollected: false },
  { itemId: "c5", row: 5, col: 1, points: 20, isCollected: false },
  { itemId: "c6", row: 5, col: 9, points: 10, isCollected: false },
  { itemId: "c7", row: 7, col: 3, points: 5, isCollected: false },
  { itemId: "c8", row: 9, col: 7, points: 10, isCollected: false },
  { itemId: "c9", row: 11, col: 9, points: 10, isCollected: false },
];

// Builds the starting state for a real room's players once the lobby lead
// launches the match.
export function createNetworkerState(
  players: { username: string }[],
): NetworkerGameState {
  return {
    phase: "playing",
    winnerUsername: null,
    systemMessage: "Collect 100 LinkedIn connections before everyone else.",
    players: players.map((player) => ({
      username: player.username,
      score: 0,
      ...PLAYER_START,
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
