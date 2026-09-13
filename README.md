# Videogame

## Overview

## Getting Started (Development Mode)

How to run in dev mode:

1. Go to client/ directory & use "npm install" for the frontend.

2. Then go to server/ directory & use "npm install" for the backend.

3. Write "npx tsx src/server.ts" & now the project is online in http://localhost:3000/ 

## User Guide 

1. (text here) 

## Generate Pinggy link (for early development testing)

1. Use this command to generate Pinggy link:

```
ssh -p 443 -R0:localhost:3000 free.pinggy.io
```
2. Copy paste the https Pinggy link & You can now send this link to the user you want to start the game with (along with the chat ID). 

3. It should bring the user2 into the main page, where he should press "TBD" button. There he can give the chat id, username & access into the game with you.

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
