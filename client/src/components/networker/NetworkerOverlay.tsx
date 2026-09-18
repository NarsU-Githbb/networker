import {useNavigate} from '@tanstack/react-router'
import { Pause, RotateCcw, Trophy } from 'lucide-react';
import { useNetworkerStore } from '@/lib/networker-store';
import { useEffect } from 'react'

export function NetworkerOverlay( {
	localUsername,
	onPlayAgain,
	rematchError,
	socket
}: {
	localUsername: string;
	onPlayAgain: () => void;
	rematchError: string | null;
	socket: string
}) {
 
const navigate = useNavigate();

const gameResume = () => {
socket.emit("resume_game")
}

const gameQuit = () => {
socket.emit("quit_game", (response: { success: boolean; error?: string }) => {
if (response.success) {
  navigate({ to: "/" }) 
    } else {
      console.error(response.error);
    }
  });
};
 
useEffect(() => {
  const handleGameExpired = () => {
    navigate({ to: "/" });
  };

  //using lobby_expired here because there's no need to make same logic twice

  socket.on("lobby_expired", handleGameExpired);

  return () => {
    socket.off("lobby_expired", handleGameExpired);
  };
}, [socket, navigate]);


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

	const isPaused = phase === 'paused';
	const isEnded = phase === 'ended'
	const isWinner = winnerUsername === localUsername;
	const isLead = leadUsername === localUsername;

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
				//need to figure out how to get the proper username who paused
				<>
					<Pause size={32} aria-hidden="true" />
					<p className="networker-kicker">Game paused</p>
					<h2>Take a moment</h2>
					<p>{systemMessage + ` - ${localUsername}`  ?? `The game is currently paused by ${localUsername}`}</p>
					
					<button type="button" className="transition-colors duration-200 outline-none hover:text-gray-500 focus-visible:text-gray-900 font-medium p-2" onClick={gameResume}>
					Resume game 
					</button>

					<button type="button" className="transition-colors duration-200 outline-none hover:text-gray-500 focus-visible:text-gray-900 font-medium p-2" onClick={gameQuit}>
					Quit game
					</button>
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
