#!/bin/bash
echo "🚀 Preparing for deployment..."
echo ""
echo "Step 1: Building the application..."
npm run build
echo ""
echo "Step 2: Copying game files..."
node copy-games.js
echo ""
echo "✅ Deployment preparation complete!"
echo ""
echo "Your app is now ready to be published."
echo "Click the 'Publish' button in Replit to deploy your changes."
