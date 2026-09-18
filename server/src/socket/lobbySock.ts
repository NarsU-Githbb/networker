import { Server, Socket } from "socket.io";
import { tokenRandomizer } from "../utils/randomizer.js";
import {
  getNetworkerGameState,
  startNetworkerGame,
} from "./networkerSock.js";


/*need this customsocket here in a case of player disconnects - it will indentify which 
lobby a disconnected/reconnecting player belongs to. */

export interface CustomSocket extends Socket {
  username?: string;
  roomId?: string;
}

export interface AddRooms {
  sessionId: string;
  leadPlayer: {
    connectionId: string
    username: string
  }
  players: {
    connectionId: string;
    username: string;
    disconnectTimer?: ReturnType<typeof setTimeout>;
  }[]; 
  maxPlayers: 4;
  liveState: "pending" | "live"
  gameState: "lobby" | "playing";
  expiresAt: number
}

//variable for holding all gaming rooms active right now across all the networks

const activeRooms: AddRooms[] = []

function destroyRoom(room: AddRooms, io: Server) {
  const index = activeRooms.indexOf(room);

  if (index !== -1) {
    activeRooms.splice(index, 1);
  }

  io.to(room.sessionId).emit("lobby_expired");

//System has 2 rooms: activeRooms & socket rooms so need to clean room from both:

  io.in(room.sessionId).socketsLeave(room.sessionId);
}

function removePlayerFromRoom(room: AddRooms, socket: CustomSocket, io: Server) {

  const playerIndex = room.players.findIndex(
    (player) => player.connectionId === socket.id
  );

  if (playerIndex === -1) {
    return;
  }

  const player = room.players[playerIndex];

  // Host leaving = destroy the entire lobby

  if (player.connectionId === room.leadPlayer.connectionId) {
    destroyRoom(room, io);
    return;
  }

  // Remove normal player & remove their Socket.IO room membership

  room.players.splice(playerIndex, 1);
  socket.leave(room.sessionId);

  // Tell everyone else that the player left the room

  io.to(room.sessionId).emit("player_left", {
    username: player.username,
    playerCount: room.players.length,
  });

  // Send updated authoritative state to everyone

  room.players.forEach((remainingPlayer) => {
    io.to(remainingPlayer.connectionId).emit("lobby_state", {
      playerCount: room.players.length,
      maxPlayers: room.maxPlayers,
      teamLead:
        remainingPlayer.connectionId === room.leadPlayer.connectionId,
      liveState: room.liveState,
      gameState: room.gameState,
      expiresAt: room.expiresAt,
    });
  });
}

export function handleLobby(io: Server, socket: CustomSocket) {

 /* ----------------------------------------
     LEAD PLAYER CREATES/RESERVES A ROOM
 -------------------------------------------

 -------------------------------------------
list of socket events:
- create_room = initilizes the room & adds leadplayer in it, but doesn't open it for other players yet.
- room_made = meanwhile, lead moves to step2 & this sends randomized roomId into UI for lead to copy & share. 
- open_room = checks that all the conditions are right & opens the room for other players.
- join_lobby = tells UI to navigate leadplayer to lobby/
- lobby_state = Establishes the current authoritative state of the lobby with leadplayer being the lead.
 ------------------------------------------*/
 

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
  gameState: "lobby",
expiresAt: 0,
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

    //adds 10 minute expiration timer to the lobby

    room.expiresAt = Date.now() + 10 * 60 * 1000;

    setTimeout(() => {
  const currentRoom = activeRooms.find(
    (r) => r.sessionId === room.sessionId
  );

  if (!currentRoom) {
    return;
  }

/*if gamestate is still lobby after 10mins then destroyroom - otherwise if timer is up &
gamestate is something else like "playing" then nothing happens */

  if (currentRoom.gameState === "lobby" ) {
    destroyRoom(currentRoom, io);
  }
}, 10 * 60 * 1000);

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
    expiresAt: room.expiresAt
  });

});

/* ----------------------------------------
    OTHER PLAYERS JOINING THE LOBBY
   ----------------------------------------

-------------------------------------------
  list of socket events:

 -verify_room = asks "is this room joinable?"
 -player_joined = tells lobby immediately that player has added roomID for their session & has pressed make connection button.
 -unique_username_check = checks that the username is actually unique
 -joining_room = actually adds player into the room & tells UI to navigate to lobby
 -player_name_added = tells lobby who has joined
 -lobby_state = updates the lobby state for everyone else in the lobby with new players info & adds him to player count as well.
 -request_synced_state = Updates the current lobby_state for the player who joined as well. 
 ------------------------------------------*/


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

  //Room exists, but has expired

  if (Date.now() >= foundRoom.expiresAt) {
  callback({
    success: false,
    error: "This lobby has expired.",
  });
  return;
}

//Room exists but max amount of players for a game is filled

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

socket.on("unique_username_check", (  data: { roomId: string; username: string }, callback) => {
  
  const foundRoom = activeRooms.find(
      (room) => room.sessionId === data.roomId
    );


  if (!foundRoom) {
    callback({
        success: false,
        error: "Room not found.",
      });
      return;
    }

    const existingPlayer = foundRoom.players.find(
      (player) => player.username === data.username
    );

    if (existingPlayer) {
callback({
success:false,
error: "Username is in use!"
});
return

    }

      callback({success: true});
  });

socket.on("joining_room", (data: { roomId: string; username: string; }, callback) => {
    const foundRoom = activeRooms.find((room) => room.sessionId === data.roomId);

/* lot of the logic here is the same as previous step in case if someone takes a break after 
verifying the room & other users get in before they do thus maxplayer get's filled or some
other condition is suddenly true.
*/    

if (!foundRoom) {
      callback({
        success: false,
        error: "Chatroom ID not found!",
      });
      return;
    }

  //needs to check this again in case lead exits suddenly

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

    if (Date.now() >= foundRoom.expiresAt) {
  callback({
    success: false,
    error: "This lobby has expired.",
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
    console.log(
    "Sending lobby_state to:",
    player.connectionId,
    "count:",
    foundRoom.players.length
  );

  io.to(player.connectionId).emit("lobby_state", {
    playerCount: foundRoom.players.length,
    maxPlayers: foundRoom.maxPlayers,
    teamLead: player.connectionId === foundRoom.leadPlayer.connectionId,
    liveState: foundRoom.liveState,
    gameState: foundRoom.gameState,
    expiresAt: foundRoom.expiresAt,
  });
});

});

socket.on("request_synced_state", ({ roomId }) => {

const foundRoom = activeRooms.find((room) => room.sessionId === roomId);
    if (!foundRoom) {
   console.log("request_lobby_state: room not found");
      return;
    }

  const player = foundRoom.players.find(
    player => player.connectionId === socket.id
  );

  if (!player) {
    console.log(
      "request_lobby_state: player is not in this room"
    );
    return;
  }

  if (foundRoom.gameState === "lobby" && Date.now() >= foundRoom.expiresAt) {
    destroyRoom(foundRoom, io);
    return;
  }

  socket.emit("lobby_state", {
    playerCount: foundRoom.players.length,
    maxPlayers: foundRoom.maxPlayers,
    teamLead: socket.id === foundRoom.leadPlayer.connectionId,
    liveState: foundRoom.liveState,
    gameState: foundRoom.gameState,
    expiresAt: foundRoom.expiresAt
  });

});

/* ----------------------------------------
ACTUAL LOBBY SOCKETS: 
----------------------------------------


----------------------------------------
DiSCONNECTING FROM LOBBY 
----------------------------------------

  list of socket events:
-leaving_lobby = intentional departures (by pressing cancel button in the lobby)
-disconnect = unexpected connection loss (for example closing browser or network disconnection)
-rejoin_lobby = logic that helps players to rejoin lobby if they disconnect accidentally
*/


socket.on("leaving_lobby", (callback) => {
const foundRoom = activeRooms.find(
    (room) => room.sessionId === socket.roomId
  );

  if (!foundRoom) {
      callback({
      success: false,
      error: "Room not found.",
    });
    return;
  }
  removePlayerFromRoom(foundRoom, socket, io);

  callback({
    success: true,
  });
});

socket.on("disconnect", () => {
  const foundRoom = activeRooms.find(
    (room) => room.sessionId === socket.roomId
  );

  if (!foundRoom) return;

   const player = foundRoom.players.find(
    (player) => player.connectionId === socket.id
  );

if (!player) return; 

/* add 30 second disconnect timer so that player doesn't get disconnected immidiately if 
their internet connection cuts for a second or two for example.
*/

player.disconnectTimer = setTimeout(() => {

  const currentRoom = activeRooms.find(
      (room) => room.sessionId === socket.roomId
    );

    if (!currentRoom) return;

    const currentPlayer = currentRoom.players.find(
      (player) => player.connectionId === socket.id
    );

    if (!currentPlayer) return;

    removePlayerFromRoom(currentRoom, socket, io);
  }, 30_000);
});

socket.on("rejoin_lobby", (  data: { roomId: string; username: string }, callback) => {
  
  const foundRoom = activeRooms.find(
      (room) => room.sessionId === data.roomId
    );


  if (!foundRoom) {
    callback({
        success: false,
        error: "Room not found.",
      });
      return;
    }

    const existingPlayer = foundRoom.players.find(
      (player) => player.username === data.username
    );

        if (!existingPlayer) {
      callback({
        success: false,
        error: "Player is not currently in this lobby.",
      });
      return;
    }

      if (existingPlayer.disconnectTimer) {
        clearTimeout(existingPlayer.disconnectTimer);
        existingPlayer.disconnectTimer = undefined;
      }

//update their current socketid (as their previous socketid will get cut when they disconnect)

existingPlayer.connectionId = socket.id;

if (existingPlayer.username === foundRoom.leadPlayer.username) {
  foundRoom.leadPlayer.connectionId = socket.id;
}

      socket.username = existingPlayer.username;
      socket.roomId = data.roomId;

      socket.join(data.roomId);

      callback({
        success: true,
      });

      foundRoom.players.forEach((player) => {
        io.to(player.connectionId).emit("lobby_state", {
          playerCount: foundRoom.players.length,
          maxPlayers: foundRoom.maxPlayers,
          teamLead:
            player.username === foundRoom.leadPlayer.username,
          liveState: foundRoom.liveState,
          gameState: foundRoom.gameState,
          expiresAt: foundRoom.expiresAt,
         });
    });
  }
);

// Returns every current player to the same lobby so the lead player can
// launch a fresh match without creating a new room.
socket.on("play_again", (callback: (response: { success: boolean; error?: string }) => void) => {
  const roomId = socket.roomId;
  if (!roomId) {
    callback({ success: false, error: "You are not in a room." });
    return;
  }

  const foundRoom = activeRooms.find((room) => room.sessionId === roomId);
  if (!foundRoom) {
    callback({ success: false, error: "Room not found." });
    return;
  }

  if (foundRoom.leadPlayer.connectionId !== socket.id) {
    callback({ success: false, error: "Only the lead player can start a rematch." });
    return;
  }

  // The gameplay state is authoritative for the match result. The lobby state
  // can still say "playing" because it is maintained separately.
  const networkerState = getNetworkerGameState(roomId);
  if (networkerState?.phase !== "ended") {
    callback({ success: false, error: "The current game has not ended." });
    return;
  }

  foundRoom.gameState = "lobby";
  foundRoom.expiresAt = Date.now() + 10 * 60 * 1000;

  io.to(roomId).emit("return_to_lobby", { roomId });
  foundRoom.players.forEach((player) => {
    io.to(player.connectionId).emit("lobby_state", {
      playerCount: foundRoom.players.length,
      maxPlayers: foundRoom.maxPlayers,
      teamLead: player.username === foundRoom.leadPlayer.username,
      liveState: foundRoom.liveState,
      gameState: foundRoom.gameState,
      expiresAt: foundRoom.expiresAt,
    });
  });

  callback({ success: true });
});
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

  // Only the lead player can start the game 

  if (foundRoom.leadPlayer.connectionId !== socket.id) {
    callback({
      success: false,
      error: "Only the lead player can start the game.",
    });
    return;
  }

  // Need at least 2 players to start the game 

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

  // Tell EVERYONE in the room that game has started (not sure if this goes to lobby or game route?)

  io.to(foundRoom.sessionId).emit("game_started", {
    roomId: foundRoom.sessionId,
  });

  // Seed the authoritative Networker game state from the real room roster
  // and broadcast it so /game doesn't render placeholder players/scores.
  const networkerState = startNetworkerGame(
    io,
    foundRoom.sessionId,
    foundRoom.players,
    foundRoom.leadPlayer.username,
  );
  io.to(foundRoom.sessionId).emit("game_state_updated", networkerState);
});
}
