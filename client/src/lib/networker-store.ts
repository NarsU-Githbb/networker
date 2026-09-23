import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type {
	NetworkerConnectionItem,
	NetworkerGameState,
	NetworkerPlayer,
} from './networker-game';
import { createInitialNetworkerState } from './networker-game';

function samePlayers(a: NetworkerPlayer[], b: NetworkerPlayer[]) {
	return (
		a.length === b.length &&
		a.every(
			(player, i) =>
				player.username === b[i].username &&
				player.score === b[i].score &&
				player.row === b[i].row &&
				player.col === b[i].col,
		)
	);
}

function sameItems(a: NetworkerConnectionItem[], b: NetworkerConnectionItem[]) {
	return (
		a.length === b.length &&
		a.every(
			(item, i) =>
				item.itemId === b[i].itemId &&
				item.row === b[i].row &&
				item.col === b[i].col &&
				item.points === b[i].points &&
				item.kind === b[i].kind,
		)
	);
}

// Every server snapshot arrives as freshly parsed JSON, so `players` and
// `connectionItems` are new arrays even on the once-a-second elapsed-time
// tick where nothing in them changed. Keeping the previous references when
// the contents match stops every selector on them (HUD, MazeItems, sound
// effects) from re-rendering and allocating once a second for nothing.
function reuseUnchanged(
	previous: NetworkerGameState,
	next: NetworkerGameState,
): NetworkerGameState {
	const players = samePlayers(previous.players, next.players)
		? previous.players
		: next.players;
	const connectionItems = sameItems(
		previous.connectionItems,
		next.connectionItems,
	)
		? previous.connectionItems
		: next.connectionItems;
	return { ...next, players, connectionItems };
}

type NetworkerStore = {
	// Server-approved match state mirrored in this browser.
	gameState: NetworkerGameState;

	// Used by the Socket.IO layer when the server broadcasts new state.
	setGameState: (gameState: NetworkerGameState) => void;

	// Used by local development and starting a new match.
	resetGameState: () => void;
};

// Vanilla store: usable by React, Socket.IO, and the DOM game engine.

// Important boundary:
// The backend is authoritative. This store mirrors server-approved state;
// it does not decide scores, winners, or whether an item was collected.
export const NetworkerStore = createStore<NetworkerStore>()((set) => ({
	gameState: createInitialNetworkerState(),

	setGameState: (gameState) =>
		set((state) => ({
			gameState: reuseUnchanged(state.gameState, gameState),
		})),

	resetGameState: () =>
		set({
			gameState: createInitialNetworkerState(),
		}),
}));

// React components use this hook to subscribe to only the state they need.
export function useNetworkerStore<T>(selector: (state: NetworkerStore) => T) {
	return useStore(NetworkerStore, selector);
}
