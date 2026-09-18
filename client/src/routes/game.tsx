import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import * as z from 'zod'
import { NetworkerHud } from '@/components/networker/NetworkerHud'
import { NetworkerMaze } from '@/components/networker/NetworkerMaze'
import { NetworkerOverlay } from '@/components/networker/NetworkerOverlay'
import { useNetworkerStore } from '@/lib/networker-store'
import type { NetworkerGameState } from '@/lib/networker-game'

const gameSearchSchema = z.object({
  roomId: z.string().min(1, 'Room ID is missing or invalid'),
  username: z.string().min(1, 'Username is required'),
})

export const Route = createFileRoute('/game')({
  validateSearch: (search) => gameSearchSchema.parse(search),
  component: Game,
})

function Game() {
  const { socket } = Route.useRouteContext()
  const { roomId, username } = Route.useSearch()
  const setGameState = useNetworkerStore((state) => state.setGameState)

  // The server is authoritative: it applies collect_item, decides scores and
  // the winner, then broadcasts the approved state for every client to render.
  useEffect(() => {
    const handleGameStateUpdated = (gameState: NetworkerGameState) => {
      setGameState(gameState)
    }

    socket.on('game_state_updated', handleGameStateUpdated)
    // Covers landing on /game (or refreshing it) after the initial
    // game_state_updated broadcast already fired and was missed.
    socket.emit('request_game_state', { roomId })

    return () => {
      socket.off('game_state_updated', handleGameStateUpdated)
    }
  }, [socket, roomId, setGameState])

  return (
    <main className="networker-page">
      <div className="networker-game-layout">
        <NetworkerMaze socket={socket} localUsername={username} roomId={roomId} />
        <aside className="networker-sidebar" aria-label="Match information">
          <NetworkerHud />
        </aside>

        <NetworkerOverlay localUsername={username} />
      </div>
    </main>
  )
}
