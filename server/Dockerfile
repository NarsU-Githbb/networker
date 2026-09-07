FROM node:20-alpine AS builder
WORKDIR /app

# Install all dependencies (including devDeps like Vite)
COPY package*.json ./
RUN npm install

# Copy source and build the "dist" folder
COPY . .
RUN npm run build 

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app

# Copy ONLY the production dependencies (saves memory)
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force


# Copy the build output and your server code from the builder
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/src/server.js"]