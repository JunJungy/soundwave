import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';

const sourceDir = 'client/public';
const destDir = 'dist/public';

// Ensure destination exists
if (!existsSync(destDir)) {
  mkdirSync(destDir, { recursive: true });
}

// Copy game HTML files
const gameFiles = ['flight-simulator.html', 'zelda-rpg.html', 'demo-game.html'];

gameFiles.forEach(file => {
  const source = resolve(sourceDir, file);
  const dest = resolve(destDir, file);
  if (existsSync(source)) {
    copyFileSync(source, dest);
    console.log(`✓ Copied ${file} to dist/public`);
  }
});

console.log('✓ All game files copied successfully');
