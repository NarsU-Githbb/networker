import { createFileRoute, useNavigate } from '@tanstack/react-router'
import WaitingLobbyIcon from '@/components/WaitingIcon'
import { useState, useEffect, useRef } from "react";
import { Field, FieldLabel } from "@/components/ui/field"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import * as z from "zod"

const lobbySearchSchema = z.object({
  roomId: z.string().min(1, "Room ID is missing or invalid"),
   username: z.string().min(1, "Username is required"),
})

export const Route = createFileRoute('/lobby')({
  validateSearch: (search) => lobbySearchSchema.parse(search),
  component: Lobbying,
})

 

function Lobbying() {
  const { socket } = Route.useRouteContext() 
  const navigate = useNavigate()
   const { roomId, username } = Route.useSearch()
   const [playerCount, setPlayerCount] = useState<number>(1);
   const [teamLead, setTeamLead] = useState(false);
   const [liveState, setLiveState] = useState<"pending" | "live">("pending");
   const [gameState, setGameState] = useState<"lobby" | "playing" | "paused" | "ended">("lobby");
  const [notification, setNotification] = useState<string>("")
  const [isError, setIsError] = useState<boolean>(false)
  const [countdown, setCountdown] = useState<number>(10 * 60); 

const canStartGame = teamLead && playerCount >= 2;
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

   // Helper function to turn total seconds into a clean "MM:SS" string
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };


//function that starts the game
 const gameLaunch = () => {
  socket.emit("launch_game_session", (response: { success: boolean; error?: string }) => {
    if (!response.success) {
      setIsError(true);
      setNotification(response.error || "Unable to start game.");
    }
  });
};

// NOT FINISHED YET ---- DISCONNECTING LOGIC -->

/*
const lobbyExit = () => {
if (teamLead) {
  socket.emit("lead_disconnect", (response: { success: boolean, error?: string}) => {
  if (!response.success) {
    setIsError(true);
    setNotification("Unable to leave hobby")
  }
  }
)}

if (!teamLead) {
socket.emit("player_disconnect", (response: { success: boolean, error?: string}) => {
 if (!response.success) {
    setIsError(true);
    setNotification("Unable to leave hobby")
 }
 if (response.success) {
  setIsError(false)
  setNotification(`${foundRoom.player.username} left`)
 }
}
)}

}
*/

//<---CHECK DISCONECTING LOGIC

  useEffect(() => {

    socket.on("lobby_state",
    (data: {
    playerCount: number,
    maxPlayers: number,
    teamLead: boolean,
    liveState: "pending" | "live",
    gameState: "lobby" | "playing" | "paused" | "ended",
  }) => {
    setPlayerCount(data.playerCount);
    setTeamLead(data.teamLead);
    setLiveState(data.liveState)
    setGameState(data.gameState)
  }
);
    const intervalId = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          setIsError(true);
          setNotification("Lobby closing due to inactivity. Redirecting home...")
    
    setTimeout(() => {
      navigate({ to: '/' }) 
    }, 3000) 
   return 0;
        }
        return prev - 1;
      });
    }, 1000);

      countdownIntervalRef.current = intervalId;

    socket.on("player_joined", () => {
      setIsError(false)
      setNotification("Someone is joining your room! Waiting for them to choose a name...")
    })

     socket.on("player_name_added", (data: { username: string }) => {

    setNotification(`Connected! ${data.username} has joined the room.`);
  }
);
    
socket.on("game_started", () => {
  navigate({
    to: "/game",
    search: { roomId, username },
  });
});

//CHECK THIS DISCONNECTING LOGIC
socket.on("lead_left", () => {
navigate({
to: "/"

})
})
//<--CHECK THIS DISCONNECTING LOGIC



    return () => {
       if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
     }
     socket.off("lobby_state")
      socket.off("connect")
      socket.off("player_joined")
      socket.off("player_name_added") 
      socket.off("game_started")
    }
  }, [socket, navigate, roomId, username])

  return (
    
    <div className="flex-col justify-center items-center h-screen p-6 mt-25 w-full max-w-md mx-auto overflow-hidden">
      <p className={`font-semibold mb-10 ${isError ? 'text-red-600' : 'text-green-600'}`}>
        {notification}
      </p>
              <Card className="w-full gap-x-80">
                <CardHeader>
                  <CardTitle>Game Lobby</CardTitle>
                </CardHeader>
                <CardContent>
                  <Field>
                    <FieldLabel htmlFor="q-username">
                      <div className="flex flex-col gap-5 w-full"> 
                       <span>{teamLead ? "Looking for players..." : "Waiting for teamlead to start the game..."}</span>

                         {/* Room Capacity Tracker */}
                
        <div className="flex justify-between items-center text-sm font-semibold text-zinc-600 dark:text-zinc-400 mt-2">
          
       
          <span>Players in lobby:</span>
          <span className="bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded text-zinc-900 dark:text-zinc-100">
            {playerCount} / 4
          </span>

        </div>
      
              <span className="flex items-endfont-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-sm font-bold">
                Time Left: {formatTime(countdown)}
              </span>
    
        
              </div>
                      </FieldLabel>
                    </Field>
          <WaitingLobbyIcon />
          </CardContent> 
          <CardFooter>
                        <Field orientation="horizontal" className="w-full justify-end gap-2">
                          <Button type="button" variant="outline" /* onClick={lobbyExit}*/>
                            <p>Cancel</p>
                            </Button>
                           <Button type="button" onClick={gameLaunch} disabled={!canStartGame}>
  {playerCount < 2
    ? "WAITING FOR PLAYERS"
    : teamLead
      ? "GAME START"
      : "WAITING FOR HOST"}
</Button>
</Field>
</CardFooter>
</Card>
</div>
   
        
   

  )
};