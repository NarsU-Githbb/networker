import { createFileRoute } from '@tanstack/react-router'


export const Route = createFileRoute('/game')({
  component: Game,
})

function Game() {
    

     return ( 
        <h1>Hello this is the game! </h1>
     )
}

