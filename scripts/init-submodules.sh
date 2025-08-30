#!/bin/bash

# Skip if SKIP_POSTINSTALL is set (useful for CI environments)
if [ "${SKIP_POSTINSTALL}" = "1" ]; then
    echo "Skipping submodule initialization (SKIP_POSTINSTALL=1)"
    exit 0
fi

# Skip if not in a git repository (e.g., Vercel deployment)
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Not in a git repository, skipping submodule initialization"
    exit 0
fi

# Initialize git submodules
echo "Initializing git submodules..."
git submodule update --init --recursive

# Check if initialization was successful
if [ $? -eq 0 ]; then
    echo "Git submodules initialized successfully"
else
    echo "Error: Failed to initialize git submodules"
    exit 1
fi
