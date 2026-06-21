# Stage 1: build Vue frontend
FROM node:20-alpine AS builder
WORKDIR /app

# In production the API is served from the same origin under /api.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

COPY frontend-vue/package*.json ./frontend-vue/
WORKDIR /app/frontend-vue
RUN npm ci

WORKDIR /app
COPY frontend-vue ./frontend-vue
COPY scripts ./scripts

# Ensure PWA/push icons exist even from a clean clone.
RUN node scripts/generate-icons.cjs frontend-vue/public

WORKDIR /app/frontend-vue
RUN npm run build

# Stage 2: serve with nginx
FROM nginx:1.27-alpine AS runner

# Default proxy target for /api. EasyPanel can override BACKEND_UPSTREAM.
# The official nginx image processes /etc/nginx/templates/*.template with envsubst.
ENV BACKEND_UPSTREAM=backend:3333

COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=builder /app/frontend-vue/dist /usr/share/nginx/html

EXPOSE 80 8080 3000 5173 4173
