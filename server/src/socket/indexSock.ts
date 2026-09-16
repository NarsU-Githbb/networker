import { Server, Socket } from "socket.io";
import { handleLobby } from "./lobbySock.js";
import { handleChat } from "./chatSock.js";
import { handleGame } from "./networkerSock.js";

export const initializeSocketRouter = (io: Server): void => {
  io.on("connection", (socket: Socket): void => {
    console.log(`[socket] User connected: ${socket.id}`);

    // Register all of your modular event handlers
    handleLobby(io, socket)
    handleChat(io, socket)
    handleGame(io, socket)

    socket.on("disconnect", () => {
      console.log(`[socket] User disconnected: ${socket.id}`);
    });
  });
};

