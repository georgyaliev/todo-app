import { defineConfig } from 'vite';

export default defineConfig({
  base: '/todo-app/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
