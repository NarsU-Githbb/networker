import { Space } from 'lucide-react'; // Optional: Use if you want the space icon instead of text

  /*black background*/

export function BGameControls() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 text-zinc-300 p-6 rounded-xl max-w-xl shadow-xl mb-24 font-sans">
      <h3 className="text-zinc-100 font-bold text-lg mb-6 tracking-wide uppercase border-b border-zinc-800 pb-2">
        Gameplay Controls
      </h3>

      <div className="space-y-6">
        {/* Moving Section */}
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Movement</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="flex items-center gap-3 bg-zinc-800/40 p-2 rounded-lg border border-zinc-800">
              <kbd className="flex items-center justify-center w-8 h-8 text-xs font-bold text-zinc-200 bg-zinc-800 border border-zinc-700 rounded-md shadow-md shadow-black/40">W</kbd>
              <span className="text-sm font-medium">Up</span>
            </div>
            <div className="flex items-center gap-3 bg-zinc-800/40 p-2 rounded-lg border border-zinc-800">
              <kbd className="flex items-center justify-center w-8 h-8 text-xs font-bold text-zinc-200 bg-zinc-800 border border-zinc-700 rounded-md shadow-md shadow-black/40">A</kbd>
              <span className="text-sm font-medium">Left</span>
            </div>
            <div className="flex items-center gap-3 bg-zinc-800/40 p-2 rounded-lg border border-zinc-800">
              <kbd className="flex items-center justify-center w-8 h-8 text-xs font-bold text-zinc-200 bg-zinc-800 border border-zinc-700 rounded-md shadow-md shadow-black/40">S</kbd>
              <span className="text-sm font-medium">Down</span>
            </div>
            <div className="flex items-center gap-3 bg-zinc-800/40 p-2 rounded-lg border border-zinc-800">
              <kbd className="flex items-center justify-center w-8 h-8 text-xs font-bold text-zinc-200 bg-zinc-800 border border-zinc-700 rounded-md shadow-md shadow-black/40">D</kbd>
              <span className="text-sm font-medium">Right</span>
            </div>
          </div>
        </div>

        {/* Actions Section */}
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Actions</p>
          <div className="space-y-3">
            {/* Speed Boost */}
            <div className="flex items-center justify-between bg-zinc-800/40 px-4 py-2.5 rounded-lg border border-zinc-800">
              <span className="text-sm font-medium">Speed Boost</span>
              <kbd className="min-w-[80px] h-8 px-2 flex items-center justify-center text-xs font-bold text-zinc-200 bg-zinc-800 border border-zinc-700 rounded-md shadow-md shadow-black/40 tracking-wide uppercase">
                Space
              </kbd>
            </div>

            {/* Pause Menu */}
            <div className="flex items-center justify-between bg-zinc-800/40 px-4 py-2.5 rounded-lg border border-zinc-800">
              <span className="text-sm font-medium">Open Pause Menu</span>
              <kbd className="w-8 h-8 flex items-center justify-center text-xs font-bold text-zinc-200 bg-zinc-800 border border-zinc-700 rounded-md shadow-md shadow-black/40">
                P
              </kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

  /*white background */
export function WGameControls() {
  return (
    <div className="bg-stone-50 border border-stone-200/80 text-stone-700 p-6 rounded-xl max-w-xl shadow-sm h-full font-sans">
      <h3 className="text-stone-900 font-bold text-lg mb-6 tracking-wide uppercase border-b border-stone-200 pb-2">
        Gameplay Controls
      </h3>

      <div className="space-y-6">
        {/* Moving Section */}
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Movement</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-stone-200/60 shadow-sm">
              <kbd className="flex items-center justify-center w-8 h-8 text-xs font-bold text-stone-800 bg-stone-100 border border-stone-300 rounded-md shadow-[0_2px_0_rgba(0,0,0,0.1)]">W</kbd>
              <span className="text-sm font-medium">Up</span>
            </div>
            <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-stone-200/60 shadow-sm">
              <kbd className="flex items-center justify-center w-8 h-8 text-xs font-bold text-stone-800 bg-stone-100 border border-stone-300 rounded-md shadow-[0_2px_0_rgba(0,0,0,0.1)]">A</kbd>
              <span className="text-sm font-medium">Left</span>
            </div>
            <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-stone-200/60 shadow-sm">
              <kbd className="flex items-center justify-center w-8 h-8 text-xs font-bold text-stone-800 bg-stone-100 border border-stone-300 rounded-md shadow-[0_2px_0_rgba(0,0,0,0.1)]">S</kbd>
              <span className="text-sm font-medium">Down</span>
            </div>
            <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-stone-200/60 shadow-sm">
              <kbd className="flex items-center justify-center w-8 h-8 text-xs font-bold text-stone-800 bg-stone-100 border border-stone-300 rounded-md shadow-[0_2px_0_rgba(0,0,0,0.1)]">D</kbd>
              <span className="text-sm font-medium">Right</span>
            </div>
          </div>
        </div>

        {/* Actions Section */}
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Actions</p>
          <div className="space-y-3">
            {/* Speed Boost */}
            <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-lg border border-stone-200/60 shadow-sm">
              <span className="text-sm font-medium">Speed Boost</span>
              <kbd className="min-w-[80px] h-8 px-2 flex items-center justify-center text-xs font-bold text-stone-800 bg-stone-100 border border-stone-300 rounded-md shadow-[0_2px_0_rgba(0,0,0,0.1)] tracking-wide uppercase">
                Space
              </kbd>
            </div>

            {/* Pause Menu */}
            <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-lg border border-stone-200/60 shadow-sm">
              <span className="text-sm font-medium">Open Pause Menu</span>
              <kbd className="w-8 h-8 flex items-center justify-center text-xs font-bold text-stone-800 bg-stone-100 border border-stone-300 rounded-md shadow-[0_2px_0_rgba(0,0,0,0.1)]">
                P
              </kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}