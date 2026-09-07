# Stage 1: Build the static assets
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
# FORCE npm to install devDependencies (like Vite/TypeScript) to compile the assets if it doesn't work
RUN npm install

COPY . .
RUN npm run build 

# Stage 2: Production 
FROM node:1.25-alpine
WORKDIR /app

# Globally install the "serve" library inside the production container
RUN npm install -g serve

# Copy only the compiled static assets from the builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 5173
CMD ["serve", "-s", "dist", "-l", "5173"]