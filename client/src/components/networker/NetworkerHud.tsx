import { Trophy, Users, Activity, Target } from 'lucide-react';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useNetworkerStore } from '@/lib/networker-store';

const PLAYER_COLORS = ['#ef785f', '#5b9bef', '#7ed957', '#c77dff'];

const phaseLabels = {
	lobby: 'Lobby',
	playing: 'Live',
	paused: 'Paused',
	ended: 'Ended',
} as const;

export function NetworkerHud() {
	// The HUD subscribes only to server-approved game state. It does not decide
	// scores, winners, or item collection results.
	const phase = useNetworkerStore((state) => state.gameState.phase);
	const players = useNetworkerStore((state) => state.gameState.players);
	const winnerUsername = useNetworkerStore(
		(state) => state.gameState.winnerUsername,
	);
	const systemMessage = useNetworkerStore(
		(state) => state.gameState.systemMessage,
	);

	const elapsedTime = useNetworkerStore(
		(state) => state.gameState.elapsedTime,
	);

	// This is display-only derived data. The backend remains responsible for
	// deciding the actual winner.
	const leaderScore = players.reduce(
		(highestScore, player) => Math.max(highestScore, player.score),
		0,
	);

	// The seat is stable for the match and matches NetworkerMaze's player color.
	// Scores decide the visible ranking; seat order breaks ties consistently.
	const rankedPlayers = useMemo(
		() =>
			players
				.map((player, seat) => ({ player, seat }))
				.sort(
					(a, b) =>
						b.player.score - a.player.score || a.seat - b.seat,
				),
		[players],
	);
	const playerRowRefs = useRef(new Map<string, HTMLDivElement>());
	const previousRowPositions = useRef(new Map<string, number>());
	const rowAnimations = useRef(new Map<string, Animation>());

	// FLIP animation: after React reorders the rows, animate each row from its
	// previous screen position to its new ranking position.
	useLayoutEffect(() => {
		const nextPositions = new Map<string, number>();
		const reduceMotion = window.matchMedia(
			'(prefers-reduced-motion: reduce)',
		).matches;

		for (const { player } of rankedPlayers) {
			const row = playerRowRefs.current.get(player.username);
			if (!row) continue;

			const nextTop = row.getBoundingClientRect().top;
			const previousTop = previousRowPositions.current.get(player.username);

			if (
				previousTop !== undefined &&
				!reduceMotion &&
				Math.abs(previousTop - nextTop) > 1
			) {
				rowAnimations.current.get(player.username)?.cancel();
				const animation = row.animate(
					[
						{ transform: `translateY(${previousTop - nextTop}px)` },
						{ transform: 'translateY(0)' },
					],
					{
						duration: 480,
						easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
						fill: 'both',
					},
				);
				rowAnimations.current.set(player.username, animation);
				animation.finished
					.then(() => {
						if (rowAnimations.current.get(player.username) === animation) {
							rowAnimations.current.delete(player.username);
						}
					})
					.catch(() => {
						// Cancelling an interrupted animation rejects finished.
					});
			}

			nextPositions.set(player.username, nextTop);
		}

		previousRowPositions.current = nextPositions;
	}, [rankedPlayers]);

	return (
		<section className="networker-hud-shell" aria-label="Networker game status">
			<div className="networker-hud-heading">
				<div>
					<p className="networker-kicker">The Networker</p>
					<h1>Build your network</h1>
					<p className="networker-hud-message" role="status">
						{systemMessage ?? 'The match is ready.'}
					</p>
				</div>
				<span className={`networker-phase networker-phase-${phase}`}>
					<Activity size={15} aria-hidden="true" />
					{phaseLabels[phase]}
				</span>
			</div>

			<div className="networker-timer" role="timer" aria-live="polite">
				<span>Match time:</span>
				<strong>{formatTime(elapsedTime)}</strong>
			</div>

			<div className="networker-stat-row">
				<div className="networker-stat">
					<Target size={18} aria-hidden="true" />
					<span>
						<small>Target</small>
						<strong>100 connections</strong>
					</span>
				</div>
				<div className="networker-stat">
					<Users size={18} aria-hidden="true" />
					<span>
						<small>Players</small>
						<strong>{players.length} / 4</strong>
					</span>
				</div>
				<div className="networker-stat">
					<Trophy size={18} aria-hidden="true" />
					<span>
						<small>Current lead</small>
						<strong>{leaderScore} connections</strong>
					</span>
				</div>
			</div>

			<div className="networker-scoreboard">
				<div className="networker-scoreboard-title">
					<h2>Scoreboard</h2>
					<span>First to 100 wins</span>
				</div>

				<div className="networker-player-list">
					{rankedPlayers.map(({ player, seat }, index) => {
						// Progress is visual feedback for the 100-connection win target.
						// It does not update the player's score or game state.
						const progress = Math.min((player.score / 100) * 100, 100);
						const playerColor = PLAYER_COLORS[seat % PLAYER_COLORS.length];

						return (
							<div
								className="networker-player-row"
								key={player.username}
								ref={(row) => {
									if (row) playerRowRefs.current.set(player.username, row);
									else playerRowRefs.current.delete(player.username);
								}}
								style={{
									'--networker-player-color': playerColor,
								} as React.CSSProperties}
							>
								<div className="networker-player-rank">{index + 1}</div>
								<div className="networker-player-details">
									<div className="networker-player-name">
										<strong>{player.username}</strong>
										<span>{player.score} / 100</span>
									</div>
									<div
										className="networker-progress-track"
										aria-label={`${player.username} has ${player.score} connections`}
									>
										<span style={{ width: `${progress}%` }} />
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{phase === 'ended' && winnerUsername && (
				<div className="networker-winner-banner" role="alert">
					<Trophy size={22} aria-hidden="true" />
					<span>
						<strong>{winnerUsername} wins!</strong> The network has been built.
					</span>
				</div>
			)}
		</section>
	);
}
function formatTime(seconds: number) {
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;

	return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
		.toString()
		.padStart(2, '0')}`;
}
