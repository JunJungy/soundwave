# Deployment Instructions for Soundwave

## Publishing to Production

**Good news!** The server now **automatically** copies game files on startup in production mode. 

### Just Click Publish!

Simply click the **Publish** button in Replit - that's it! The games will automatically be available on your published site.

### What Happens Automatically

When your app starts in production:
1. The server checks if game files exist in `dist/public`
2. If not found, it automatically copies them from `client/public`
3. Games become immediately available

### Optional: Manual Build (Advanced)

If you want to manually prepare the build before publishing:

```bash
./prepare-deploy.sh
```

This script will:
1. Build the application (`npm run build`)
2. Copy game HTML files to the dist/public directory
3. Prepare everything for deployment

But this is **optional** - the automatic system will handle it for you!

### How It Works

- **Development**: Games are served from `client/public/`
- **Production**: Games are automatically copied to `dist/public/` on server startup
- The server's `ensureGameFilesInProduction()` function handles this automatically

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
