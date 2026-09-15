import { createFileRoute } from '@tanstack/react-router'
import { NetworkerHud } from '@/components/networker/NetworkerHud'
import { NetworkerMaze } from '@/components/networker/NetworkerMaze'


export const Route = createFileRoute('/game')({
  component: Game,
})

function Game() {
  // The route composes the screen. Game state is read inside NetworkerHud from
  // Zustand so the route does not own gameplay or networking logic.
  return (
    <main className="networker-page">
      <NetworkerHud />
      <NetworkerMaze />
    </main>
  )
}
