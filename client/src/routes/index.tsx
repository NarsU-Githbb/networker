//import { useState } from 'react'
import { useRef } from "react"
import { createFileRoute } from '@tanstack/react-router'
import { Button } from "@/components/ui/button"
import { ChevronDown} from "lucide-react"

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

function HomeComponent() {
  const contentRef = useRef<HTMLDivElement>(null)

  const scrollToContent = () => {
    contentRef.current?.scrollIntoView({ behavior: "smooth" })
  }


return (
     
    <div className="flex flex-col bg-zinc-50">
      {/* SECTION 1: The Hook */}
      <div className="h-screen flex flex-col items-center justify-center p-6 text-center bg-zinc-950 text-white relative">
        <div className="font-mono text-xs pt-10 uppercase tracking-[0.3em] mb-8 opacity-60">
          <p>Marketing tagline</p>
        </div>
        <div className="font-bold text-3xl md:text-5xl max-w-4xl leading-tight tracking-tight">
         <p>Something about the game</p>
        </div>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={scrollToContent}
          className="mt-20 animate-bounce rounded-full size-12 border-zinc-700 bg-transparent text-white hover:bg-white/10 hover:text-white"
        >
          <ChevronDown className="size-6" />
        </Button>
      </div>

      {/* SECTION 2: the Game */}
      <div ref={contentRef} className="min-h-screen flex flex-col items-center py-24 px-6 text-center bg-zinc-100">
        <h1 className="mb-6 text-4xl font-extrabold tracking-tighter md:text-6xl lg:text-7xl">
          <span className="text-transparent bg-clip-text bg-gradient-to-r to-orange-600 from-yellow-400">
            Name of the game
          </span>
          <br /> the multiplayer party game
        </h1>
       
        <div className="flex gap-4 mb-16">
          <Button size="lg" className="font-bold uppercase tracking-widest px-8 shadow-xl">
            <a href="./begin">Lead gaming session!</a>
          </Button>
          <Button variant="outline" size="lg" className="border-zinc-300">
            <a href="./connecting">Join session as Player</a>
          </Button>
        </div>
        </div>
     
       
      </div>
   
  
  )
}