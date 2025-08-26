# Multi-stage build for Chrome DevTools Frontend
# Stage 1: Builder - Use x86-64 for build compatibility
FROM --platform=linux/amd64 ubuntu:22.04 AS builder

# Install required packages for the build
RUN apt-get update && apt-get install -y \
    curl \
    git \
    python3 \
    python3-pip \
    python-is-python3 \
    wget \
    unzip \
    lsb-release \
    sudo \
    ca-certificates \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 18.x (LTS)
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Set up working directory
WORKDIR /workspace

# Copy the entire repository
COPY . .

# Clone depot_tools if not exists and add to PATH
RUN if [ ! -d "third_party/depot_tools" ]; then \
        git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git third_party/depot_tools; \
    fi

# Set PATH to include depot_tools
ENV PATH="/workspace/third_party/depot_tools:${PATH}"

# Set environment variables to bypass CIPD issues
ENV VPYTHON_BYPASS="manually managed python not supported by chrome operations"
ENV DEPOT_TOOLS_UPDATE=0

# Download Node.js binary for the expected path (x86-64)
RUN mkdir -p third_party/node/linux && \
    cd third_party/node/linux && \
    wget -q https://nodejs.org/dist/v18.20.0/node-v18.20.0-linux-x64.tar.xz && \
    tar -xf node-v18.20.0-linux-x64.tar.xz && \
    mv node-v18.20.0-linux-x64 node-linux-x64 && \
    rm -rf node-v18.20.0-linux-x64.tar.xz

# Download correct ninja binary for x86-64
RUN rm -rf third_party/ninja && \
    mkdir -p third_party/ninja && \
    wget -O /tmp/ninja.zip https://github.com/ninja-build/ninja/releases/download/v1.11.1/ninja-linux.zip && \
    unzip -o /tmp/ninja.zip -d third_party/ninja/ && \
    chmod +x third_party/ninja/ninja && \
    rm /tmp/ninja.zip

# Create a simple python3 wrapper for vpython3
RUN echo '#!/bin/bash\nexec python3 "$@"' > /usr/local/bin/vpython3 && \
    chmod +x /usr/local/bin/vpython3

# Run npm install and build
RUN npm install && \
    npm run build

# Stage 2: Production
FROM nginx:alpine

# Copy only the built frontend files from builder stage
COPY --from=builder /workspace/out/Default/gen/front_end /usr/share/nginx/html

# Copy nginx configuration
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 8000 to match the original Python server port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8000/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]