import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
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
  const navigate = useNavigate()
  const [rematchError, setRematchError] = useState<string | null>(null)
  const setGameState = useNetworkerStore((state) => state.setGameState)

  // The server is authoritative: it applies collection events, decides scores,
  // the winner, and elapsed time, then broadcasts the approved snapshot.
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

  useEffect(() => {
    const handleReturnToLobby = () => {
      navigate({ to: '/lobby', search: { roomId, username } })
    }

    socket.on('return_to_lobby', handleReturnToLobby)
    return () => socket.off('return_to_lobby', handleReturnToLobby)
  }, [navigate, roomId, socket, username])

  const handlePlayAgain = () => {
    setRematchError(null)
    socket.timeout(5000).emit(
      'play_again',
      (error: Error | null, response?: { success: boolean; error?: string }) => {
        if (error) {
          setRematchError('The server did not respond. Please restart the server and try again.')
          return
        }

        if (!response?.success) {
          setRematchError(response?.error ?? 'Unable to start another game.')
          return
        }
      },
    )
  }

  return (
    <main className="networker-page">
      <div className="networker-game-layout">
        <NetworkerMaze socket={socket} localUsername={username} roomId={roomId} />
        <aside className="networker-sidebar" aria-label="Match information">
          <NetworkerHud />
        </aside>

        <NetworkerOverlay
          localUsername={username}
          socket={socket}
          onPlayAgain={handlePlayAgain}
          rematchError={rematchError}
        />
      </div>
    </main>
  )
}
