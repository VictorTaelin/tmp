#!/bin/bash

# Build TypeScript files to JavaScript in dist/
echo "Building TypeScript files..."

# Build from root
cd ..
bun build client.ts --outdir walkers/dist --target=browser --format=esm
bun build state_machine.ts --outdir walkers/dist --target=browser --format=esm

# Build from walkers
cd walkers
bun build index.ts --outdir dist --target=browser --format=esm

echo "Build complete! Open index.html in your browser or run the unified server."
