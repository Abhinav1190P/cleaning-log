FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 4000

CMD ["sh", "-c", "npm run db:migrate:prod && node dist/src/index.js"]
