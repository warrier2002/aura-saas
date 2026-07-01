# Stage 1: Build static frontend assets
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependency configs
COPY package*.json vite.config.js ./
RUN npm ci

# Copy source code and build
COPY frontend/ ./frontend/
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist /usr/share/nginx/html

RUN echo "server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files \$uri \$uri/ /index.html; \
    } \
    add_header X-Frame-Options 'SAMEORIGIN'; \
    add_header X-XSS-Protection '1; mode=block'; \
    add_header X-Content-Type-Options 'nosniff'; \
}" > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
