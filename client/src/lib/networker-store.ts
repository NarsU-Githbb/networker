import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { NetworkerGameState } from './networker-game';
import { createInitialNetworkerState } from './networker-game';

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

	setGameState: (gameState) => set({ gameState }),

	resetGameState: () =>
		set({
			gameState: createInitialNetworkerState(),
		}),
}));

// React components use this hook to subscribe to only the state they need.
export function useNetworkerStore<T>(selector: (state: NetworkerStore) => T) {
	return useStore(NetworkerStore, selector);
}
