import { memo, useEffect, useMemo, useRef } from "react"
import type { Socket } from "socket.io-client"
import { NetworkerStore, useNetworkerStore } from "@/lib/networker-store"
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

// Most remote moves allowed to wait in the playback queue before snapping.
const MAX_REMOTE_QUEUE = 8

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
const PAUSE_KEY = "p"

// The rendered tile size is a CSS clamp() that scales with viewport width
// (see --networker-maze-tile-size in index.css), so it can't be a constant -
// it's measured from the live grid. The measurement is cached (see the
// ResizeObserver effect in NetworkerMaze) rather than read inside the rAF loop,
// because reading clientWidth forces a synchronous layout every frame.

// When one step ends mid-frame, the next chained step starts at the exact end
// time instead of the (later) frame time, so the leftover milliseconds are not
// thrown away. Without this the token rests on a tile for a whole extra frame
// between steps, which reads as a stutter while holding a key. Gaps longer
// than this (idle, background tab) start fresh at the current frame time.
const MAX_CARRY_MS = 50
function chainStartTime(previousEndTime: number, time: number): number {
  const overshoot = time - previousEndTime
  return overshoot >= 0 && overshoot < MAX_CARRY_MS ? previousEndTime : time
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

// One maze tile - wall or floor, nothing else. Deliberately has no idea
// items exist: the server respawns items every couple of seconds for most of
// the match (the board starts under its cap and refills whenever one is
// collected), and that used to flow into this same grid, forcing React to
// re-run and diff all ~170 tiles on every respawn even though at most a
// couple of cells were affected. Splitting items out into MazeItems (below)
// means a respawn now only touches the handful of item elements that exist,
// never this grid.
const MazeTile = memo(function MazeTile({
  row,
  col,
  isWall,
}: {
  row: number
  col: number
  isWall: boolean
}) {
  return (
    <div
      className={`networker-maze-tile ${isWall ? "networker-maze-wall" : "networker-maze-floor"}`}
      // Explicit placement, not left to auto-flow: MazeItems below also
      // places elements into this same grid with an explicit row/column, and
      // CSS Grid's auto-placement algorithm treats explicitly-positioned
      // items as already "claiming" their cell - it then packs every
      // auto-placed item (these tiles, if left unpositioned) into the
      // remaining free cells, skipping whichever ones the items sit on. That
      // shifts every tile after an occupied cell out of place, and the shift
      // pattern changes with every spawn/collect - which is exactly the
      // "random, constantly changing map" bug. Giving tiles the same kind of
      // explicit position removes them from auto-placement entirely, so nothing
      // here can displace anything else.
      style={{ gridRow: row + 1, gridColumn: col + 1 }}
    />
  )
})

// The static wall/floor grid. Reads only the map, never item state, so it
// renders once per match and is otherwise left alone.
const MazeGrid = memo(function MazeGrid({ networkerMap }: { networkerMap: readonly string[] }) {
  return (
    <>
      {networkerMap.flatMap((mapRow, row) =>
        [...mapRow].map((tile, col) => (
          <MazeTile key={`${row}-${col}`} row={row} col={col} isWall={tile === "#"} />
        )),
      )}
    </>
  )
})

// The dynamic items layer. Rendered as direct children of the same CSS grid
// as MazeGrid (see .networker-maze), placed onto their cell with explicit
// grid-row/grid-column instead of pixel math - items don't animate between
// cells like the player tokens do, they just appear/disappear, so plain grid
// placement is enough and needs no tile-size measurement at all. Only the
// active items exist as elements (currently capped at 30), versus diffing
// all ~170 tiles on every respawn.
const MazeItems = memo(function MazeItems() {
  // The maze reads item state from Zustand, but does not award points or mark
  // items as collected. Those rules belong to the authoritative game state.
  const connectionItems = useNetworkerStore(
    (state) => state.gameState.connectionItems,
  )
  const mapId = useNetworkerStore((state) => state.gameState.mapId)
  const networkerMap = getNetworkerMap(mapId)
  const mazeColumns = networkerMap[0]?.length ?? 13
  // The first item on a cell wins, as before - two items were never meant to
  // stack on one tile.
  const visibleItems = useMemo(() => {
    const seenCells = new Set<number>()
    const items: NetworkerConnectionItem[] = []
    for (const item of connectionItems) {
      if (item.isCollected) continue
      const key = item.row * mazeColumns + item.col
      if (seenCells.has(key)) continue
      if (!isNetworkerWalkable(item.row, item.col, networkerMap)) continue
      seenCells.add(key)
      items.push(item)
    }
    return items
  }, [connectionItems, mazeColumns, networkerMap])

  return (
    <>
      {visibleItems.map((item) => (
        <span
          key={item.itemId}
          className={`networker-maze-item${
            item.kind === "premium" ? " networker-maze-item-premium" : ""
          }`}
          style={{ gridRow: item.row + 1, gridColumn: item.col + 1 }}
          title={
            item.kind === "premium"
              ? "LinkedIn Premium: momentary speed boost"
              : `${item.points} LinkedIn connections`
          }
        >
          {/* Temporary text marker; replace with the final item visual. */}
          {item.kind === "premium" ? "★" : "in"}
        </span>
      ))}
    </>
  )
})

// Temporary Person 2 prototype. Person 3 can replace this presentational grid
// with the rAF-driven renderer once keyboard movement and collision are ready.
export function NetworkerMaze({
  socket,
  localUsername,
  roomId,
}: {
  socket: Socket
  localUsername: string
  roomId: string
}) {
  const mapId = useNetworkerStore((state) => state.gameState.mapId)
  const networkerMap = getNetworkerMap(mapId)
  const mazeColumns = networkerMap[0]?.length ?? 13
  // Only the roster (usernames, in seat order) matters for rendering tokens.
  // Selecting a joined string keeps this component from re-rendering on every
  // snapshot, since positions/scores in `players` change constantly but the
  // roster does not. Positions are read on demand via getState().
  const rosterKey = useNetworkerStore((state) =>
    state.gameState.players.map((player) => player.username).join("\u0000"),
  )
  const phase = useNetworkerStore((state) => state.gameState.phase)
  // Seat = stable position in the room's player list, assigned once at
  // match start (createNetworkerState) and never reordered - used for both
  // spawn corner and color, so they stay in sync across every client.
  const playersWithSeat = useMemo(
    () =>
      (rosterKey ? rosterKey.split("\u0000") : []).map((username, seat) => ({
        username,
        seat,
      })),
    [rosterKey],
  )
  const mySeat = playersWithSeat.find((player) => player.username === localUsername)?.seat ?? 0
  const otherPlayers = useMemo(
    () => playersWithSeat.filter((player) => player.username !== localUsername),
    [playersWithSeat, localUsername],
  )

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
  const phaseRef = useRef(phase)

useEffect(() => {
  phaseRef.current = phase
}, [phase])

useEffect(() => {
  if (phase !== "playing") {
    heldKeysRef.current = []
    dashRequestedRef.current = false
  }
}, [phase])

  // Seed the local player's own cell from the store's authoritative spawn
  // position the first time it's available, instead of assuming everyone
  // starts at NETWORKER_PLAYER_START - the server now spawns each seat at
  // its own maze corner.
  useEffect(() => {
    if (hasSpawnedRef.current) return
    const me = NetworkerStore.getState().gameState.players.find(
      (player) => player.username === localUsername,
    )
    if (!me) return
    hasSpawnedRef.current = true
    cellRef.current = { row: me.row, col: me.col }
  }, [playersWithSeat, localUsername])

  // Render state for every OTHER player: their last known cell, an in-flight
  // interpolation (if they're mid-move), and the DOM token to animate.
  // Keyed by username since players can join/leave independently of rAF.
  const remoteTokensRef = useRef<Map<string, HTMLSpanElement>>(new Map())
  const remoteCellsRef = useRef<Map<string, Cell>>(new Map())
  const remoteAnimationsRef = useRef<Map<string, CellAnimation>>(new Map())
  // Moves received but not yet played. Network delivery is bursty (esp. over a
  // tunnel), so moves are queued and played back one after another instead of
  // restarting the slide on every message.
  const remoteQueueRef = useRef<Map<string, Cell[]>>(new Map())

  // Seed a remote player's tracked cell the first time we see them (e.g. when
  // the match starts). After that, only live player_moved events move them -
  // ignoring later game_state_updated snapshots here avoids visually
  // snapping a player backward to a slightly stale broadcast position.
  useEffect(() => {
    const players = NetworkerStore.getState().gameState.players
    for (const other of otherPlayers) {
      const player = players.find((candidate) => candidate.username === other.username)
      if (player && !remoteCellsRef.current.has(player.username)) {
        remoteCellsRef.current.set(player.username, { row: player.row, col: player.col })
      }
    }

    const currentUsernames = new Set(otherPlayers.map((player) => player.username))
    for (const username of remoteCellsRef.current.keys()) {
      if (!currentUsernames.has(username)) {
        remoteCellsRef.current.delete(username)
        remoteAnimationsRef.current.delete(username)
        remoteQueueRef.current.delete(username)
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
      if (!remoteCellsRef.current.has(username)) {
        remoteCellsRef.current.set(username, { row, col })
        return
      }

      const queue = remoteQueueRef.current.get(username) ?? []
      queue.push({ row, col })

      // Far behind (e.g. a stalled connection): stop replaying old steps and
      // jump straight to the latest position.
      if (queue.length > MAX_REMOTE_QUEUE) {
        remoteAnimationsRef.current.delete(username)
        remoteCellsRef.current.set(username, { row, col })
        queue.length = 0
      }

      remoteQueueRef.current.set(username, queue)
    }

    socket.on("player_moved", handlePlayerMoved)
    return () => {
      socket.off("player_moved", handlePlayerMoved)
    }
  }, [socket])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
    

  if (event.key === PAUSE_KEY) {
    if (event.repeat) return

    event.preventDefault()

    if (phase === "playing") {
      socket.emit("pause_game",{ roomId })
    }

    return
  }

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
  }, [socket, roomId, phase])

  // Tile size in px, refreshed only when the maze element actually resizes.
  const tileSizeRef = useRef(0)
  // Last boost-class state written to the token, so the loop only touches the
  // DOM when it changes instead of every frame.
  const isBoostedRef = useRef(false)
  // When the local player's last step ended (see chainStartTime).
  const animationEndRef = useRef(-Infinity)

  useEffect(() => {
    const mazeEl = mazeRef.current
    if (!mazeEl) return

    const measure = () => {
      tileSizeRef.current = mazeEl.clientWidth / mazeColumns
    }
    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(mazeEl)
    return () => observer.disconnect()
  }, [mazeColumns])

  useEffect(() => {
    let frameId: number

    const tick = (time: number) => {
      const tileSize = tileSizeRef.current

      if (tileSize > 0) {
        const token = playerTokenRef.current

        // Retire a finished step *before* looking for the next one, so a held
        // key chains straight into the next step on this same frame instead of
        // resting on the tile for an extra frame.
        const finishing = animationRef.current
        if (finishing && time - finishing.startTime >= finishing.durationMs) {
          animationEndRef.current = finishing.startTime + finishing.durationMs
          animationRef.current = null
        }

        // Idle: try to start a move toward whichever held direction is walkable.
        if (phaseRef.current === "playing" && !animationRef.current && token) {
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
                startTime: chainStartTime(animationEndRef.current, time),
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
                const passedItem = NetworkerStore.getState().gameState.connectionItems.find(
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
            animationEndRef.current = animation.startTime + animation.durationMs
            animationRef.current = null
          }
          if (!animationRef.current) {
            paintCell(token, cellRef.current, tileSize)
          }
          const isBoosted = time < speedBoostUntilRef.current
          if (isBoosted !== isBoostedRef.current) {
            isBoostedRef.current = isBoosted
            token.classList.toggle("networker-maze-player-boosted", isBoosted)
          }
        }

        // Same treatment, driven by the last player_moved message instead of
        // local input, for every other player in the room.
        remoteCellsRef.current.forEach((_restCell, username) => {
          const remoteToken = remoteTokensRef.current.get(username)
          if (!remoteToken) return

          let animation = remoteAnimationsRef.current.get(username)
          let nextStartTime = time
          if (animation && applyAnimationFrame(remoteToken, animation, time, tileSize)) {
            nextStartTime = chainStartTime(animation.startTime + animation.durationMs, time)
            // The slide finished: that target is now the resting cell.
            remoteCellsRef.current.set(username, animation.to)
            remoteAnimationsRef.current.delete(username)
            animation = undefined
          }

          if (!animation) {
            const queue = remoteQueueRef.current.get(username)
            const next = queue?.shift()
            const from = remoteCellsRef.current.get(username)
            if (next && from && queue) {
              // Play faster while a backlog exists so the token catches up.
              animation = {
                from,
                to: next,
                startTime: nextStartTime,
                durationMs: Math.max(40, MOVE_DURATION_MS / (1 + queue.length)),
              }
              remoteAnimationsRef.current.set(username, animation)
              applyAnimationFrame(remoteToken, animation, time, tileSize)
            }
          }

          if (!animation) {
            const restCell = remoteCellsRef.current.get(username)
            if (restCell) paintCell(remoteToken, restCell, tileSize)
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
          // The CSS variable scales the map for the viewport; the ResizeObserver
          // reads the rendered result back for the rAF loop's pixel math.
          gridTemplateColumns: `repeat(${mazeColumns}, var(--networker-maze-tile-size))`,
        }}
      >
        <MazeGrid networkerMap={networkerMap} />
        <MazeItems />

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
                const cell =
                  remoteCellsRef.current.get(player.username) ??
                  NetworkerStore.getState().gameState.players.find(
                    (candidate) => candidate.username === player.username,
                  ) ?? { row: 0, col: 0 }
                // Before the first measurement the size is 0; the rAF loop
                // paints resting tokens every frame, so skipping is safe.
                if (tileSizeRef.current > 0) paintCell(el, cell, tileSizeRef.current)
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
