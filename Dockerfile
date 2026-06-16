# ───────── Stage 1: build ─────────
FROM node:20-alpine AS builder
WORKDIR /app

# Em produção a API fica na mesma origem, atrás do nginx, em /api
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci

COPY . .
# Garante que os ícones PWA/push existam mesmo em clone limpo
RUN node scripts/generate-icons.cjs
RUN npm run build

# ───────── Stage 2: nginx ─────────
FROM nginx:1.27-alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
