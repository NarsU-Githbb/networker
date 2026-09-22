# Videogame

## Overview

## Getting Started (Development Mode)

The server is a single Node.js process (Express + Socket.IO) that also serves
the client through Vite - one process, one port, nothing else to run.

1. Install dependencies once:

```bash
cd client && npm install
cd ../server && npm install
```

2. From `server/`, start everything:

```bash
npm run dev:public
```

This serves the game at http://localhost:3000/ and also opens a public
Pinggy tunnel so other players can join over the internet - see "Share the
game with a public link" below.

Local-only alternative, no tunnel: `npm run dev` (from `server/`).

## User Guide 

1. (text here) 

## Share the game with a public link (Pinggy)

1. In server/ run:

```
npm run dev:public
```

2. Create a room. The "Game ID" step now shows a **Game link** (the Pinggy URL). Copy it and send it, together with the Game ID, to the other players.

3. They open the link, press the join button, then enter the Game ID & a username.

Notes: free Pinggy tunnels last about 60 minutes and the URL changes on every start. Without `TUNNEL=1` (plain `npm run dev`) no tunnel is opened and the link shown is just the local address.

## Verifying 60 FPS / no dropped frames

Mandatory requirement: a constant **minimum of 60 FPS**, with no dropped
frames, while playing. A drop at the exact moment of switching browser tabs
is acceptable; drops that continue after switching back are not.

1. Open the game in Chrome and start a match.
2. DevTools (`F12`) → Command Menu (`Ctrl+Shift+P` / `Cmd+Shift+P`) → run
   **"Show frames per second (FPS) meter"**. It should read at/near 60 while
   playing, including while standing still or the pause menu is open.
3. For actual proof (not just a live read): DevTools → **Performance** tab →
   record (●) → play normally for ~15s (move, dash, collect items,
   pause/resume) → stop.
   - Check the **Frames** lane: every block should be solid green. Red or
     striped blocks are dropped frames.
   - Click a frame and open the **Main** track underneath it to see what ran
     during it, if something did drop.

Note: the FPS meter reads low when literally nothing on screen is changing,
because Chrome skips drawing a frame with no visual change - that's not a
real drop. The pulsing "Live"/"Paused" indicator exists specifically so the
game is always drawing something during a match, so this shouldn't come up
in normal play.

## Tech Stack (can be deleted later)

This system runs as a single Node.js application:

**Backend:** Node.js + Express + Socket.IO
**Frontend:** React (Vite)
**Styling:** Tailwind CSS + Shadcn UI
**Real-time communication:** Socket.IO 
**Deployment:** Docker
**Packages:** npm

## State Management

The client uses Zustand for shared Networker game state. The React UI, Socket.IO
client, and DOM game engine can access the same store.

React uses the store for meaningful UI updates such as scores, the timer, game
phase, system messages, and the winner screen. Socket.IO writes approved server
updates into the store. The game engine reads the store for gameplay data, while
per-frame movement, keyboard input, animation values, and DOM references remain
inside the game engine.

Zustand is installed with the frontend dependencies, so a normal installation
is sufficient:

```bash
cd client
npm install
```

## Files structure (can be used later)
