import { useEffect, useRef } from "react"
import type { Socket } from "socket.io-client"
import { useNetworkerStore } from "@/lib/networker-store"
import type { NetworkerConnectionItem } from "@/lib/networker-game"
import {
  NETWORKER_MAP,
  NETWORKER_PLAYER_START,
  isNetworkerWalkable,
} from "@/lib/networker-map"

type Cell = { row: number; col: number }
type CellAnimation = { from: Cell; to: Cell; startTime: number }

const MOVE_DURATION_MS = 130
const MAZE_COLUMNS = NETWORKER_MAP[0].length

// Checked in this order so one direction wins when multiple keys are held.
const DIRECTIONS: Array<{ keys: string[]; deltaRow: number; deltaCol: number }> = [
  { keys: ["arrowup", "w"], deltaRow: -1, deltaCol: 0 },
  { keys: ["arrowdown", "s"], deltaRow: 1, deltaCol: 0 },
  { keys: ["arrowleft", "a"], deltaRow: 0, deltaCol: -1 },
  { keys: ["arrowright", "d"], deltaRow: 0, deltaCol: 1 },
]
const MOVE_KEYS = new Set(DIRECTIONS.flatMap((direction) => direction.keys))

// The rendered tile size is a CSS clamp() that scales with viewport width
// (see --networker-maze-tile-size in index.css), so it can't be a constant -
// it's measured from the live grid each frame instead.
function getTileSize(mazeEl: HTMLDivElement | null): number {
  return mazeEl ? mazeEl.clientWidth / MAZE_COLUMNS : 0
}

function cellCenter(row: number, col: number, tileSize: number) {
  return {
    x: col * tileSize + tileSize / 2,
    y: row * tileSize + tileSize / 2,
  }
}

// Snaps a token straight to a cell - used for the resting (non-animating) state.
function paintCell(token: HTMLSpanElement, cell: Cell, tileSize: number) {
  const { x, y } = cellCenter(cell.row, cell.col, tileSize)
  token.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
}

// Writes one frame of a cell-to-cell interpolation to a token's transform.
// Shared by the local player and every remote token so they animate the same
// way whether the move came from a keypress or a player_moved broadcast.
// Cells (not pixel positions) are stored so a mid-move resize still lands
// exactly on the target cell instead of a stale pixel offset.
function applyAnimationFrame(
  token: HTMLSpanElement,
  animation: CellAnimation,
  time: number,
  tileSize: number,
) {
  const t = Math.min(1, (time - animation.startTime) / MOVE_DURATION_MS)
  const from = cellCenter(animation.from.row, animation.from.col, tileSize)
  const to = cellCenter(animation.to.row, animation.to.col, tileSize)
  const x = from.x + (to.x - from.x) * t
  const y = from.y + (to.y - from.y) * t
  token.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
  return t >= 1
}

// Temporary Person 2 prototype. Person 3 can replace this presentational grid
// with the rAF-driven renderer once keyboard movement and collision are ready.
export function NetworkerMaze({
  socket,
  localUsername,
}: {
  socket: Socket
  localUsername: string
}) {
  // The maze reads item state from Zustand, but does not award points or mark
  // items as collected. Those rules belong to the authoritative game state.
  const connectionItems = useNetworkerStore(
    (state) => state.gameState.connectionItems,
  )
  const players = useNetworkerStore((state) => state.gameState.players)
  const otherPlayers = players.filter((player) => player.username !== localUsername)

  const mazeRef = useRef<HTMLDivElement | null>(null)
  const playerTokenRef = useRef<HTMLSpanElement | null>(null)
  const heldKeysRef = useRef<Set<string>>(new Set())
  const cellRef = useRef({ ...NETWORKER_PLAYER_START })
  const animationRef = useRef<CellAnimation | null>(null)

  // Render state for every OTHER player: their last known cell, an in-flight
  // interpolation (if they're mid-move), and the DOM token to animate.
  // Keyed by username since players can join/leave independently of rAF.
  const remoteTokensRef = useRef<Map<string, HTMLSpanElement>>(new Map())
  const remoteCellsRef = useRef<Map<string, Cell>>(new Map())
  const remoteAnimationsRef = useRef<Map<string, CellAnimation>>(new Map())

  // Seed a remote player's tracked cell the first time we see them (e.g. when
  // the match starts). After that, only live player_moved events move them -
  // ignoring later game_state_updated snapshots here avoids visually
  // snapping a player backward to a slightly stale broadcast position.
  useEffect(() => {
    for (const player of otherPlayers) {
      if (!remoteCellsRef.current.has(player.username)) {
        remoteCellsRef.current.set(player.username, { row: player.row, col: player.col })
      }
    }

    const currentUsernames = new Set(otherPlayers.map((player) => player.username))
    for (const username of remoteCellsRef.current.keys()) {
      if (!currentUsernames.has(username)) {
        remoteCellsRef.current.delete(username)
        remoteAnimationsRef.current.delete(username)
        remoteTokensRef.current.delete(username)
      }
    }
  }, [otherPlayers])

  useEffect(() => {
    const handlePlayerMoved = ({
      username,
      row,
      col,
    }: {
      username: string
      row: number
      col: number
    }) => {
      const previousCell = remoteCellsRef.current.get(username) ?? { row, col }
      remoteAnimationsRef.current.set(username, {
        from: previousCell,
        to: { row, col },
        startTime: performance.now(),
      })
      remoteCellsRef.current.set(username, { row, col })
    }

    socket.on("player_moved", handlePlayerMoved)
    return () => {
      socket.off("player_moved", handlePlayerMoved)
    }
  }, [socket])

  // The rAF loop below only runs once (empty deps) so it closes over stale
  // props/state; this ref keeps it reading the latest connection items
  // without needing to restart the loop every time the store updates.
  const connectionItemsRef = useRef<NetworkerConnectionItem[]>(connectionItems)
  useEffect(() => {
    connectionItemsRef.current = connectionItems
  }, [connectionItems])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (!MOVE_KEYS.has(key)) return
      // Stop the browser's default arrow-key/space scroll, and signal to
      // extensions (e.g. vim-style keybinding tools) that the page already
      // handled this key so they don't also act on it.
      event.preventDefault()
      heldKeysRef.current.add(key)
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      heldKeysRef.current.delete(event.key.toLowerCase())
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [])

  useEffect(() => {
    let frameId: number

    const tick = (time: number) => {
      const tileSize = getTileSize(mazeRef.current)

      if (tileSize > 0) {
        const token = playerTokenRef.current

        // Idle: try to start a move toward whichever held direction is walkable.
        if (!animationRef.current && token) {
          const direction = DIRECTIONS.find((candidate) =>
            candidate.keys.some((key) => heldKeysRef.current.has(key)),
          )

          if (direction) {
            const { row, col } = cellRef.current
            const targetRow = row + direction.deltaRow
            const targetCol = col + direction.deltaCol

            if (isNetworkerWalkable(targetRow, targetCol)) {
              animationRef.current = {
                from: { row, col },
                to: { row: targetRow, col: targetCol },
                startTime: time,
              }
              cellRef.current = { row: targetRow, col: targetCol }
              socket.emit("player_moved", { row: targetRow, col: targetCol })

              // Ask the server for permission to collect; it owns scoring and
              // will broadcast game_state_updated with the approved result.
              const landedItem = connectionItemsRef.current.find(
                (item) =>
                  item.row === targetRow &&
                  item.col === targetCol &&
                  !item.isCollected,
              )
              if (landedItem) {
                socket.emit("collect_item", { itemId: landedItem.itemId })
              }
            }
          }
        }

        // Animating or resting: keep the token's pixel position accurate every
        // frame, using whatever the tile size currently measures as (this is
        // also what places the token correctly on the very first frame and
        // after a viewport resize, without a separate bootstrap step).
        if (token) {
          const animation = animationRef.current
          if (animation && applyAnimationFrame(token, animation, time, tileSize)) {
            animationRef.current = null
          }
          if (!animationRef.current) {
            paintCell(token, cellRef.current, tileSize)
          }
        }

        // Same treatment, driven by the last player_moved message instead of
        // local input, for every other player in the room.
        remoteCellsRef.current.forEach((cell, username) => {
          const remoteToken = remoteTokensRef.current.get(username)
          if (!remoteToken) return

          const animation = remoteAnimationsRef.current.get(username)
          if (animation && applyAnimationFrame(remoteToken, animation, time, tileSize)) {
            remoteAnimationsRef.current.delete(username)
          }
          if (!remoteAnimationsRef.current.has(username)) {
            paintCell(remoteToken, cell, tileSize)
          }
        })
      }

      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [socket])

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
        ref={mazeRef}
        className="networker-maze"
        style={{
          // The CSS variable scales the map for the viewport; getTileSize()
          // reads the rendered result back for the rAF loop's pixel math.
          gridTemplateColumns: `repeat(${MAZE_COLUMNS}, var(--networker-maze-tile-size))`,
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
              </div>
            )
          }),
        )}

        <span
          ref={playerTokenRef}
          className="networker-maze-player networker-maze-player-token"
          aria-label="You"
        />

        {otherPlayers.map((player) => (
          <span
            key={player.username}
            ref={(el) => {
              if (el) {
                remoteTokensRef.current.set(player.username, el)
                const cell = remoteCellsRef.current.get(player.username) ?? {
                  row: player.row,
                  col: player.col,
                }
                paintCell(el, cell, getTileSize(mazeRef.current))
              } else {
                remoteTokensRef.current.delete(player.username)
              }
            }}
            className="networker-maze-player networker-maze-player-token networker-maze-player-remote"
            aria-label={player.username}
            title={player.username}
          />
        ))}
      </div>

      <p className="networker-maze-legend">
        <span className="networker-maze-legend-item">
          <span className="networker-maze-player" aria-hidden="true" /> You
        </span>
        <span className="networker-maze-legend-item">
          <span className="networker-maze-player networker-maze-player-remote" aria-hidden="true" /> Other players
        </span>
        <span className="networker-maze-legend-item">
          <span className="networker-maze-item" aria-hidden="true">in</span>
          LinkedIn connection
        </span>
      </p>
    </section>
  )
}
