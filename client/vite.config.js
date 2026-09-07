import { defineConfig } from 'vite'
import path from "path";
import {  tanstackRouter  } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'


// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts"
    }),
    react(),
  tailwindcss(),
],
 resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
 server: {
    allowedHosts: true // delete this after production - major security risk!!!
  }
})


// use window.location.hash or searchParams to handle the invite links 