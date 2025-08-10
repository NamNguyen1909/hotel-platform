#!/bin/bash
set -e

echo "🔧 Starting standalone Vite build..."

# Remove any existing node_modules to start fresh
rm -rf node_modules package-lock.json

# Install dependencies with explicit dev inclusion
npm install --no-package-lock --include=dev --production=false

# Verify vite is installed
if [ ! -d "node_modules/vite" ]; then
    echo "❌ Vite not found, installing manually..."
    npm install vite@^7.0.0 --no-save
fi

# List vite-related packages for debugging
echo "📦 Installed Vite packages:"
ls -la node_modules/ | grep -i vite || echo "No vite packages found"

# Build with explicit vite call
echo "🚀 Building with Vite..."
./node_modules/.bin/vite build

echo "✅ Build completed successfully!"
