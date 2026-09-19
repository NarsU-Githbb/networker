import { useRef } from "react"
import { createFileRoute } from '@tanstack/react-router'
import { Button } from "@/components/ui/button"
import { ChevronDown, TrendingUp, TrendingDown, Dog, Users, Copyright, Space } from "lucide-react"
import {WGameControls} from "@/components/gameControls"

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

function HomeComponent() {
  const contentRef = useRef<HTMLDivElement>(null)

  const scrollToContent = () => {
    contentRef.current?.scrollIntoView({ behavior: "smooth" })
  }


return (
     <>
    <div className="flex flex-col bg-zinc-50">
      {/* SECTION 1: The Hook */}
      <div className="h-screen flex flex-col items-center justify-center p-6 text-center bg-zinc-950 text-white relative">
        <div className="font-mono text-xs pt-10 uppercase tracking-[0.3em] mb-8 opacity-60">
          <p>IGN is calling it the best game ever made</p>
        </div>
        <div className="font-bold text-3xl md:text-5xl max-w-4xl leading-tight tracking-tight">
         <p>Game so good that it runs 60fps, doesn't drop frames & forces gamers around the globe to admit: 'It’s slightly better than doing nothing!'</p>
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
            Networker
          </span>
          <br /> The Multiplayer Jobhunting Game
        </h1>
       
        <div className="flex gap-4 mb-16">
          <Button size="lg" className="font-bold uppercase tracking-widest px-8 shadow-xl">
            <a href="./create-room">Lead gaming session!</a>
          </Button>
          <Button variant="outline" size="lg" className="border-zinc-300">
            <a href="./join-room">Join session as Player</a>
          </Button>
        </div>

 {/* SECTION 3: game lore & controls */}
 <div className="flex flex-col md:flex-row gap-8 items-stretch max-w-6xl w-full mb-24 mt-27">
  
  <div className="flex-1 bg-stone-50 border border-stone-200 text-stone-700 p-8 rounded-xl shadow-sm flex flex-col justify-start">
    <h3 className="text-stone-900 font-bold text-lg mb-4 tracking-wide uppercase border-b border-stone-200 pb-2">
      The Legend
    </h3>
    <p className="leading-relaxed italic text-stone-600">
      "There is a legendary tale, that if you reach 100 LinkedIn connections you will receive a real junior level position in your dream company!
    </p>
    <p className="leading-relaxed italic text-stone-600 mt-4">
      ...But be quick, you are not the only one trying to get a job! Be the first to get 100 LinkedIn connections and you might get lucky! Find out if there is any truth to the tale!”
    </p>
  </div>
  <div className="flex-1">
<WGameControls />
</div>
</div>

        {/* SECTION 4: Why Choose Us Grid */}
        <div className="max-w-6xl w-full">
          <h2 className="mb-12 text-3xl font-bold tracking-tight text-zinc-800">Why you should play?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="secondary" className="h-auto p-6 flex items-start gap-4 justify-start bg-white border border-zinc-200 hover:border-orange-500 transition-all">
              <TrendingUp className="size-6 text-orange-600 shrink-0" /> 
              <div className="text-left">
                <div className="font-bold">Invest in yourself!</div>
                <div className="text-xs font-normal opacity-70">This immersive simulation teaches you how to be linkedIn champion!</div>
              </div>
            </Button>

            <Button variant="secondary" className="h-auto p-6 flex items-start gap-4 justify-start bg-white border border-zinc-200">
              <Users className="size-6 text-blue-600 shrink-0" /> 
              <div className="text-left">
                <div className="font-bold">Build connections with tech companies</div>
                <div className="text-xs font-normal opacity-70">Networking gives you 0,01% better odds of finding a junior-level job.</div>
              </div>
            </Button>

            <Button variant="secondary" className="h-auto p-6 flex items-start gap-4 justify-start bg-white border border-zinc-200 opacity-50 grayscale">
              <TrendingDown className="size-6 text-zinc-400 shrink-0" /> 
              <div className="text-left">
                <div className="font-bold text-zinc-400 line-through">End goal is a stable job in software development</div>
                <div className="text-xs font-normal opacity-70">Human intelligence deprioritized - we have AI after all. </div>
              </div>
            </Button>

            <Button variant="secondary" className="h-auto p-6 flex items-start gap-4 justify-start bg-white border border-zinc-200">
              <Dog className="size-6 text-orange-600 shrink-0" /> 
              <div className="text-left">
                <div className="font-bold">Opens you more opportunities</div>
                <div className="text-xs font-normal opacity-70">Don't worry if you can't get hired, every company needs service dog. </div>
              </div>
            </Button>
 </div>
          </div>
  </div>

  {/* SECTION 5: footer*/}
           <footer className="bg-zinc-950 text-zinc-500 py-16 px-6 border-t border-zinc-800 mt-24">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12 text-xs uppercase tracking-widest">
          <div className="flex flex-col gap-4">
            <div className="text-zinc-200 font-bold mb-2">Our Games</div>
            <a href="#" className="hover:text-white transition-colors">Networker: Best Game</a>
            <a href="#" className="hover:text-white transition-colors">AI Agent Invasion: Horror Game</a>
            <a href="#" className="hover:text-white transition-colors">Find a bug: Puzzle Game</a>
            <a href="#" className="hover:text-white transition-colors">Last Fantasy VII: The Timeless Legacy of Ianzudur</a>
          </div>
          <div className="flex flex-col gap-4">
            <div className="text-zinc-200 font-bold mb-2">Strategy</div>
            <a href="#" className="hover:text-white transition-colors">Added Microtransactions</a>
            <a href="#" className="hover:text-white transition-colors">Release first, patch later</a>
            <a href="#" className="hover:text-white transition-colors">Cross-Platform Account Verifications</a>
            <a href="#" className="hover:text-white transition-colors">Zero Ownership, Maximum Joy</a>
          </div>
          <div className="flex flex-col gap-4">
            <div className="text-zinc-200 font-bold mb-2">Company</div>
            <a href="#" className="hover:text-white transition-colors">Game Company Corp Family</a>
            <a href="#" className="hover:text-white transition-colors">Careers (Unpaid)</a>
            <a href="#" className="hover:text-white transition-colors">Donate Crypto</a>
            <a href="#" className="hover:text-white transition-colors">Q&</a>
          </div>
          <div className="flex flex-col gap-4">
            <div className="text-zinc-200 font-bold mb-2">Social</div>
            <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
            <a href="#" className="hover:text-white transition-colors">Twitter (Currently X)</a>
             <a href="#" className="hover:text-white transition-colors">Our Website</a>
              <a href="#" className="hover:text-white transition-colors">4th option so the footer is symmetrical</a>
          </div>
        </div>
   <div className="max-w-6xl mx-auto mt-16 text-[10px] text-zinc-600 opacity-40 uppercase tracking-widest text-center md:text-left italic">
          * Note: These links will be fully functional in the future, once our game devs have finished making all of those games. 
        </div>

        <div className="max-w-6xl mx-auto mt-20 pt-8 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-2">
            <Copyright className="size-3" /> 2026 GAME COMPANY CORP. ALL RIGHTS RESERVED.
          </div>
          <div className="text-[10px] opacity-30 italic">
            Powered by Burned Out Game Devs.
          </div>
        </div>
      </footer>

       
    
    </div>
    </>
  )
}
