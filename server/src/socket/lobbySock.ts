import { Server, Socket } from "socket.io";
import { tokenRandomizer } from "../utils/randomizer.js";


//need this customsocket here in a case of player disconnecting - it will indentify the
//disconnected user faster

interface CustomSocket extends Socket {
  username?: string;
  roomId?: string;
}

//consider making an interface for players

export interface AddRooms {
  sessionId: string;
  leadPlayer: {
    connectionId: string
    username: string
  }
  players: {
    connectionId: string;
    username: string;
  }[]; 
  maxPlayers: 4;
  liveState: "pending" | "live"
  gameState: "lobby" | "playing" | "paused" | "ended";
}

//variable for holding all gaming rooms active right now across all the networks

const activeRooms: AddRooms[] = []

export function handleLobby(io: Server, socket: CustomSocket) {

 // ----------------------------------------
  // LEAD PLAYER CREATES/RESERVES A ROOM
  // ----------------------------------------

 // ----------------------------------------
  // list of socket events:
  // - create_room = initilizes the room & adds leadplayer in it, but doesn't open it for other players yet.
 //  - room_made = meanwhile, lead moves to step2 & this sends randomized roomId into UI for lead to copy. 
 //  - open_room = checks that all the conditions are right & opens the room for other players.
 //  - join_lobby = tells UI to navigate leadplayer to lobby/
 //  - lobby_state = Establishes the current authoritative state of the lobby with leadplayer being the lead.
  // ----------------------------------------
 

  socket.on("create_room", (data: {username: string}) => {
     console.log(`${data.username} is creating a room.`);
      
  // Store the username directly on the socket instance for future tracking
    socket.username = data.username;

 // When a user connects, immediately send them the secure room ID
  const secureRoomId = tokenRandomizer();

  socket.roomId = secureRoomId;
 
const room: AddRooms = { 
  
  sessionId: secureRoomId,
  leadPlayer: { connectionId: socket.id, username: data.username },
  players: [{ connectionId: socket.id, username: data.username }],
  maxPlayers: 4, 
  liveState: "pending",
  gameState: "lobby" 
    };

     activeRooms.push(room)

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

    const room = activeRooms.find(
      (room) => room.sessionId === roomId
    );

    if (!room) {
      socket.emit("room_error", {
        message: "Room not found.",
      });
      return;
    }

    // Don't open the room twice.
    if (room.liveState === "live") {
      socket.emit("room_error", {
        message: "Room is already open.",
      });
      return;
    }

    // THIS opens the room for everyone.
    room.liveState = "live";

    console.log(`Room ${room.sessionId} is now LIVE.`);

    socket.emit("join_lobby", {
      roomId: room.sessionId,
    });
  

    // Immediately synchronize the room's state.
  socket.emit("lobby_state", {
    playerCount: room.players.length,
    maxPlayers: room.maxPlayers,
    teamLead: true,
    liveState: room.liveState,
    gameState: room.gameState,
  });
});

 // ----------------------------------------
  // OTHER PLAYERS JOINING THE LOBBY
  // ----------------------------------------

  // ----------------------------------------
  // list of socket events:
  // -verify_room = asks "is this room joinable?"
 //  -player_joined = tells lobby immediately that player has added roomID for their session & has pressed make connection button.
 //  -joining_room = actually adds player into the room & tells UI to navigate to lobby
 //  -player_name_added = tells lobby who has joined
 //  -lobby_state = updates the lobby state for everyone in the lobby with new player joined in & adds him to player count as well.
  // ----------------------------------------


socket.on("verify_room", (data: { roomId: string }, callback) => {
  const foundRoom = activeRooms.find((room) => room.sessionId === data.roomId);

   // Room doesn't exist

  if (!foundRoom) {
    callback({
      success: false,
      error: "Chatroom ID not in use!",
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

  //Room exists but game has already launched / left lobby 

  if (foundRoom.gameState !== "lobby") {
    callback({
      success: false,
      error: "The game has already started.",
    });
    return;
  }

//room exists but max amount of players for a game is filled & at the lobby

  if (foundRoom.players.length >= foundRoom.maxPlayers) {
    callback({
      success: false,
      error: "Room is full.",
    });
    return;
  }

    io.to(data.roomId).emit("player_joined", { systemMessage: "Someone is joining..." });
    
    callback({ success: true });
  
});

socket.on("joining_room", (data: { roomId: string; username: string; }, callback) => {
    const foundRoom = activeRooms.find((room) => room.sessionId === data.roomId);

// lot of the logic here is the same as previous step in case if someone stops after verifying room & other users get in before they do / maxplayer get filled
    if (!foundRoom) {
      callback({
        success: false,
        error: "Chatroom ID not found!",
      });
      return;
    }

  //needs to check again in case lead exits suddenly
    if (foundRoom.liveState !== "live") {
      callback({
        success: false,
        error: "The lead player left, room in not available anymore.",
      });
      return;
    }

     if (foundRoom.gameState !== "lobby") {
      callback({
        success: false,
        error: "The game has already started.",
      });
      return;
    }

      if (foundRoom.players.length >= foundRoom.maxPlayers) {
      callback({
        success: false,
        error: "Room is full.",
      });
      return;
    }

    // Room is live, so joining is allowed
    socket.username = data.username;
    socket.roomId = data.roomId;

    foundRoom.players.push({
      connectionId: socket.id,
      username: data.username,
    });

    socket.join(data.roomId);

    callback({
      success: true,
    });

    io.to(foundRoom.sessionId).emit("player_name_added", {
      username: data.username
    });

  foundRoom.players.forEach((player) => {
  io.to(player.connectionId).emit("lobby_state", {
    playerCount: foundRoom.players.length,
    maxPlayers: foundRoom.maxPlayers,
    teamLead: player.connectionId === foundRoom.leadPlayer.connectionId,
    liveState: foundRoom.liveState,
    gameState: foundRoom.gameState,
  });
});
});
// ----------------------------------------
  // ACTUAL LOBBY SOCKETS: 
  // ----------------------------------------

  /*
// ----------------------------------------
  // 1. DiSCONNECTING FROM LOBBY (working process)
  // ----------------------------------------

socket.on("lead_disconnect", (callback) => {
  console.log(
    `${foundRoom.leadPlayer.username} left - ${foundRoom.sessionId} disbanding`
  );

io.to("lead_left"), (callback) => {
 roomId: foundRoom.sessionId,
}
  });

socket.on("player_disconnect", (callback) => {
 console.log(
    `${foundRoom.player.username} left`
  );
 io.to(data.roomId).emit("player_left", {
      username: data.username,
      playerCount: foundRoom.players.length - 1,
      maxPlayers: foundRoom.maxPlayers,
    });
  })
*/

// ----------------------------------------
  // 2. GAME LAUCH 
  // ----------------------------------------



socket.on("launch_game_session", (callback) => {
  const roomId = socket.roomId;

  if (!roomId) {
    callback({
      success: false,
      error: "You are not in a room.",
    });
    return;
  }

  const foundRoom = activeRooms.find(
    (room) => room.sessionId === roomId
  );

  if (!foundRoom) {
    callback({
      success: false,
      error: "Room not found.",
    });
    return;
  }

  // Only the lead player can start the game (how does this logic work?)
  if (foundRoom.leadPlayer.connectionId !== socket.id) {
    callback({
      success: false,
      error: "Only the lead player can start the game.",
    });
    return;
  }

  // Need at least 2 players
  if (foundRoom.players.length < 2) {
    callback({
      success: false,
      error: "You need at least 2 players to start.",
    });
    return;
  }

  // Don't start the game twice
  if (foundRoom.gameState !== "lobby") {
    callback({
      success: false,
      error: "The game has already started.",
    });
    return;
  }

  foundRoom.gameState = "playing";

  console.log(
    `Game ${foundRoom.sessionId} started by ${foundRoom.leadPlayer.username}`
  );

  callback({
    success: true,
  });

  // Tell EVERYONE in the room
  io.to(foundRoom.sessionId).emit("game_started", {
    roomId: foundRoom.sessionId,
  });
});
}
