import { createFileRoute } from '@tanstack/react-router'
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { useEffect, useState} from 'react';
import { ChatScreen } from "../../../server/src/socket/chatSock";
import * as z from "zod"

const ChatSearchSchema = z.object({
  roomId: z.string().min(1, "Room ID is missing or invalid"),
   username: z.string().min(1, "Username is required"),
})

export const Route = createFileRoute('/chat')({
   validateSearch: (search) => ChatSearchSchema.parse(search),
  component: Chat,
})

function Chat() {
  const { roomId, username } = Route.useSearch()
   const { socket } = Route.useRouteContext() 
const [chatData, setChatData] = useState<ChatScreen>({ 
  room: roomId, 
  messages: [], 
  expiryTimeout: null
});
  const [messageText, setMessageText] = useState('');

  const handleSendMessage = () => {
  if (!messageText.trim() || !roomId || !username) return;

  const payload = {
    roomId: roomId,    
    sender: username,            
    text: messageText,
    timestamp: new Date().toISOString()
  };

  socket.emit("send_chat_message", payload);
  setMessageText('');
};

  useEffect(() => {

socket.emit("sync_chat", { roomId })

      socket.on("receive_message", (incomingMsg: { sender: string; text: string; timestamp: string }) => {
    setChatData((prev) => ({
      ...prev,
      messages: [
        ...prev.messages,
        {
          sender: incomingMsg.sender,
          text: incomingMsg.text,
          timestamp: new Date(incomingMsg.timestamp)
        }
      ]
    }));
  });


  return () => {
    socket.off("receive_message");
  };
}, [socket, roomId]);


  return ( 
    <>
    <Field className="flex flex-col h-screen max-h-screen pt-5 px-8 overflow-hidden box-border">
     <Textarea 
          id="chat-screen" 
          placeholder="Let the interaction begin!" 
          readOnly 
          className="flex-1 w-full border rounded-xl bg-background text-foreground resize-none focus:outline-none min-h-0"
          value={chatData.messages
    .map((msg) => {
      const formattedTime = msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `[${formattedTime}] ${msg.sender}: ${msg.text}`;
    })
    .join('\n')
  } 
        />
        
  
      <FieldLabel htmlFor="textarea-message" className="text-lg font-semibold text-foreground ml-1">Message</FieldLabel>
      <FieldDescription className="ml-1">Enter your message below.</FieldDescription>
      <textarea className="border-2 border-solid border-gray-400 p-1" id="textarea-message" placeholder="Type your message here." value={messageText}
        onChange={(e) => setMessageText(e.target.value)} />
      
       <button className="w-fit px-3 py-1.5 text-sm rounded-full bg-blue-500 hover:bg-blue-700 text-white font-medium self-start transition-colors mb-8" 
       type="button" onClick={handleSendMessage}>
       Send
       </button>
    </Field>
    </>
)
}

