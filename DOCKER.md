# Docker Setup Guide

This guide explains how to run the ETF Overlap application using Docker.

## Prerequisites

- Docker (20.10 or later)
- Docker Compose (2.0 or later)

## Quick Start

1. **Clone the repository** (if you haven't already):

   ```bash
   git clone <repository-url>
   cd etf-overlap
   ```

2. **Create environment file** (optional):

   ```bash
   cp .env.example .env
   ```

   Edit `.env` to customize database credentials and ports if needed.

3. **Start the application**:

   ```bash
   docker-compose up -d
   ```

4. **Access the application**:
   Open your browser and navigate to [http://localhost:3000](http://localhost:3000)

The database will be automatically initialized with the schema on first startup.

## Docker Commands

### Start the application

```bash
docker-compose up -d
```

### Stop the application

```bash
docker-compose down
```

### Stop and remove all data (including database)

```bash
docker-compose down -v
```

### View logs

```bash
# All services
docker-compose logs -f

# Just the app
docker-compose logs -f app

# Just the database
docker-compose logs -f db
```

### Rebuild after code changes

```bash
docker-compose up -d --build
```

### Access the database

```bash
docker-compose exec db psql -U postgres -d etf_overlap
```

## Environment Variables

You can customize the following environment variables in your `.env` file:

| Variable            | Description              | Default       |
| ------------------- | ------------------------ | ------------- |
| `POSTGRES_USER`     | Database username        | `postgres`    |
| `POSTGRES_PASSWORD` | Database password        | `postgres`    |
| `POSTGRES_DB`       | Database name            | `etf_overlap` |
| `POSTGRES_PORT`     | PostgreSQL port on host  | `5432`        |
| `APP_PORT`          | Application port on host | `3000`        |

## Architecture

The Docker setup consists of two services:

1. **app**: The Next.js application
   - Built using multi-stage Docker build for optimization
   - Includes Chromium for Puppeteer web scraping
   - Runs on Node.js 18 Alpine
   - Exposed on port 3000 (configurable)

2. **db**: PostgreSQL 15 database
   - Stores ETF metadata and holdings cache
   - Data persisted in Docker volume
   - Automatically initialized with schema on first run
   - Exposed on port 5432 (configurable)

## Data Persistence

Database data is stored in a Docker volume named `postgres_data`. This ensures your data persists across container restarts. To completely remove all data:

```bash
docker-compose down -v
```

## Troubleshooting

### Port conflicts

If ports 3000 or 5432 are already in use on your system, edit the `.env` file:

```env
APP_PORT=3001
POSTGRES_PORT=5433
```

### Chromium/Puppeteer issues

The Chromium browser runs inside the Docker container with:

- `seccomp:unconfined` for proper sandboxing
- 2GB shared memory for browser operations

If you encounter browser-related errors, check the app logs:

```bash
docker-compose logs app
```

### Database connection issues

Ensure the database is healthy before the app starts:

```bash
docker-compose ps
```

Both services should show as "healthy" or "running".

## Production Considerations

For production deployments:

1. **Change default passwords**: Always use strong, unique passwords in production
2. **Use secrets management**: Consider using Docker secrets or environment variable injection
3. **Enable HTTPS**: Use a reverse proxy (nginx, Traefik, Caddy) for SSL termination
4. **Resource limits**: Add resource constraints to docker-compose.yml
5. **Monitoring**: Add logging and monitoring solutions
6. **Backups**: Implement regular database backups

Example resource limits:

```yaml
app:
  deploy:
    resources:
      limits:
        cpus: "1"
        memory: 2G
      reservations:
        cpus: "0.5"
        memory: 512M
```

## Building Docker Image Only

To build just the Docker image without docker-compose:

```bash
docker build -t etf-overlap:latest .
```

To run the image (you'll need to provide database connection separately):

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:password@host:5432/dbname \
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

### Using docker-compose with specific platform

To specify platform in docker-compose.yml, add the `platform` field:

```yaml
services:
  app:
    platform: linux/amd64 # Force x86/AMD64
    build:
      context: .
      dockerfile: Dockerfile
    # ... rest of config
```

Or build with platform flag:

```bash
docker-compose build --build-arg BUILDPLATFORM=linux/amd64
```

### Verify the platform

Check which architecture an image was built for:

```bash
docker inspect etf-overlap:latest | grep Architecture
```
