import { Trophy, Users, Activity, Target } from "lucide-react"
import { useNetworkerStore } from "@/lib/networker-store"

const phaseLabels = {
  lobby: "Lobby",
  playing: "Live",
  paused: "Paused",
  ended: "Ended",
} as const

export function NetworkerHud() {
  // The HUD subscribes only to server-approved game state. It does not decide
  // scores, winners, or item collection results.
  const phase = useNetworkerStore((state) => state.gameState.phase)
  const players = useNetworkerStore((state) => state.gameState.players)
  const winnerUsername = useNetworkerStore(
    (state) => state.gameState.winnerUsername,
  )
  const systemMessage = useNetworkerStore(
    (state) => state.gameState.systemMessage,
  )

  // This is display-only derived data. The backend remains responsible for
  // deciding the actual winner.
  const leaderScore = players.reduce(
    (highestScore, player) => Math.max(highestScore, player.score),
    0,
  )

  return (
    <section className="networker-hud-shell" aria-label="Networker game status">
      <div className="networker-hud-heading">
        <div>
          <p className="networker-kicker">The Networker</p>
          <h1>Build your network</h1>
          <p className="networker-hud-message" role="status">
            {systemMessage ?? "The match is ready."}
          </p>
        </div>
        <span className={`networker-phase networker-phase-${phase}`}>
          <Activity size={15} aria-hidden="true" />
          {phaseLabels[phase]}
        </span>
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
          {players.map((player, index) => {
            // Progress is visual feedback for the 100-connection win target.
            // It does not update the player's score or game state.
            const progress = Math.min((player.score / 100) * 100, 100)

            return (
              <div className="networker-player-row" key={player.username}>
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
            )
          })}
        </div>
      </div>

      {phase === "ended" && winnerUsername && (
        <div className="networker-winner-banner" role="alert">
          <Trophy size={22} aria-hidden="true" />
          <span>
            <strong>{winnerUsername} wins!</strong> The network has been built.
          </span>
        </div>
      )}
    </section>
  )
}
