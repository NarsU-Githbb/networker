export default function WaitingLobbyIcon() {
  return (
    <div className="flex items-center justify-center space-x-2 p-4" aria-label="Waiting to connect">
      <div className="h-3 w-3 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.3s]"></div>
      <div className="h-3 w-3 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.15s]"></div>
      <div className="h-3 w-3 rounded-full bg-blue-600 animate-bounce"></div>
    </div>
  );
}