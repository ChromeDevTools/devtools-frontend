# Docker Setup for Chrome DevTools Frontend

This directory contains Docker configuration files for building and running the Chrome DevTools Frontend in a containerized environment.

## Overview

The Docker setup uses a multi-stage build process:
1. **Build Stage**: Compiles the DevTools frontend using the full development environment
2. **Production Stage**: Serves only the built files using Nginx (lightweight, ~50MB final image)

## Prerequisites

- Docker Engine 20.10+ installed
- Docker Compose v2.0+ (optional, for easier management)
- At least 8GB of available disk space for the build process
- 4GB+ RAM recommended for building

## Quick Start

### Building the Docker Image

From the repository root directory:

```bash
# Build the Docker image
docker build -f docker/Dockerfile -t devtools-frontend .

# Or use docker-compose (recommended)
docker-compose -f docker/docker-compose.yml build
```

### Running the Container

```bash
# Using docker run
docker run -d -p 8000:8000 --name devtools-frontend devtools-frontend

# Or using docker-compose (recommended)
docker-compose -f docker/docker-compose.yml up -d
```

The DevTools will be available at: http://localhost:8000

### Accessing DevTools

Once the container is running, open Chrome or Chromium with:

```bash
# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --custom-devtools-frontend=http://localhost:8000/

# Linux
google-chrome --custom-devtools-frontend=http://localhost:8000/

# Windows
chrome.exe --custom-devtools-frontend=http://localhost:8000/
```

## File Structure

```
docker/
├── Dockerfile           # Multi-stage build configuration
├── .dockerignore       # Files to exclude from Docker context
├── nginx.conf          # Nginx server configuration
├── docker-compose.yml  # Docker Compose configuration
└── README.md          # This file
```

## Advanced Usage

### Development Mode

For development with local file changes:

1. Build the project locally first:
```bash
npm run build
```

2. Run the container with volume mount:
```bash
docker run -d -p 8000:8000 \
  -v $(pwd)/out/Default/gen/front_end:/usr/share/nginx/html:ro \
  --name devtools-frontend-dev \
  devtools-frontend
```

Or uncomment the volume mount in `docker-compose.yml`.

### Custom Port

To run on a different port:

```bash
# Using docker run
docker run -d -p 9000:8000 devtools-frontend

# Using docker-compose
DEVTOOLS_PORT=9000 docker-compose -f docker/docker-compose.yml up -d
```

Then update your Chrome launch command accordingly.

### Building with Cache

To speed up rebuilds, Docker automatically caches layers. To force a fresh build:

```bash
docker build -f docker/Dockerfile --no-cache -t devtools-frontend .
```

### Viewing Logs

```bash
# Using docker
docker logs devtools-frontend

# Using docker-compose
docker-compose -f docker/docker-compose.yml logs -f
```

### Stopping the Container

```bash
# Using docker
docker stop devtools-frontend
docker rm devtools-frontend

# Using docker-compose
docker-compose -f docker/docker-compose.yml down
```

## Troubleshooting

### Build Fails

If the build fails:
1. Ensure you have enough disk space (8GB+ free)
2. Check Docker memory limits (4GB+ recommended)
3. Try building with `--no-cache` flag
4. Check the build logs for specific errors

### Container Won't Start

1. Check if port 8000 is already in use:
   ```bash
   lsof -i :8000  # macOS/Linux
   netstat -an | findstr :8000  # Windows
   ```

2. View container logs:
   ```bash
   docker logs devtools-frontend
   ```

### DevTools Not Loading

1. Verify the container is running:
   ```bash
   docker ps
   ```

2. Check Nginx is serving files:
   ```bash
   curl http://localhost:8000/
   ```

3. Ensure Chrome is launched with the correct flag

## Performance

- **Build time**: ~10-20 minutes (first build, depending on system)
- **Image size**: ~50MB (production image with Nginx)
- **Memory usage**: ~50-100MB at runtime
- **Startup time**: <5 seconds

## Security Notes

- The Nginx configuration includes security headers
- CORS is enabled for DevTools functionality
- The container runs as non-root user (nginx)
- No sensitive data is included in the final image

## Contributing

When modifying the Docker setup:
1. Test builds locally before committing
2. Update this README if configuration changes
3. Keep the final image size minimal
4. Follow Docker best practices for multi-stage builds

## License

Same as the Chrome DevTools Frontend project - BSD-3-Clause