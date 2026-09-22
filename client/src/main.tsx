import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import '@/index.css'
import { routeTree } from './routeTree.gen'
import { io } from "socket.io-client" 



// Create the single, persistent socket instance
const socket = io({
  autoConnect: true,
})

//socket is on the context so that app doesn't create new socket connection everytime 
//you access a new route.

const router = createRouter({ 
  routeTree,
  context: {
    socket,
  }
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById('root')

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )
}