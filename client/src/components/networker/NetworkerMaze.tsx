import { useEffect, useRef } from "react"
import type { Socket } from "socket.io-client"
import { useNetworkerStore } from "@/lib/networker-store"
import type { NetworkerConnectionItem } from "@/lib/networker-game"
import {
  NETWORKER_PLAYER_START,
  getNetworkerMap,
  isNetworkerWalkable,
} from "@/lib/networker-map"

// Seat 0's color is the base .networker-maze-player color; seats 1-3 get a
// modifier class. Cycles past 4 players rather than erroring.
function seatColorClassName(seat: number): string {
  const wrappedSeat = seat % 4
  return wrappedSeat === 0 ? "" : ` networker-maze-player-seat-${wrappedSeat}`
}

type Cell = { row: number; col: number }
type CellAnimation = { from: Cell; to: Cell; startTime: number; durationMs: number }

const MOVE_DURATION_MS = 130

// Collecting a LinkedIn Premium item halves the local player's move duration
// (so every step and dash covers its distance twice as fast) for this long.
// Only applied to the local player's own animations - remote players' moves
// always animate at MOVE_DURATION_MS since their boost state isn't synced.
const SPEED_BOOST_DURATION_MS = 5000
const BOOSTED_MOVE_DURATION_MS = MOVE_DURATION_MS / 2

const DIRECTIONS: Array<{ keys: string[]; deltaRow: number; deltaCol: number }> = [
  { keys: ["arrowup", "w"], deltaRow: -1, deltaCol: 0 },
  { keys: ["arrowdown", "s"], deltaRow: 1, deltaCol: 0 },
  { keys: ["arrowleft", "a"], deltaRow: 0, deltaCol: -1 },
  { keys: ["arrowright", "d"], deltaRow: 0, deltaCol: 1 },
]
const MOVE_KEYS = new Set(DIRECTIONS.flatMap((direction) => direction.keys))

// The most recently pressed key that's still held wins, not a fixed
// priority order - otherwise a direction you haven't fully released yet
// (very easy at speed) silently blocks a newly pressed turn.
function getActiveDirection(pressOrder: string[]) {
  for (let i = pressOrder.length - 1; i >= 0; i--) {
    const key = pressOrder[i]
    const match = DIRECTIONS.find((candidate) => candidate.keys.includes(key ?? ""))
    if (match) return match
  }
  return undefined
}

// A dash covers this many tiles (stopping early at a wall) in the same
// MOVE_DURATION_MS as a normal step, so it visibly moves faster. The
// cooldown is what stops it from being spammed into a permanent speed boost.
const DASH_KEY = " "
const DASH_TILE_COUNT = 3
const DASH_COOLDOWN_MS = 2000

// The rendered tile size is a CSS clamp() that scales with viewport width
// (see --networker-maze-tile-size in index.css), so it can't be a constant -
// it's measured from the live grid each frame instead.
function getTileSize(mazeEl: HTMLDivElement | null, mazeColumns: number): number {
	return mazeEl ? mazeEl.clientWidth / mazeColumns : 0
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
  const t = Math.min(1, (time - animation.startTime) / animation.durationMs)
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
  const mapId = useNetworkerStore((state) => state.gameState.mapId)
  const networkerMap = getNetworkerMap(mapId)
  const mazeColumns = networkerMap[0]?.length ?? 13
  const players = useNetworkerStore((state) => state.gameState.players)
  // Seat = stable position in the room's player list, assigned once at
  // match start (createNetworkerState) and never reordered - used for both
  // spawn corner and color, so they stay in sync across every client.
  const playersWithSeat = players.map((player, seat) => ({ ...player, seat }))
  const mySeat = playersWithSeat.find((player) => player.username === localUsername)?.seat ?? 0
  const otherPlayers = playersWithSeat.filter((player) => player.username !== localUsername)

  const mazeRef = useRef<HTMLDivElement | null>(null)
  const playerTokenRef = useRef<HTMLSpanElement | null>(null)
  // Held movement keys in press order (oldest first) - see getActiveDirection.
  const heldKeysRef = useRef<string[]>([])
  const cellRef = useRef({ ...NETWORKER_PLAYER_START })
  const animationRef = useRef<CellAnimation | null>(null)
  const hasSpawnedRef = useRef(false)
  const dashRequestedRef = useRef(false)
  const lastDashTimeRef = useRef(-Infinity)
  const speedBoostUntilRef = useRef(-Infinity)

  // Seed the local player's own cell from the store's authoritative spawn
  // position the first time it's available, instead of assuming everyone
  // starts at NETWORKER_PLAYER_START - the server now spawns each seat at
  // its own maze corner.
  useEffect(() => {
    if (hasSpawnedRef.current) return
    const me = players.find((player) => player.username === localUsername)
    if (!me) return
    hasSpawnedRef.current = true
    cellRef.current = { row: me.row, col: me.col }
  }, [players, localUsername])

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
        durationMs: MOVE_DURATION_MS,
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
      if (event.key === DASH_KEY) {
        if (event.repeat) return
        // Stop page scroll / button activation; the tick loop below is what
        // actually enforces the cooldown, this just records the intent.
        event.preventDefault()
        dashRequestedRef.current = true
        return
      }

      const key = event.key.toLowerCase()
      if (!MOVE_KEYS.has(key)) return
      // Stop the browser's default arrow-key/space scroll, and signal to
      // extensions (e.g. vim-style keybinding tools) that the page already
      // handled this key so they don't also act on it.
      event.preventDefault()
      // Only push on a genuinely new press - OS auto-repeat re-fires keydown
      // for a key that's already held, and re-adding it would make it
      // impossible for a second, already-held key to ever take over.
      if (!heldKeysRef.current.includes(key)) {
        heldKeysRef.current.push(key)
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const index = heldKeysRef.current.indexOf(key)
      if (index !== -1) heldKeysRef.current.splice(index, 1)
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
      const tileSize = getTileSize(mazeRef.current, mazeColumns)

      if (tileSize > 0) {
        const token = playerTokenRef.current

        // Idle: try to start a move toward whichever held direction is walkable.
        if (!animationRef.current && token) {
          const direction = getActiveDirection(heldKeysRef.current)

          // The dash key is consumed the moment it's checked (whether or not
          // a direction is held), so a press with no direction held doesn't
          // linger and fire a dash later once one is.
          const dashRequested = dashRequestedRef.current
          dashRequestedRef.current = false

          if (direction) {
            const isDashReady = dashRequested && time - lastDashTimeRef.current >= DASH_COOLDOWN_MS
            const stepCount = isDashReady ? DASH_TILE_COUNT : 1

            const { row, col } = cellRef.current
            let targetRow = row
            let targetCol = col
            const visitedCells: Cell[] = []

            for (let step = 0; step < stepCount; step++) {
              const nextRow = targetRow + direction.deltaRow
              const nextCol = targetCol + direction.deltaCol
              if (!isNetworkerWalkable(nextRow, nextCol, networkerMap)) break
              targetRow = nextRow
              targetCol = nextCol
              visitedCells.push({ row: targetRow, col: targetCol })
            }

            if (visitedCells.length > 0) {
              if (isDashReady) lastDashTimeRef.current = time

              const durationMs =
                time < speedBoostUntilRef.current ? BOOSTED_MOVE_DURATION_MS : MOVE_DURATION_MS

              animationRef.current = {
                from: { row, col },
                to: { row: targetRow, col: targetCol },
                startTime: time,
                durationMs,
              }
              cellRef.current = { row: targetRow, col: targetCol }
              socket.emit("player_moved", { row: targetRow, col: targetCol })

              // Ask the server for permission to collect; it owns scoring and
              // will broadcast game_state_updated with the approved result.
              // Every tile passed through counts, not just the landing tile,
              // so dashing over an item still picks it up. Applying the
              // speed boost is optimistic (not waiting for server approval),
              // same as the dash cooldown - a purely client-side feel effect.
              for (const cell of visitedCells) {
                const passedItem = connectionItemsRef.current.find(
                  (item) => item.row === cell.row && item.col === cell.col && !item.isCollected,
                )
                if (passedItem) {
                  socket.emit("collect_item", { itemId: passedItem.itemId })
                  if (passedItem.kind === "premium") {
                    speedBoostUntilRef.current = time + SPEED_BOOST_DURATION_MS
                  }
                }
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
          token.classList.toggle("networker-maze-player-boosted", time < speedBoostUntilRef.current)
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
  }, [mazeColumns, networkerMap, socket])

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
          gridTemplateColumns: `repeat(${mazeColumns}, var(--networker-maze-tile-size))`,
        }}
      >
        {networkerMap.flatMap((mapRow, row) =>
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
                    className={`networker-maze-item${
                      item.kind === "premium" ? " networker-maze-item-premium" : ""
                    }`}
                    title={
                      item.kind === "premium"
                        ? "LinkedIn Premium: momentary speed boost"
                        : `${item.points} LinkedIn connections`
                    }
                  >
                    {/* Temporary text marker; replace with the final item visual. */}
                    {item.kind === "premium" ? "★" : "in"}
                  </span>
                )}
              </div>
            )
          }),
        )}

        <span
          ref={playerTokenRef}
          className={`networker-maze-player networker-maze-player-token networker-maze-player-self${seatColorClassName(mySeat)}`}
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
                paintCell(el, cell, getTileSize(mazeRef.current, mazeColumns))
              } else {
                remoteTokensRef.current.delete(player.username)
              }
            }}
            className={`networker-maze-player networker-maze-player-token${seatColorClassName(player.seat)}`}
            aria-label={player.username}
            title={player.username}
          />
        ))}
      </div>

      <p className="networker-maze-legend">
        <span className="networker-maze-legend-item">
          <span
            className={`networker-maze-player networker-maze-player-self${seatColorClassName(mySeat)}`}
            aria-hidden="true"
          />{" "}
          You
        </span>
        {otherPlayers.map((player) => (
          <span className="networker-maze-legend-item" key={player.username}>
            <span
              className={`networker-maze-player${seatColorClassName(player.seat)}`}
              aria-hidden="true"
            />{" "}
            {player.username}
          </span>
        ))}
        <span className="networker-maze-legend-item">
          <span className="networker-maze-item" aria-hidden="true">in</span>
          LinkedIn connection
        </span>
        <span className="networker-maze-legend-item">
          <span className="networker-maze-item networker-maze-item-premium" aria-hidden="true">★</span>
          LinkedIn Premium (speed boost)
        </span>
      </p>
    </section>
  )
}
