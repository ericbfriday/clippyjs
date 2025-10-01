#!/bin/bash

# Installation and Build Script for ClippyJS with React 19 + TypeScript 5.7.3
# This script will install dependencies and attempt to build the project

echo "========================================="
echo "ClippyJS Installation & Build Script"
echo "React 19 + TypeScript 5.7.3"
echo "========================================="

# Check if yarn is available, otherwise use npm
if command -v yarn &> /dev/null; then
    PACKAGE_MANAGER="yarn"
    echo "Using yarn for package management"
else
    PACKAGE_MANAGER="npm"
    echo "Using npm for package management"
fi

echo ""
echo "Step 1: Cleaning previous builds and installations..."
rm -rf node_modules dist yarn.lock package-lock.json

echo ""
echo "Step 2: Installing dependencies..."
if [ "$PACKAGE_MANAGER" = "yarn" ]; then
    yarn install
else
    npm install
fi

if [ $? -ne 0 ]; then
    echo "Installation failed. Trying with legacy peer deps..."
    if [ "$PACKAGE_MANAGER" = "npm" ]; then
        npm install --legacy-peer-deps
    fi
fi

echo ""
echo "Step 3: Running TypeScript compilation..."
npx tsc --noEmit

echo ""
echo "Step 4: Building the project..."
if [ "$PACKAGE_MANAGER" = "yarn" ]; then
    yarn build
else
    npm run build
fi

echo ""
echo "========================================="
echo "Build process complete!"
echo "Check above for any errors or warnings."
echo "========================================="