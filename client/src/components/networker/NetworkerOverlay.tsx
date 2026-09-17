import { Pause, RotateCcw, Trophy } from 'lucide-react';
import { useNetworkerStore } from '@/lib/networker-store';

export function NetworkerOverlay({
	localUsername,
	onPlayAgain,
	rematchError,
}: {
	localUsername: string;
	onPlayAgain: () => void;
	rematchError: string | null;
}) {
    // The overlay reads server-approved state from Zustand.
	const phase = useNetworkerStore((state) => state.gameState.phase);
	const winnerUsername = useNetworkerStore(
		(state) => state.gameState.winnerUsername,
	);
	const leadUsername = useNetworkerStore(
		(state) => state.gameState.leadUsername,
	);
	const systemMessage = useNetworkerStore(
		(state) => state.gameState.systemMessage,
	);

    //Keep the maze unobstructed during the lobby and active gameplay.
    //Anssi's backend will update the phase through Socket.IO.
	if (phase != 'paused' && phase !== 'ended') {
		return null;
	}

	const isPaused = phase === 'paused';
	const isWinner = winnerUsername === localUsername;
	const isLead = leadUsername === localUsername;

	return (
		<div
			className="networker-overlay"
			role="dialog"
			aria-modal="true"
			aria-label={isPaused ? 'Paused game' : 'Game ended'}
		>
            {isPaused ? (
                //Pause content comes from the server's pause state and message.
				<>
					<Pause size={32} aria-hidden="true" />
					<p className="networker-kicker">Game paused</p>
					<h2>Take a moment</h2>
					<p>{systemMessage ?? 'The game is currently paused.'}</p>
				</>
			) : (
				<>
					<Trophy size={32} aria-hidden="true" />
					<p className="networker-kicker">Match complete</p>
					<h2>{isWinner ? 'You win!' : `${winnerUsername ?? 'Another player'} wins!`}</h2>
					<p>
						{isWinner
							? 'You did it, you were the first to collect 100 LinkedIn connections!'
							: 'Sorry, we are not hiring junior developers right now.'}
					</p>
					{isLead ? (
						<button
							className="networker-overlay-action"
							type="button"
							onClick={onPlayAgain}
						>
							<RotateCcw size={18} aria-hidden="true" />
							Play Again
						</button>
					) : (
						<p>Waiting for the lead player to start another game.</p>
					)}
					{rematchError && <p role="alert">{rematchError}</p>}
				</>
			)}
		</div>
	);
}
