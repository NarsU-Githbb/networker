import { Server, Socket } from "socket.io";
import { tokenRandomizer } from "../utils/randomizer.js";


//need this customsocket here in a case of player disconnecting - it will indentify the
//disconnected user faster

interface CustomSocket extends Socket {
  username?: string;
  roomId?: string;
}

export interface AddRooms {
  ID: string;
  leadPlayer: {
    socketId: string
    username: string
  }
  players: {
    socketId: string;
    username: string;
  }[]; 
  maxPlayers: 4;
  liveState: "pending" | "live"
  gameState: "lobby" | "playing";
}

const activeRoom: AddRooms[] = []

export function handleLobby(io: Server, socket: CustomSocket) {

 // ----------------------------------------
  // LEAD PLAYER CREATES/RESERVES A ROOM
  // ----------------------------------------

  socket.on("create_room", (data: {username: string}) => {
     console.log(`${data.username} is creating a room.`);
      
     

  // Store the username directly on the socket instance for future tracking
    socket.username = data.username;

 // When a user connects, immediately send them the secure room ID
  const secureRoomId = tokenRandomizer();

  socket.roomId = secureRoomId;
 
const room: AddRooms = { 
  
       ID: secureRoomId,
  leadPlayer: { socketId: socket.id, username: data.username },
  players: [{ socketId: socket.id, username: data.username }],
  maxPlayers: 4, 
  liveState: "pending",
  gameState: "lobby" 
    };

     activeRoom.push(room)

socket.join(secureRoomId);

  socket.emit("room_made", {
    
      roomId: secureRoomId,
    })
     })

    socket.on("open_room", () => {
const roomId = socket.roomId;

    if (!roomId) {
      socket.emit("room_error", {
        message: "You don't have a room to open.",
      });
      return;
    }

    const room = activeRoom.find(
      (room) => room.ID === roomId
    );

    if (!room) {
      socket.emit("room_error", {
        message: "Room not found.",
      });
      return;
    }

    // Don't open it twice.
    if (room.liveState === "live") {
      socket.emit("room_error", {
        message: "Room is already open.",
      });
      return;
    }

    // THIS is the important change.
    room.liveState = "live";

    console.log(`Room ${room.ID} is now LIVE.`);

    socket.emit("room_opened", {
      roomId: room.ID,
    });
  });
  
    socket.on("join_lobby_channel", (data: { roomId: string }) => {
    socket.join(data.roomId); // CRUCIAL: Re-attaches User 1's active connection string to the channel
    console.log(`User 1 synced to channel: ${data.roomId}`);
     });




 

  
 

 // ----------------------------------------
  // OTHER PLAYERS JOINING THE LOBBY
  // ----------------------------------------


socket.on("verify_room", (data: { roomId: string }, callback) => {
  const foundRoom = activeRoom.find((room) => room.ID === data.roomId);

  if (foundRoom && foundRoom.liveState === "live") { //here add something that prevents other users to access before lead
    // Join User 2's socket to the room immediately
    socket.join(data.roomId);


    // Tell User 1 instantly that someone has connected to their room ID!
    io.to(data.roomId).emit("player_joined", { systemMessage: "Someone is joining..." });
    
    callback({ success: true });
  } else {
    callback({ success: false, error: "Chatroom ID not in use!" });
  }
});

socket.on("room_ready", (data: { roomId: string; username: string; }, callback) => {
    const foundRoom = activeRoom.find((room) => room.ID === data.roomId);

 // Room doesn't exist
    if (!foundRoom) {
      callback({
        success: false,
        error: "Chatroom ID not found!",
      });
      return;
    }

    // Room exists but hasn't been opened by lead
    if (foundRoom.liveState !== "live") {
      callback({
        success: false,
        error: "The lead player hasn't opened the room yet!",
      });
      return;
    }

    // Room is live, so joining is allowed
    socket.username = data.username;
    socket.roomId = data.roomId;

    foundRoom.players.push({
      socketId: socket.id,
      username: data.username,
    });

    socket.join(data.roomId);

    callback({
      success: true,
    });

    io.to(data.roomId).emit("player_name_added", {
      username: data.username,
    });
  }
);
}



