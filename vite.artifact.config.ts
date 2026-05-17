import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { defineConfig } from 'vite';
import path from 'node:path';

// Bundles the artifact entry (src/artifact/index.html) into a single,
// self-contained HTML file suitable for upload to SecondAxis as a custom artifact.
export default defineConfig({
  root: path.resolve(import.meta.dirname, 'src/artifact'),
  plugins: [tailwindcss(), svelte(), viteSingleFile()],
  build: {
    outDir: path.resolve(import.meta.dirname, 'artifact-dist'),
    emptyOutDir: true,
    target: 'es2022',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    rollupOptions: {
      output: {
        inlineDynamicImports: true
      }
    }
  },
  resolve: {
    alias: {
      $lib: path.resolve(import.meta.dirname, 'src/lib')
    }
  }
});
