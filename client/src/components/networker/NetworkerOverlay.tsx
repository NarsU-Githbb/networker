import { Pause, Trophy } from 'lucide-react';
import { useNetworkerStore } from '@/lib/networker-store';

export function NetworkerOverlay() {
    // The overlay reads server-approved state from Zustand.
	const phase = useNetworkerStore((state) => state.gameState.phase);
	const winnerUsername = useNetworkerStore(
		(state) => state.gameState.winnerUsername,
	);
	const systemMessage = useNetworkerStore(
		(state) => state.gameState.systemMessage,
	);

 const isPaused = phase === 'paused'
  const isEnded = phase === 'ended'

// Temporary debug trigger
  if (isPaused) {
    console.log('PAUSE IS WORKING — phase:', phase)
  }

  if (!isPaused && !isEnded) {
    return null
  }


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
					<h2>{winnerUsername ?? 'The winner'} wins!</h2>
					<p>
						You did it, you were the first to collect 100 LinkedIn connections!
					</p>
				</>
			)}
		</div>
	);
}
