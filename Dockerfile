# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Build-time envs for Vite (MIX ID, ML, backend)
# Defaults are safe public URLs; can be overridden via --build-arg
ARG VITE_MIX_ID_API_BASE=https://data-center.zorin.cloud/api
ARG VITE_MIX_ID_CLIENT_ID
ARG VITE_MIX_ID_CLIENT_SECRET
ARG VITE_ML_API_URL=https://kimai-ml.zorin.cloud
ARG VITE_BACKEND_URL=https://kimai-api.zorin.cloud

ENV VITE_MIX_ID_API_BASE=${VITE_MIX_ID_API_BASE}
ENV VITE_MIX_ID_CLIENT_ID=${VITE_MIX_ID_CLIENT_ID}
ENV VITE_MIX_ID_CLIENT_SECRET=${VITE_MIX_ID_CLIENT_SECRET}
ENV VITE_ML_API_URL=${VITE_ML_API_URL}
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY src ./src
COPY index.html ./

# Build the application
RUN npm run build

# Production stage - serve with nginx
FROM nginx:alpine

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

