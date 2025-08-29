# Multi-stage build for Chrome DevTools Frontend
FROM --platform=linux/amd64 ubuntu:22.04 AS builder

# Install required packages
RUN apt-get update && apt-get install -y \
    curl \
    git \
    python3 \
    python3-pip \
    python-is-python3 \
    wget \
    unzip \
    sudo \
    ca-certificates \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 18.x
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

# Clone depot_tools
RUN git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git
ENV PATH="/workspace/depot_tools:${PATH}"
ENV DEPOT_TOOLS_UPDATE=0

# Follow README instructions exactly:
# fetching code
RUN mkdir devtools
WORKDIR /workspace/devtools
RUN fetch devtools-frontend

# Build steps
WORKDIR /workspace/devtools/devtools-frontend

RUN gclient sync
RUN /workspace/depot_tools/ensure_bootstrap

# Build standard DevTools first
RUN npm run build

# Add Browser Operator fork and switch to it
RUN git remote add upstream https://github.com/BrowserOperator/browser-operator-core.git
RUN git fetch upstream
RUN git checkout upstream/main

# Build Browser Operator version
RUN npm run build

# Production stage
FROM --platform=linux/amd64 nginx:alpine

# Copy the built DevTools frontend
COPY --from=builder /workspace/devtools/devtools-frontend/out/Default/gen/front_end /usr/share/nginx/html

# Copy nginx config
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8000