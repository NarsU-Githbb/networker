// Game rules
export const WINNING_SCORE = 100;
export const MIN_CONNECTION_POINTS = 2;
export const MAX_CONNECTION_POINTS = 20;

// Controls what stage the game is in.
export type GamePhase = 'lobby' | 'playing' | 'paused' | 'ended';

// A players features
export type NetworkerPlayer = {
	username: string;
	score: number;
};

// Describes one Linkedin connection item on the map
export type NetworkerConnectionItem = {
	itemId: string;
	row: number;
	col: number;
	points: number;
	isCollected: boolean;
};

// Full game snapshot i.e phase, players, collectibles conns, winner.
export type NetworkerGameState = {
	phase: GamePhase;
	players: NetworkerPlayer[];
	connectionItems: NetworkerConnectionItem[];
	winnerUsername: string | null;
	systemMessage: string | null;
};

export const winMessages = [
	'Unfortunately there are no junior level positions open right now. Better luck next time!',
	'Your future is bright, you got a junior position in your favorite company!',
];

// Initial State Func.
export function createInitialNetworkerState(): NetworkerGameState {
	return {
		phase: 'lobby',
		winnerUsername: null,
		systemMessage: 'Collect 100 LinkedIn connections before everyone else.',
		// Temporary local placeholders. Person 1 will provide the real room
		// players when the server sends the first approved game state.
		players: [
			{ username: 'Player 1', score: 0 },
			{ username: 'Player 2', score: 0 },
			{ username: 'Player 3', score: 0 },
			{ username: 'Player 4', score: 0 },
		],
		// Temporary sample items for the prototype. Person 2 owns the spawn rules;
		// the server will eventually provide the authoritative item state.
		connectionItems: [
			// Item positions use the shared maze's row/col coordinate system.
			{ itemId: 'c1', row: 1, col: 3, points: 10, isCollected: false },
			{ itemId: 'c2', row: 1, col: 9, points: 15, isCollected: false },
			{ itemId: 'c3', row: 3, col: 1, points: 12, isCollected: false },
			{ itemId: 'c4', row: 3, col: 7, points: 8, isCollected: false },
			{ itemId: 'c5', row: 5, col: 1, points: 20, isCollected: false },
			{ itemId: 'c6', row: 5, col: 9, points: 10, isCollected: false },
			{ itemId: 'c7', row: 7, col: 3, points: 5, isCollected: false },
			{ itemId: 'c8', row: 9, col: 7, points: 10, isCollected: false },
			{ itemId: 'c9', row: 11, col: 9, points: 10, isCollected: false },
		],
	};
}

// Updates scores, marks item as isCollected, returns  new game state.
export function collectItem(
	state: NetworkerGameState,
	username: string,
	itemId: string,
): NetworkerGameState {
	if (state.phase !== 'playing') return state;

	const connection = state.connectionItems.find(
		(item) => item.itemId === itemId,
	);

	if (!connection || connection.isCollected) return state;

	const players = state.players.map((player) => {
		if (player.username !== username) return player;

		return {
			...player,
			score: player.score + connection.points,
		};
	});

	const winningPlayer = players.find((player) => player.score >= WINNING_SCORE);

	return {
		...state,
		phase: winningPlayer ? 'ended' : state.phase,
		winnerUsername: winningPlayer?.username ?? state.winnerUsername,
		players,
		connectionItems: state.connectionItems.map((item) =>
			item.itemId === itemId ? { ...item, isCollected: true } : item,
		),
		systemMessage: `${username} collected ${connection.points} LinkedIn connections.`,
	};
}

// Finds a winner
export function getWinner(state: NetworkerGameState): NetworkerPlayer | null {
	if (!state.winnerUsername) return null;

	return (
		state.players.find((player) => player.username === state.winnerUsername) ??
		null
	);
}
