//vite-express cannot run without a Node.js server. 
//By definition, using vite-express means you are running a Node.js Express server.

//express creates your web server's foundation, 
//while vite-express simply attaches itself to that foundation.
//together you can combine both frontend / backend servers & run app straight from 
//backend

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import ViteExpress from "vite-express";
import { initializeSocketRouter } from "./socket/indexSock.js";

// Pass an frontend viteconfig before binding or listening
ViteExpress.config({ inlineViteConfig: { root: "../client" } });

const app = express()
const server = createServer(app);

// Initialize Socket.io by passing it the HTTP server instance
const socket = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Pass the Socket.io server instance straight into your router
initializeSocketRouter(socket);

ViteExpress.bind(app, server);

server.listen(3000, "0.0.0.0", () => {
  console.log(
    `[server] Listening on port 3000`,
  );
});