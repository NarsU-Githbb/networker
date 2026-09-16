import { useNetworkerStore } from "@/lib/networker-store"
import {
  NETWORKER_MAP,
  NETWORKER_PLAYER_START,
} from "@/lib/networker-map"

// Temporary Person 2 prototype. Person 3 can replace this presentational grid
// with the rAF-driven renderer once keyboard movement and collision are ready.
export function NetworkerMaze() {
  // The maze reads item state from Zustand, but does not award points or mark
  // items as collected. Those rules belong to the authoritative game state.
  const connectionItems = useNetworkerStore(
    (state) => state.gameState.connectionItems,
  )

  return (
    <section className="networker-maze-section" aria-label="Networker maze">
      <div className="networker-maze-heading">
        <div>
          <p className="networker-kicker">Game map</p>
          <h2>Connection maze</h2>
        </div>
        <span>Collect every item</span>
      </div>

      <div
        className="networker-maze"
        style={{
          // The CSS variable scales the map for the viewport. Person 3 can
          // later share this tile size with the movement/rendering engine.
          gridTemplateColumns: `repeat(${NETWORKER_MAP[0].length}, var(--networker-maze-tile-size))`,
        }}
      >
        {NETWORKER_MAP.flatMap((mapRow, row) =>
          [...mapRow].map((tile, col) => {
            // Person 2 defines item placement. Person 3 can later use these
            // same row/col values for collision checks in the game engine.
            const item = connectionItems.find(
              (connectionItem) =>
                connectionItem.row === row && connectionItem.col === col,
            )

            return (
              <div
                className={`networker-maze-tile ${
                  tile === "#" ? "networker-maze-wall" : "networker-maze-floor"
                }`}
                key={`${row}-${col}`}
              >
                {item && !item.isCollected && (
                  <span
                    className="networker-maze-item"
                    title={`${item.points} LinkedIn connections`}
                  >
                    {/* Temporary text marker; replace with the final item visual. */}
                    in
                  </span>
                )}
                {/* This is a static starting marker for now. Person 3 will
                    replace it with the animated local-player element. */}
                {row === NETWORKER_PLAYER_START.row &&
                  col === NETWORKER_PLAYER_START.col && (
                    <span className="networker-maze-player" aria-label="You" />
                  )}
              </div>
            )
          }),
        )}
      </div>

      <p className="networker-maze-legend">
        <span className="networker-maze-legend-item">
          <span className="networker-maze-player" aria-hidden="true" /> You
        </span>
        <span className="networker-maze-legend-item">
          <span className="networker-maze-item" aria-hidden="true">in</span>
          LinkedIn connection
        </span>
      </p>
    </section>
  )
}
