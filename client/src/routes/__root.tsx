import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { Toaster } from 'sonner'
import { Socket } from 'socket.io-client' 

export const Route = createRootRouteWithContext<{
  socket: Socket
}>()({
  component: RootComponent,
})

function RootComponent() {
  return (
    <div className="flex flex-col bg-zinc-50 min-h-screen">
      {/* 
        The Outlet is where your pages (like index.tsx or about.tsx) 
        will dynamically swap in and out based on the active URL (cool)
      */}
      <main className="flex-grow">
        <Outlet />
      </main>
      
       <Toaster /> 

      {/* The floating developer drawer tool */}
      <TanStackRouterDevtools />
    </div>
  )
}