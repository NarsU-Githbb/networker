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
import { getPublicUrl, startTunnel } from "./utils/tunnel.js";

// Pass an frontend viteconfig before binding or listening
ViteExpress.config({ inlineViteConfig: { root: "../client" } });

const app = express()
const server = createServer(app);

// Initialize Socket.io by passing it the HTTP server instance.
// The client connects same-origin (localhost or tunnel), so no CORS config is needed.
const socket = new Server(server);

// Pass the Socket.io server instance straight into your router
initializeSocketRouter(socket);

// Lets the client show the public (tunnel) link; url is null when no tunnel is running
app.get("/api/public-url", (_req, res) => {
  res.json({ url: getPublicUrl() });
});

ViteExpress.bind(app, server);

server.listen(3000, "0.0.0.0", () => {
  console.log(
    `[server] Listening on port 3000`,
  );

  if (process.env.TUNNEL === "1") {
    startTunnel(3000);
  }
});