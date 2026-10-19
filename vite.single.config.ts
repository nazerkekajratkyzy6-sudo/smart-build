// Бір HTML файлға жиналатын алдын ала қарау нұсқасы (PWA-сыз). Негізгі жариялау үшін vite.config.ts қолданылады.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  define: { 'import.meta.env.VITE_SINGLE': JSON.stringify('1') },
  resolve: { alias: { 'virtual:pwa-register': '/src/pwa-stub.ts' } },
  build: { outDir: 'dist-single', emptyOutDir: true },
});
