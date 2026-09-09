// Game rules 
export const WINNING_SCORE = 100;
export const MIN_CONNECTION_VALUE = 2;
export const MAX_CONNECTION_VALUE = 20;

// Controls what stage the game is in.
export type GamePhase = 'waiting' | 'playing' | 'paused' | 'ended';

// A players features
export type NetworkingPlayer = {
	id: string;
	username: string;
	score: number;
};

// Describes one Linkedin connection item on the map
export type NetworkingConnection = {
	id: string;
	x: number;
	y: number;
	value: number;
	collected: boolean;
};

// Full game snapshot i.e phase, players, collectibles conns, winner.
export type NetworkingGameState = {
	phase: GamePhase;
	players: NetworkingPlayer[];
	connections: NetworkingConnection[];
	winnerId: string | null;
	systemMessage: string | null;
};

export const winMessages = [
	'Unfortunately there are no junior level positions open right now. Better luck next time!',
	'Your future is bright, you got a junior position in your favorite company!',
];

// Initial State Func.
export function createInitialNetworkingState(): NetworkingGameState {
	return {
		phase: 'playing',
		winnerId: null,
		systemMessage: 'Collect 100 LinkedIn connections before everyone else.',
		players: [
			{ id: 'p1', username: 'Player 1', score: 0 },
			{ id: 'p2', username: 'Player 2', score: 0 },
			{ id: 'p3', username: 'Player 3', score: 0 },
			{ id: 'p4', username: 'Player 4', score: 0 },
		],
		connections: [
			{ id: 'c1', x: 10, y: 18, value: 8, collected: false },
			{ id: 'c2', x: 34, y: 42, value: 14, collected: false },
			{ id: 'c3', x: 72, y: 24, value: 20, collected: false },
			{ id: 'c4', x: 56, y: 70, value: 6, collected: false },
			{ id: 'c5', x: 82, y: 60, value: 18, collected: false },
			{ id: 'c6', x: 22, y: 76, value: 12, collected: false },
		],
	};
}

// Updates scores, marks item as collected, returns  new game state.
export function collectConnection(
	state: NetworkingGameState,
	playerId: string,
	connectionId: string,
): NetworkingGameState {
	if (state.phase !== 'playing') return state;

	const connection = state.connections.find((item) => item.id === connectionId);

	if (!connection || connection.collected) return state;

	const players = state.players.map((player) => {
		if (player.id != playerId) return player;

		return {
			...player,
			score: player.score + connection.value,
		};
	});

	const winningPlayer = players.find((player) => player.score >= WINNING_SCORE);

	return {
		...state,
		phase: winningPlayer ? 'ended' : state.phase,
		winnerId: winningPlayer?.id ?? state.winnerId,
		players,
		connections: state.connections.map((item) =>
			item.id === connectionId ? { ...item, collected: true } : item,
		),
		systemMessage: `${players.find((player) => player.id === playerId)?.username} collected${connection.value} LinkedIn connections.`,
	};
}

// Finds a winner
export function getWinner(state: NetworkingGameState): NetworkingPlayer | null {
	if (!state.winnerId) return null;

	return state.players.find((player) => player.id === state.winnerId) ?? null;
}
