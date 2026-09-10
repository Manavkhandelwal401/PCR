# Multi-stage Dockerfile for React Frontend
# Stage 1: Build Vite React SPA
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Pass build-time API URL if provided (defaults to /api/v1 for reverse proxy)
ARG VITE_API_URL=/api/v1
ARG VITE_GITHUB_OAUTH_CLIENT_ID
ARG VITE_GITHUB_OAUTH_REDIRECT_URI
ARG VITE_GOOGLE_CLIENT_ID

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_GITHUB_OAUTH_CLIENT_ID=${VITE_GITHUB_OAUTH_CLIENT_ID}
ENV VITE_GITHUB_OAUTH_REDIRECT_URI=${VITE_GITHUB_OAUTH_REDIRECT_URI}
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}

RUN npm run build

# Stage 2: Serve via Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Cloud Run dynamic PORT injection
ENV PORT=80
ENV BACKEND_UPSTREAM_URL=https://pcr-backend-u36rneughq-el.a.run.app
ENV BACKEND_HOST=pcr-backend-u36rneughq-el.a.run.app

# Substitute PORT, BACKEND_UPSTREAM_URL, and BACKEND_HOST in nginx template automatically at startup
CMD ["/bin/sh", "-c", "export BACKEND_HOST=$(echo $BACKEND_UPSTREAM_URL | sed -e 's|^[^/]*//||' -e 's|/.*$||') && sed -i \"s/listen 80;/listen ${PORT};/g\" /etc/nginx/templates/default.conf.template && envsubst '$$BACKEND_UPSTREAM_URL $$BACKEND_HOST' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
