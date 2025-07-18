#!/bin/bash

# Docker build script for ffmpeg-repeater
# Usage: ./scripts/docker-build.sh [tag]

set -e

# Default values
DOCKER_REGISTRY="your-registry"  # Change this to your Docker registry
IMAGE_NAME="ffmpeg-repeater"
TAG="${1:-latest}"
FULL_IMAGE_NAME="${DOCKER_REGISTRY}/${IMAGE_NAME}:${TAG}"

echo "🚀 Building Docker image: ${FULL_IMAGE_NAME}"

# Build the Docker image
docker build \
  --tag "${IMAGE_NAME}:${TAG}" \
  --tag "${IMAGE_NAME}:latest" \
  --tag "${FULL_IMAGE_NAME}" \
  --build-arg NODE_ENV=production \
  .

echo "✅ Successfully built Docker image: ${FULL_IMAGE_NAME}"

# Display image info
echo ""
echo "📊 Image Information:"
docker images "${IMAGE_NAME}" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"

echo ""
echo "🏃 To run the container:"
echo "  docker run --env-file .env -v \$(pwd)/temp:/app/temp -v \$(pwd)/output:/app/output ${IMAGE_NAME}:${TAG}"
echo ""
echo "🐳 To run with docker-compose:"
echo "  docker-compose up"
echo ""
echo "📤 To push to registry:"
echo "  docker push ${FULL_IMAGE_NAME}" 