import { Server } from "socket.io";
import type { CustomSocket } from "./lobbySock.js";
import {
  collectItem,
  createNetworkerState,
  type NetworkerGameState,
} from "../game/networker-game.js";

// One authoritative NetworkerGameState per room, keyed by sessionId.
const gameStates = new Map<string, NetworkerGameState>();

// Called by lobbySock.ts once the lead player launches the match, so the
// room's real players (not placeholder ones) start the score at zero.
export function startNetworkerGame(
  roomId: string,
  players: { username: string }[],
): NetworkerGameState {
  const state = createNetworkerState(players);
  gameStates.set(roomId, state);
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

  socket.on("collect_item", ({ itemId }: { itemId: string }) => {
    const roomId = socket.roomId;
    const username = socket.username;
    if (!roomId || !username) return;

    const state = gameStates.get(roomId);
    if (!state) return;

    const nextState = collectItem(state, username, itemId);
    if (nextState === state) return; // no-op: already collected, unknown item, etc.

    gameStates.set(roomId, nextState);
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
