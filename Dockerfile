# syntax=docker/dockerfile:1

# ---- builder ----------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# VITE_API_BASE_URL is deliberately left empty: nginx proxies /api and /media
# same-origin, so no API hostname is inlined into the bundle and a domain
# change needs no rebuild.
ENV VITE_API_BASE_URL=""

# `npm run build` is `tsc -b && vite build`, so this type-checks as well.
RUN npm run build


# ---- runtime ----------------------------------------------------------------
FROM nginx:alpine AS runtime

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q --spider http://127.0.0.1/ || exit 1
