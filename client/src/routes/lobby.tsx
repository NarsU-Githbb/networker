import { createFileRoute, useNavigate } from '@tanstack/react-router'
import WaitingLobbyIcon from '@/components/WaitingIcon'
import { useState, useEffect } from 'react'
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

  useEffect(() => {

      if (roomId) {
      socket.emit("join_lobby_channel", { roomId });
    }
     const timeout = setTimeout(() => {
    setIsError(true)
    setNotification("Connection error! Redirecting to home...")
    
    setTimeout(() => {
      navigate({ to: '/' }) 
    }, 5000) 
  }, 10 * 60 * 1000)

    socket.on("user2_joined", () => {
      setIsError(false)
      setNotification("Someone joined your room! Waiting for them to choose a name...")
    })

     socket.on("user2_name_added", (data: { username: string }) => {
      setNotification(`Connected! Starting chat with ${data.username}...`)

    setTimeout(() => {
        navigate({ to: '/chat', search: { roomId, username } })
      }, 3000)
    })
    

    return () => {
      clearTimeout(timeout)
      socket.off("connect")
      socket.off("user2_joined")
      socket.off("user2_identity_revealed") 
    }
  }, [socket, navigate, roomId])
  return (
    
    <div className="flex-col justify-center items-center h-screen p-6 mt-25 w-full max-w-md mx-auto overflow-hidden">
      <p className={`font-semibold mb-10 ${isError ? 'text-red-600' : 'text-green-600'}`}>
        {notification}
      </p>
              <Card className="w-full gap-x-80">
                <CardHeader>
                  <CardTitle>Chat Lobby</CardTitle>
                </CardHeader>
                <CardContent>
                  <Field>
                    <FieldLabel htmlFor="q-username">Matching you with a chat partner...</FieldLabel>
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