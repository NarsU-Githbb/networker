import { Server, Socket } from "socket.io";
import { activeRooms, removePlayerFromRoom } from "./lobbySock.js";

/*unexpected connection loss sock across the program
 (for example closing browser or network disconnection)
*/

export function handleSocketDisconnect(
  io: Server,
  socket: Socket
) {

  const roomId = socket.roomId;

  if (!roomId) {
    return;
  }

  const room = activeRooms.find(
    (room) => room.sessionId === roomId
  );

  if (!room) {
    return;
  }

  const player = room.players.find(
    (player) => player.connectionId === socket.id
  );

  if (!player) {
    return;
  }

  console.log("[disconnect] Starting 30s removal timer", {
    username: player.username,
    roomId,
    socketId: socket.id,
  });


/* add 30 second disconnect timer so that player doesn't get disconnected immidiately if 
their internet connection cuts for a second or two for example.
*/

  player.disconnectTimer = setTimeout(() => {
    const currentRoom = activeRooms.find(
      (room) => room.sessionId === roomId
    );

    if (!currentRoom) {
      return;
    }

    const currentPlayer = currentRoom.players.find(
      (player) => player.connectionId === socket.id
    );

    if (!currentPlayer) {
      return;
    }

    console.log("[disconnect] Removing player after timeout", {
      username: currentPlayer.username,
      roomId,
    });

    removePlayerFromRoom(currentRoom, socket, io);
  }, 30_000);
}

