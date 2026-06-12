# ---- Build Stage ----
FROM node:22-alpine AS builder

# add new user 'nonroot'
RUN addgroup -S nonroot \
    && adduser -S nonroot -G nonroot
USER nonroot

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production

# ---- Runtime Stage ----
FROM node:22-alpine

# add new user 'nonroot'
RUN addgroup -S nonroot \
    && adduser -S nonroot -G nonroot
USER nonroot

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY backend/ ./backend/

EXPOSE 4565

CMD ["node", "backend/index.js"]
