# Networker Shared Contract

This document is the shared vocabulary for **The Networker**. It explains which
names are used between the lobby, server, Socket.IO client, game engine, store,
and React UI.

The server is authoritative. The client may request an action, but the server
validates it and broadcasts the approved result to all players.

## Identity and room names

```ts
roomId
```

// The identifier for the Socket.IO room. It is already used by the current
// lobby and chat code, so keep using `roomId` in network event data.
// Person 1 owns room creation and room membership.

```ts
socketId
```

// The current Socket.IO connection identity. It is used by the server for
// routing messages and handling disconnects. It can change after a refresh.
// Do not use it as the player's visible identity in the React UI.

```ts
username
```

// The player's unique identity within one room. It is displayed in the
// scoreboard and system messages. The server validates that usernames are
// unique. No separate playerId is required for the current version.

```ts
itemId
```

// The unique identity of one LinkedIn connection item on the map. It is not a
// player ID and it is not a Socket.IO connection ID.
// Person 3 sends the itemId after detecting a collision. Person 1 validates it.

## Game phases

```ts
"lobby" | "playing" | "paused" | "ended"
```

// `lobby`: players are waiting for the lead player to start.
// `playing`: movement and collection are enabled.
// `paused`: gameplay is temporarily stopped.
// `ended`: a player has reached 100 connections and the winner is fixed.
// Person 1 owns the authoritative phase; Person 2 defines what each phase means;
// Person 3 and the React UI respond to phase changes.

## Shared game data

```ts
type NetworkerPlayer = {
  username: string;
  score: number;
};
```

// Person 1 updates scores on the server. Person 2 defines the scoring rule.
// React displays the scoreboard. The game engine does not award points locally.

```ts
type NetworkerConnectionItem = {
  itemId: string;
  row: number;
  col: number;
  points: number;
  isCollected: boolean;
};
```

// Person 2 defines the map item layout, spawn rules, and point range (2-20).
// Person 3 converts row/col into screen coordinates and detects collisions.
// Person 1 authoritatively marks items as collected and broadcasts the result.

```ts
type NetworkerGameState = {
  phase: "lobby" | "playing" | "paused" | "ended";
  players: NetworkerPlayer[];
  connectionItems: NetworkerConnectionItem[];
  winnerUsername: string | null;
  timeRemaining: number;
  systemMessage: string | null;
};
```

// This is the server-approved match snapshot mirrored into the client store.
// Person 1 owns the server copy. The Socket.IO client writes updates to the
// store. React reads it for the HUD, scoreboard, menus, and end screen.
// Person 3 reads the item and player data for rendering, but keeps per-frame
// animation values outside React state.

## Existing lobby events

These names already exist in the current lobby implementation:

```text
create_room       // Client -> server; lead requests a room.
room_made         // Server -> lead; contains roomId.
open_room         // Lead -> server; opens the room for joining.
room_opened       // Server -> lead; confirms the room is open.
verify_room       // Joining client -> server; checks room availability.
room_ready        // Joining client -> server; submits roomId and username.
player_joined     // Server -> room; a player is attempting to join.
player_name_added // Server -> room; a username was accepted.
```

// Person 1 owns these events. Person 2's lobby/game UI consumes the results.

## Gameplay events

```text
game_started
```

// Person 1 emits this when the lead starts the match. All clients switch from
// lobby to playing and begin rendering active gameplay.

```text
collect_item
```

// Person 3's collision system sends this request to the server:
// { itemId: string }
// The server identifies the player from socketId, validates the item, applies
// the points, checks for 100, and broadcasts the new state.

```text
game_state_updated
```

// Person 1 broadcasts the approved NetworkerGameState to the whole room.
// The Socket.IO client writes it to the shared store. React and the game engine
// subscribe to the store.

```text
system_message
```

// Person 1 broadcasts messages such as "Alex paused the game" or
// "Mary disconnected". Person 2 renders the message banner.

```text
pause_game
resume_game
quit_game
```

// React menu sends the requested action. Person 1 validates who sent it,
// changes the authoritative phase, and broadcasts the resulting state and/or
// system message.

```text
player_disconnected
```

// Person 1 emits this when a socket disconnects. Person 2 displays the system
// message and the server decides whether to pause the match or remove the
// disconnected player. Reconnection is not part of the current version.

```text
game_ended
```

// Person 1 emits this after the server finds a player with a score of 100 or
// more. Person 2 displays the winner and loser screens.

## Shared data type names

```text
Room
NetworkerPlayer
NetworkerConnectionItem
NetworkerGameState
CollectItem
GameMenuAction
SystemMessage
GameEnded
```

// These are data concepts, not React components. Keep their meanings stable
// even if the implementation is moved between the client and server.

## Ownership summary

```text
Person 1 / server:
  rooms, socket connections, phases, timer, scores, collected items, winner

Person 2 / game rules and UI:
  map definition, item spawn rules, scoring rule, win condition, scoreboard,
  system messages, winner/loser screens

Person 3 / game engine:
  keyboard input, movement, wall collision, item collision detection, rAF,
  DOM rendering, transforms, and network-position smoothing

Shared client store:
  the latest server-approved match state for React and the game engine
```

## Important boundary

Person 3 may detect a collision, but does not permanently award points.
Person 2 defines what collecting an item means, but the server applies the
authoritative score update. This prevents different browsers from developing
different scores.
