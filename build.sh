#!/bin/bash
# Root="./"
# Source="${Root}dist/"
# Target="${Root}public/"
# ServerTarget="${Root}server/"

# Create Target directory if it doesn't exist
mkdir -p "$Target"

# Remove contents of Source and Target directories
# rm -rf "${Source}"*
# rm -rf "${Target}"*
# rm -rf "${ServerTarget}"*

# Run npm build
npm run build

# Copy contents from Source to Target
# cp -R "${Source}"* "$Target"

# Run node index.js
node ./dist/server/index.js