import { Server } from "socket.io";
import type { CustomSocket } from "./lobbySock.js";
import {
  collectItem,
  createNetworkerState,
  spawnRandomItem,
  type NetworkerGameState,
} from "../game/networker-game.js";

// One authoritative NetworkerGameState per room, keyed by sessionId.
const gameStates = new Map<string, NetworkerGameState>();

// One item-respawn interval per room, so a mid-match item drought doesn't
// leave players with nothing left to race for once the starting items run out.
// Tuned fast (and multiple items per tick) because points per item dropped
// to 1-2 - the board needs far more items in circulation to avoid dry spells.
const respawnTimers = new Map<string, NodeJS.Timeout>();
const elapsedTimers = new Map<string, NodeJS.Timeout>();
const ITEM_RESPAWN_INTERVAL_MS = 2000;
const ITEMS_PER_RESPAWN_TICK = 3;

// Used by the lobby layer when it needs to validate whether a match really
// ended before allowing a rematch.
export function getNetworkerGameState(roomId: string) {
  return gameStates.get(roomId);
}

function stopElapsedTimer(roomId: string) {
  const timer = elapsedTimers.get(roomId);
  if (!timer) return;

  clearInterval(timer);
  elapsedTimers.delete(roomId);
}

// The server owns the clock. Clients receive snapshots; they never calculate
// the official match duration locally.
function startElapsedTimer(io: Server, roomId: string) {
  stopElapsedTimer(roomId);

  const timer = setInterval(() => {
    const currentState = gameStates.get(roomId);
    if (!currentState || currentState.phase !== "playing") {
      stopElapsedTimer(roomId);
      return;
    }

    const nextState = {
      ...currentState,
      elapsedTime: currentState.elapsedTime + 1,
    };
    gameStates.set(roomId, nextState);
    io.to(roomId).emit("game_state_updated", nextState);
  }, 1000);

  elapsedTimers.set(roomId, timer);
}

function stopItemRespawnTimer(roomId: string) {
  const timer = respawnTimers.get(roomId);
  if (!timer) return;

  clearInterval(timer);
  respawnTimers.delete(roomId);
}

function startItemRespawnTimer(io: Server, roomId: string) {
  stopItemRespawnTimer(roomId);

  const timer = setInterval(() => {
    const currentState = gameStates.get(roomId);
    if (!currentState || currentState.phase !== "playing") {
      stopItemRespawnTimer(roomId);
      return;
    }

    let nextState = currentState;
    for (let i = 0; i < ITEMS_PER_RESPAWN_TICK; i++) {
      nextState = spawnRandomItem(nextState);
    }
    if (nextState === currentState) return;

    gameStates.set(roomId, nextState);
    io.to(roomId).emit("game_state_updated", nextState);
  }, ITEM_RESPAWN_INTERVAL_MS);

  respawnTimers.set(roomId, timer);
}

// Called by lobbySock.ts once the lead player launches the match, so the
// room's real players (not placeholder ones) start the score at zero.
export function startNetworkerGame(
  io: Server,
  roomId: string,
  players: { username: string }[],
  leadUsername: string,
): NetworkerGameState {
  const state = createNetworkerState(players, leadUsername);
  gameStates.set(roomId, state);

  startElapsedTimer(io, roomId);
  startItemRespawnTimer(io, roomId);

  return state;
}

export function handleGame(io: Server, socket: CustomSocket) {
  // A client that just navigated to /game (or refreshed there) asks for
  // whatever state already exists for its room, in case it missed the
  // broadcast that fired when the match started.
  socket.on("request_game_state", ({ roomId }: { roomId: string }) => {
    const state = gameStates.get(roomId);
    if (!state) return;
    socket.emit("game_state_updated", state);
  });

  socket.on("pause_game", ({ roomId }: { roomId: string }) => {
     const state = gameStates.get(roomId);

       if (!state) return;
  if (state.phase !== "playing") return;

  const nextState: NetworkerGameState = {
    ...state,
    phase: "paused",
    systemMessage: "The game has been paused.",
  };

  gameStates.set(roomId, nextState);
io.to(roomId).emit("game_state_updated", nextState) 

  })

  socket.on("collect_item", ({ itemId }: { itemId: string }) => {
    const roomId = socket.roomId;
    const username = socket.username;
    if (!roomId || !username) return;

    const state = gameStates.get(roomId);
    if (!state) return;

    const nextState = collectItem(state, username, itemId);
    if (nextState === state) return; // no-op: already collected, unknown item, etc.

    gameStates.set(roomId, nextState);
    if (nextState.phase === "ended") {
      stopElapsedTimer(roomId);
      stopItemRespawnTimer(roomId);
    }
    io.to(roomId).emit("game_state_updated", nextState);
  });

  socket.on("pause_game", () => {
    const roomId = socket.roomId;
    const username = socket.username;
    if (!roomId || !username) return;

    const state = gameStates.get(roomId);
    if (!state || state.phase !== "playing") return;

    const nextState = {
      ...state,
      phase: "paused" as const,
      systemMessage: `${username} paused the match.`,
    };
    stopElapsedTimer(roomId);
    stopItemRespawnTimer(roomId);
    gameStates.set(roomId, nextState);
    io.to(roomId).emit("game_state_updated", nextState);
  });

  socket.on("resume_game", () => {
    const roomId = socket.roomId;
    const username = socket.username;
    if (!roomId || !username) return;

    const state = gameStates.get(roomId);
    if (!state || state.phase !== "paused") return;

    const nextState = {
      ...state,
      phase: "playing" as const,
      systemMessage: `${username} resumed the match.`,
    };
    gameStates.set(roomId, nextState);
    startElapsedTimer(io, roomId);
    startItemRespawnTimer(io, roomId);
    io.to(roomId).emit("game_state_updated", nextState);
  });

  // Fires far more often than collect_item (roughly once per grid step), so
  // it stays a small standalone broadcast instead of resending the whole
  // NetworkerGameState (items included) on every step any player takes.
  socket.on("player_moved", ({ row, col }: { row: number; col: number }) => {
    const roomId = socket.roomId;
    const username = socket.username;
    if (!roomId || !username) return;

    const state = gameStates.get(roomId);
    if (!state || state.phase !== "playing") return;

    const playerIndex = state.players.findIndex((player) => player.username === username);
    if (playerIndex === -1) return;

    const players = state.players.slice();
    const existingPlayer = players[playerIndex];
    if (!existingPlayer) return;
    players[playerIndex] = { ...existingPlayer, row, col };
    gameStates.set(roomId, { ...state, players });

    socket.to(roomId).emit("player_moved", { username, row, col });
  });
}


