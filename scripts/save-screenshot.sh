#!/bin/bash
# Simple script to save base64 screenshot data
# Usage: ./save-screenshot.sh <filename> <base64-data>

filename="$1"
base64_data="$2"

echo "$base64_data" | base64 -d > "screenshots/$filename"
echo "Screenshot saved to screenshots/$filename"
