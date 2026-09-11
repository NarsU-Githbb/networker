import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from "@tanstack/react-form"
import { toast } from "sonner" //This is a direct trigger function to launch temporary alert notifications.
import * as z from "zod" //zod is a validation tool for the username
import { motion } from "framer-motion";

// Import your primitives from the UI folder
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { getInvitedPlayerSchema } from "@/lib/player-schema"

export const Route = createFileRoute('/connecting')({
  component: Connection,
})

function Connection() {
   const { socket } = Route.useRouteContext() 
  const navigate = useNavigate() 
  const [existingPlayers, setExistingPlayers] = useState<string[]>([]) //<-fix this
  const [step, setStep] = useState(1)
  const [secureRoomId, setSecureRoomId] = useState<string>("")


  const playerProcessID = () => {
  if (!secureRoomId.trim()) {
    toast.error("Please enter a chatroom ID!");
    return;
  }
  socket.emit(
    "verify_room", 
    { roomId: secureRoomId }, 
    (response: { success: boolean; error?: string }) => {
      if (response.success) {
        toast.success("Room found! Notifying host...");
        setStep(2);
      } else {
        toast.error(response.error || "Invalid Chatroom ID!");
      }
    }
  );
};

  const form = useForm({
     defaultValues: {username: "" },
     validators: { onSubmit: getInvitedPlayerSchema(existingPlayers)  },
     onSubmit: async ({ value }) => {
       socket.emit(
        "joining_room", 
        { roomId: secureRoomId, username: value.username }, 
        (response: { success: boolean }) => {
          if (response.success) {
            toast.success("Successfully joined the lobby!");
            navigate({ 
              to: '/lobby',
              search: {
                roomId: secureRoomId,
                username: value.username
              }
            })
          } else {
            toast.error(response.error || "Unable to join the room.");
          }
        });
    },
  })
  
  return (    
      <div className="flex-col justify-center items-center h-screen p-6 mt-25 w-full max-w-md mx-auto overflow-hidden">
        <motion.div 
          className="flex w-[200%] box-border" 
          animate={{ x: step === 1 ? "0%" : "-50%" }} 
          transition={{ type: "spring", stiffness: 300, damping: 30 }} 
        >
                    {/* --- CARD 1 STEP --- */}
          <div className="w-1/2 pl-20 shrink-0"> 
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Add Your Game ID Here!</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field>
                  <FieldLabel htmlFor="generated-link">Game ID</FieldLabel>
                  <div className="flex gap-2">
                    <Input id="generated-link" value={secureRoomId}  onChange={(e) => setSecureRoomId(e.target.value)} className="bg-muted" />
                  </div>
                </Field>
              </CardContent>
              <CardFooter>
                <Field orientation="horizontal" className="w-full justify-end gap-2">
                  <Button id= "make-connection-btn" type="button" form="id-form" onClick= {playerProcessID} >
                    <p>Make Connection</p>
                  </Button>
                </Field>
              </CardFooter>
            </Card> 
          </div>
  
       
    

          {/* --- CARD 2 STEP --- */}
          <div className="w-1/2 pl-12 ml-[-40px] shrink-0">
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Welcome Junior Dev!</CardTitle>
              </CardHeader>
             
                <form
                  id="questionnaire-form2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    form.handleSubmit()
                  }}
                >
                   <CardContent>
                  <FieldGroup>
                    <form.Field
                      name="username"
                      children={(field) => {
                        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor="q-username">Player Name</FieldLabel>
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
                  </CardContent>
             
              
              <CardFooter>
                <Field orientation="horizontal" className="w-full justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => form.reset()}>Reset</Button>
                  <Button id= "nxt-step-btn2" type="submit">Next Step</Button>
                </Field>
              </CardFooter>
                 </form>
            </Card>
                </div>
             </motion.div> 
          </div>
    )
}

  
