import { useState, useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from "@tanstack/react-form"
import { toast } from "sonner" //This is a direct trigger function to launch temporary alert notifications.
import * as z from "zod" //zod is a validation tool for the username
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {leadPlayerSchema} from "@/lib/player-schema"


export const Route = createFileRoute('/begin')({
  component: Begin,
})

function Begin() {
 const { socket } = Route.useRouteContext() 
   const navigate = useNavigate()
    const [step, setStep] = useState(1)
  const [lead, setLead] = useState<string>("")
  const [secureRoomId, setSecureRoomId] = useState<string>("")

  

 const form = useForm({
    defaultValues: {username: "" },
    validators: { onSubmit: leadPlayerSchema },
    onSubmit: async ({ value }) => { //Async might not be needed here?
      setLead(value.username)
      socket.emit("create_room", {username: value.username})
      toast("Form successfully submitted!", {
        description: `Logged username: ${value.username}`,
        position: "bottom-right",
      })
       setStep(2)
    },
  })

  useEffect(() => {
    const handleRoomMade = (data: { roomId: string }) => {
    setSecureRoomId(data.roomId);
  };

  const handleRoomOpened = (data: { roomId: string }) => {
    navigate({
      to: "/lobby",
      search: {
        roomId: data.roomId,
        username: lead,
      },
    });
  };

  socket.on("room_made", handleRoomMade);
  socket.on("room_opened", handleRoomOpened);

  return () => {
    socket.off("room_made", handleRoomMade);
    socket.off("room_opened", handleRoomOpened);
  };
}, [socket, navigate, lead]);

   const handleProceedToLobby = () => {
    if (!secureRoomId) {
      toast.error("Room ID hasn't generated yet. Please wait a moment.");
      return;
    }

    socket.emit("open_room")
    
    navigate({
      to: '/lobby',
      search: {
        roomId: secureRoomId,
        username: lead,
      },
    })
  };


  return ( 
    <div className="flex-col justify-center items-center h-screen p-6 mt-25 w-full max-w-md mx-auto overflow-hidden">
      <motion.div 
        className="flex w-[200%] box-border" 
        animate={{ x: step === 1 ? "0%" : "-50%" }} 
        transition={{ type: "spring", stiffness: 300, damping: 30 }} 
      >
        {/* --- CARD ONE STEP --- */}
        <div className="w-1/2 pl-12 ml-[-40px] shrink-0">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Welcome Teamlead!</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                id="questionnaire-form"
                onSubmit={(e) => {
                  e.preventDefault() // Stops the browser from reloading the page
                  e.stopPropagation() // Stops the event from bubbling up the DOM
                  form.handleSubmit() // This explicitly passes control to TanStack Form
                }}
              >
                <FieldGroup>
                  <form.Field
                    name="username"
                    children={(field) => {
                      const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor="q-username">Player name</FieldLabel>
                          <Input
                            id="q-username"
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            placeholder="Type here..."
                          />
                          <FieldDescription>This name will identify you amongst other players.</FieldDescription>
                          {isInvalid && <FieldError errors={field.state.meta.errors as any} />}
                        </Field>
                      )
                    }}
                  />
                </FieldGroup>
              </form>
            </CardContent>
            <CardFooter>
              <Field orientation="horizontal" className="w-full justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => form.reset()}>Reset</Button>
                <Button id= "nxt-step-btn" type="submit" form="questionnaire-form">Next Step</Button>
              </Field>
            </CardFooter>
          </Card> 
        </div>

        {/* --- CARD TWO STEP --- */}
        <div className="w-1/2 pl-20 shrink-0"> 
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Your Game ID is Ready!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field>
                <FieldLabel htmlFor="generated-link">Game ID</FieldLabel>
                <div className="flex gap-2">
                  <Input id="generated-link" value={secureRoomId} readOnly className="bg-muted" />
                  <Button 
                    type="button" 
                    variant="secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(secureRoomId)
                      toast.success("ID copied!")
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </Field>
            </CardContent>
            <CardFooter>
              <Field orientation="horizontal" className="w-full justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setStep(1)
                    form.reset()
                  }}
                >
                  Back
                </Button>
                <Button type="button" onClick={handleProceedToLobby}>
                 Create Room
                </Button>
              </Field>
            </CardFooter>
          </Card> 
        </div>

      </motion.div> 
    </div> 
  )

}
