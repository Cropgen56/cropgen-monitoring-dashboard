# ── Build: Vite bakes VITE_* values into the bundle at build time ─────────────
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Browser-facing settings (the browser calls these URLs directly, so they must be
# reachable from the user's machine — not Docker service names).
ARG VITE_GOOGLE_MAPS_API_KEY
ARG VITE_VILLAGE_BOUNDARY_API_ORIGIN
ARG VITE_FIELD_DELINEATION_API_ORIGIN
ARG VITE_DELINEATION_MAX_AREA_KM2
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY \
    VITE_VILLAGE_BOUNDARY_API_ORIGIN=$VITE_VILLAGE_BOUNDARY_API_ORIGIN \
    VITE_FIELD_DELINEATION_API_ORIGIN=$VITE_FIELD_DELINEATION_API_ORIGIN \
    VITE_DELINEATION_MAX_AREA_KM2=$VITE_DELINEATION_MAX_AREA_KM2

RUN npm run build

# ── Serve: static files from nginx ────────────────────────────────────────────
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
