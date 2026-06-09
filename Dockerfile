# ---- Build Stage ----
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production

# ---- Runtime Stage ----
FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY .env ./
COPY backend/ ./backend/

EXPOSE 4565

CMD ["node", "backend/index.js"]
