#!/bin/bash
# Script to clean all compiled JavaScript files from the TypeScript source files

echo "Cleaning compiled JavaScript files..."

# Find and remove all .js and .js.map files in the public/js directory
find public/js -name "*.js" -delete
find public/js -name "*.js.map" -delete

echo "Done! All compiled JavaScript files have been removed."
echo "Run 'npm run watch-ts' to recompile the TypeScript files for development."
