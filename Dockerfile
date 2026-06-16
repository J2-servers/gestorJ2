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
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY docker/frontend-entrypoint.sh /frontend-entrypoint.sh
COPY --from=builder /app/dist /usr/share/nginx/html

RUN chmod +x /frontend-entrypoint.sh

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1

ENTRYPOINT ["/frontend-entrypoint.sh"]
