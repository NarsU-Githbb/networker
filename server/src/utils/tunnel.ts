import { pinggy } from "@pinggy/pinggy";

let publicUrl: string | null = null;

export function getPublicUrl() {
  return publicUrl;
}

// Opens a public Pinggy tunnel to the local server. Never throws: the game
// still works on localhost if the tunnel can't start (offline, blocked, etc.).
export async function startTunnel(port: number) {
  try {
    const tunnel = await pinggy.forward({ forwarding: `localhost:${port}` });
    const urls = await tunnel.urls();
    publicUrl = urls.find((url: string) => url.startsWith("https://")) ?? urls[0] ?? null;
    console.log(`[server] Public link: ${publicUrl}`);
  } catch (error) {
    console.warn("[server] Could not start Pinggy tunnel:", error);
  }
}
