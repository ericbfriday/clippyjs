#!/bin/bash

# Installation and Build Script for ClippyJS with React 19 + TypeScript 5.7.3
# This script will install dependencies and attempt to build the project

echo "========================================="
echo "ClippyJS Installation & Build Script"
echo "React 19 + TypeScript 5.7.3"
echo "========================================="

echo "Using yarn for package management"

echo ""
echo "Step 1: Cleaning previous builds and installations..."
rm -rf node_modules dist yarn.lock package-lock.json

echo ""
echo "Step 2: Installing dependencies..."
yarn install

if [ $? -ne 0 ]; then
    echo "Installation failed."
    exit 1
fi


echo ""
echo "Step 3: Running TypeScript compilation..."
yarn tsc --noEmit

echo ""
echo "Step 4: Building the project..."
yarn build

echo ""
echo "========================================="
echo "Build process complete!"
echo "Check above for any errors or warnings."
echo "========================================="
