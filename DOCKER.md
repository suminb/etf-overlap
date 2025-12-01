# Docker Setup Guide

This guide explains how to run the ETF Overlap application using Docker.

## Prerequisites

- Docker (20.10 or later)

## Quick Start

1. **Fetch ETF data** (if not already done):

   ```bash
   npm install
   npm run fetch QQQ SPY VTI
   # Or fetch all popular ETFs
   npm run fetch --all
   ```

2. **Build the Docker image**:

   ```bash
   docker build -t etf-overlap:latest .
   ```

3. **Run the container**:

   ```bash
   docker run -p 3000:3000 etf-overlap:latest
   ```

4. **Access the application**:
   Open your browser and navigate to [http://localhost:3000](http://localhost:3000)

## Docker Commands

### Build the image

```bash
docker build -t etf-overlap:latest .
```

### Run the container

```bash
docker run -p 3000:3000 etf-overlap:latest
```

### Run in detached mode

```bash
docker run -d -p 3000:3000 --name etf-overlap etf-overlap:latest
```

### Stop the container

```bash
docker stop etf-overlap
```

### Remove the container

```bash
docker rm etf-overlap
```

### View logs

```bash
docker logs -f etf-overlap
```

### Execute commands in running container

```bash
docker exec -it etf-overlap sh
```

## Architecture

The Docker image:

- Built using multi-stage Docker build for optimization
- Includes Chromium for Puppeteer web fetching
- Runs on Node.js 18 Alpine
- Contains pre-fetchd ETF data in `/app/data/`
- Exposed on port 3000

## Data Management

### Updating ETF Data

To update ETF holdings data:

1. Fetch new data locally:

   ```bash
   npm run fetch QQQ SPY
   ```

2. Rebuild the Docker image:

   ```bash
   docker build -t etf-overlap:latest .
   ```

3. Stop and remove the old container:

   ```bash
   docker stop etf-overlap
   docker rm etf-overlap
   ```

4. Start a new container with updated data:
   ```bash
   docker run -d -p 3000:3000 --name etf-overlap etf-overlap:latest
   ```

### Checking Available ETF Data

```bash
docker exec etf-overlap ls -la /app/data/etfs/
```

## Troubleshooting

### Port conflicts

If port 3000 is already in use on your system:

```bash
docker run -p 8080:3000 etf-overlap:latest
```

Then access at http://localhost:8080

### Chromium/Puppeteer issues

The Chromium browser runs inside the Docker container with:

- `seccomp:unconfined` for proper sandboxing (if needed)
- 2GB shared memory for browser operations

If you encounter browser-related errors, check the container logs:

```bash
docker logs etf-overlap
```

To run with additional security options:

```bash
docker run -p 3000:3000 \
  --security-opt seccomp=unconfined \
  --shm-size=2g \
  etf-overlap:latest
```

### Container won't start

Check logs for errors:

```bash
docker logs etf-overlap
```

Verify the image was built correctly:

```bash
docker images | grep etf-overlap
```

## Production Considerations

For production deployments:

1. **Use specific tags**: Tag images with version numbers instead of `latest`

   ```bash
   docker build -t etf-overlap:1.0.0 .
   ```

2. **Resource limits**: Add resource constraints

   ```bash
   docker run -p 3000:3000 \
     --memory=2g \
     --cpus=1 \
     etf-overlap:latest
   ```

3. **Health checks**: Docker includes built-in health checks from the Dockerfile

4. **Logging**: Configure log drivers for centralized logging

   ```bash
   docker run -p 3000:3000 \
     --log-driver=json-file \
     --log-opt max-size=10m \
     --log-opt max-file=3 \
     etf-overlap:latest
   ```

5. **Restart policy**: Automatically restart on failure
   ```bash
   docker run -p 3000:3000 \
     --restart=unless-stopped \
     etf-overlap:latest
   ```

## Cross-Platform Builds (ARM to x86/AMD64)

If you're running on an ARM-based Mac (Apple Silicon) and want to build an x86/AMD64 image for deployment on Intel/AMD servers, use Docker's buildx:

### One-time setup

Create a multi-platform builder (only needed once):

```bash
docker buildx create --name multiplatform --use
docker buildx inspect --bootstrap
```

### Build for x86/AMD64

Build and load the image for AMD64 architecture:

```bash
docker buildx build --platform linux/amd64 -t etf-overlap:latest --load .
```

### Build for multiple platforms

Build for both ARM64 and AMD64:

```bash
docker buildx build --platform linux/amd64,linux/arm64 -t etf-overlap:latest --load .
```

**Note**: When building for multiple platforms simultaneously, you cannot use `--load`. Instead, you must push to a registry:

```bash
docker buildx build --platform linux/amd64,linux/arm64 \
  -t your-registry/etf-overlap:latest \
  --push .
```

### Verify the platform

Check which architecture an image was built for:

```bash
docker inspect etf-overlap:latest | grep Architecture
```

## Registry Integration

### Tag and push to Docker Hub

```bash
docker tag etf-overlap:latest username/etf-overlap:latest
docker push username/etf-overlap:latest
```

### Tag and push to private registry

```bash
docker tag etf-overlap:latest registry.example.com/etf-overlap:latest
docker push registry.example.com/etf-overlap:latest
```

### Pull from registry

```bash
docker pull username/etf-overlap:latest
```
