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
  const [notification, setNotification] = useState<string>("")
  const [isError, setIsError] = useState<boolean>(false)
  const [countdown, setCountdown] = useState<number>(10 * 60); 

  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

   // Helper function to turn total seconds into a clean "MM:SS" string
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  useEffect(() => {

      if (roomId) {
      socket.emit("join_lobby_channel", { roomId });
    }
 // 2. Start ticking down by 1 second, every second
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current!);
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

    socket.on("player_joined", () => {
      setIsError(false)
      setNotification("Someone joined your room! Waiting for them to choose a name...")
    })

     socket.on("player_name_added", (data: { username: string }) => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      setNotification(`Connected! Starting chat with ${data.username}...`)

    setTimeout(() => {
        navigate({ to: '/chat', search: { roomId, username } })
      }, 3000)
    })
    

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      socket.off("connect")
      socket.off("player_joined")
      socket.off("player_name_added") 
    }
  }, [socket, navigate, roomId])

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
                       <span>Looking for players...</span>
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
                          <Button type="button" variant="outline">
                            <a href="/">Cancel</a>
                            </Button>
                        </Field>
                        </CardFooter>
          </Card>
        </div>
   
        
   

  )
};