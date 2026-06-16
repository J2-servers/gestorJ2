# Stage 1: build
FROM node:20-alpine AS builder
WORKDIR /app

# In production the API is served from the same origin under /api.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci

COPY . .
# Ensure PWA/push icons exist even from a clean clone.
RUN node scripts/generate-icons.cjs
RUN npm run build

# Stage 2: nginx
FROM nginx:1.27-alpine AS runner

# Default do proxy /api -> backend. EasyPanel pode sobrescrever via env BACKEND_UPSTREAM.
# A imagem oficial do nginx já processa /etc/nginx/templates/*.template com envsubst
# no boot, substituindo ${BACKEND_UPSTREAM}. NÃO usamos entrypoint customizado para
# evitar que plataformas (EasyPanel) o ignorem e quebrem a substituição -> 502.
ENV BACKEND_UPSTREAM=backend:3333

COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80 8080 3000 5173 4173

# Sem ENTRYPOINT/HEALTHCHECK custom: usa o entrypoint padrão do nginx, que faz o
# envsubst nos templates e inicia o servidor (nginx -g "daemon off;"). Isso funciona
# mesmo quando a plataforma ignora ENTRYPOINTs customizados.
