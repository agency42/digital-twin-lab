#!/bin/bash
# Script to set up the new directory structure for the Digital Twin Lab project

echo "Setting up new directory structure..."

# Create directories
mkdir -p src/client/ts/modules
mkdir -p src/server
mkdir -p scripts

# Move frontend TypeScript files
echo "Moving frontend TypeScript files..."
if [ -d "public/js" ]; then
  # Copy TypeScript files
  find public/js -name "*.ts" -exec cp {} src/client/ts/ \;
  
  # Copy module directory
  if [ -d "public/js/modules" ]; then
    cp -r public/js/modules/* src/client/ts/modules/
  fi
fi

# Move backend files
echo "Moving backend files..."
if [ -d "src" ] && [ -f "src/server.ts" ]; then
  # Create server directory if it doesn't exist
  mkdir -p src/server
  
  # Move server files to server directory
  for dir in api lib routes services; do
    if [ -d "src/$dir" ]; then
      cp -r src/$dir src/server/
    fi
  done
  
  # Move server.ts
  if [ -f "src/server.ts" ]; then
    cp src/server.ts src/server/
  fi
fi

# Create scripts directory
echo "Setting up scripts directory..."
mkdir -p scripts

# Move scripts
if [ -f "clean-js.sh" ]; then
  cp clean-js.sh scripts/
fi

if [ -f "database/migrate.js" ]; then
  cp database/migrate.js scripts/
fi

if [ -f "database/reset.js" ]; then
  cp database/reset.js scripts/
fi

echo "Directory structure set up complete!"
echo "Note: Original files were not deleted, only copied to new locations."
echo "Once you verify everything works, you can remove the original files." 