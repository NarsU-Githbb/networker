import { Server, Socket } from "socket.io";


export interface ChatScreen {

  room: string | null; 
  messages: Array<{ sender: string 
    text: string; 
    timestamp: Date }>;

  expiryTimeout: any; 
}

export function handleChat(io: Server, socket: Socket) {
  socket.on("sync_chat", (data: { roomId: string }) => {
    socket.join(data.roomId);
   }) 

socket.on("send_chat_message", (data: { roomId: string; sender: string; text: string; timestamp: string }) => {
  io.to(data.roomId).emit("receive_message", data);
});
} ;
