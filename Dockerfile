FROM node:20.14.0-alpine AS base

RUN addgroup -S nodejs && \
    adduser -S nodeuser -G nodejs

WORKDIR /app

RUN chown -R nodeuser:nodejs /app

COPY --chown=nodeuser:nodejs package*.json ./
COPY --chown=nodeuser:nodejs prisma/ ./prisma/
COPY --chown=nodeuser:nodejs scripts/ ./scripts/

USER nodeuser


FROM base AS development

RUN npm ci

COPY --chown=nodeuser:nodejs . .

ENV NODE_ENV=development

CMD ["npm", "run", "start:development"]


FROM base AS builder

RUN npm ci

COPY --chown=nodeuser:nodejs . .

RUN npm run build


FROM base AS production

RUN npm ci --omit=dev && \
    npm cache clean --force

COPY --from=builder --chown=nodeuser:nodejs /app/dist ./dist

ENV NODE_ENV=production

CMD ["npm", "run", "start:production"]
