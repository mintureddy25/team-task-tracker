# ─── builder ───
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps (including dev) for building
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npx prisma generate
RUN npm run build

# ─── runtime ───
FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

# Prod-only deps
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Built JS + prisma client + migrations
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma

EXPOSE 3000

# Run pending migrations on boot, then start the API
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
