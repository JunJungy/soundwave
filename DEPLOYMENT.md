# Deployment Instructions for Soundwave

## Important: Publishing Game Files

The games (Flight Simulator and Quest of the Crystal Realm) require a special step before publishing to ensure they appear on the published version.

### Automatic Method (Recommended)

Run the preparation script before publishing:

```bash
./prepare-deploy.sh
```

This script will:
1. Build the application (`npm run build`)
2. Copy game HTML files to the dist/public directory
3. Prepare everything for deployment

### Manual Method

If you prefer to do it manually:

```bash
# Step 1: Build the application
npm run build

# Step 2: Copy game files
node copy-games.js
```

### After Running the Script

1. Click the **Publish** button in Replit
2. Your games will now be available on the published site!

### Why This Step is Necessary

- **Development**: Games are served from `client/public/`
- **Production**: Games must be in `dist/public/` to be included in the deployment
- The `copy-games.js` script ensures the HTML game files are copied to the correct location

### Verifying It Works

After publishing, you should be able to access:
- `/flight-simulator.html` - 3D Flight Simulator
- `/zelda-rpg.html` - Quest of the Crystal Realm

Both games will appear in the Games section of your app and can be played directly.

## Technical Details

The build process:
1. Vite builds the React frontend to `dist/public`
2. Esbuild bundles the Express server to `dist/index.js`
3. `copy-games.js` copies game HTML files from `client/public` to `dist/public`
4. In production, the server serves static files from `dist/public`

This ensures all game files are available in the published deployment.
