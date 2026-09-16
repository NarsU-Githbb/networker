interface Player {
  connectionId: string;
  username: string;
}

interface GameSession {
  sessionId: string;
  leadPlayer: Player;
  players: Player[];
  state: "playing" | "paused" | "ended";
}


// when the lobby starts the game this is the socket event that establishes everything

const game: GameSession = {
  sessionId: foundRoom.sessionId,

  leadPlayer: {
    connectionId: foundRoom.leadPlayer.connectionId,
    username: foundRoom.leadPlayer.username,
  },

  players: foundRoom.players.map(player => ({
    connectionId: player.connectionId,
    username: player.username,
  })),

  state: "playing",
};