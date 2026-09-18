import { useEffect, useRef } from 'react';
import { useNetworkerStore } from '@/lib/networker-store';
import {
	playConnectionSound,
	playGameStartSound,
	playLoseSound,
	playPauseSound,
	playPremiumSound,
	playResumeSound,
	playWinSound,
	unlockNetworkerAudio,
} from '@/lib/networker-sound';

export function NetworkerSoundEffects({ localUsername }: { localUsername: string }) {
	// This component subscribes to meaningful game-state changes only. It does
	// not run sound logic for every animation frame or timer tick.
	const phase = useNetworkerStore((state) => state.gameState.phase);
	const winnerUsername = useNetworkerStore(
		(state) => state.gameState.winnerUsername,
	);
	const connectionItems = useNetworkerStore(
		(state) => state.gameState.connectionItems,
	);
	const previousPhase = useRef(phase);
	const previousItems = useRef(connectionItems);

	useEffect(() => {
		// Browsers block audio until the player interacts with the page once.
		const unlock = () => unlockNetworkerAudio();
		window.addEventListener('keydown', unlock, { once: true });
		window.addEventListener('pointerdown', unlock, { once: true });

		return () => {
			window.removeEventListener('keydown', unlock);
			window.removeEventListener('pointerdown', unlock);
		};
	}, []);

	useEffect(() => {
		// Phase transitions are the source of match-level sounds such as pause,
		// resume, start, win, and loss.
		const wasPhase = previousPhase.current;

		if (wasPhase !== 'playing' && phase === 'playing') {
			wasPhase === 'paused' ? playResumeSound() : playGameStartSound();
		} else if (wasPhase === 'playing' && phase === 'paused') {
			playPauseSound();
		} else if (wasPhase !== 'ended' && phase === 'ended') {
			winnerUsername === localUsername ? playWinSound() : playLoseSound();
		}

		previousPhase.current = phase;
	}, [localUsername, phase, winnerUsername]);

	useEffect(() => {
		// Collection sounds are triggered only when the server changes an item
		// from available to collected, preventing duplicate local predictions.
		const previousItemState = new Map(
			previousItems.current.map((item) => [item.itemId, item]),
		);

		for (const item of connectionItems) {
			const wasCollected = previousItemState.get(item.itemId)?.isCollected;
			if (!wasCollected && item.isCollected) {
				item.kind === 'premium'
					? playPremiumSound()
					: playConnectionSound();
			}
		}

		previousItems.current = connectionItems;
	}, [connectionItems]);

	return null;
}
