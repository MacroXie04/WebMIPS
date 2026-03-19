import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/WebMIPS/' : '/',
  build: {
    target: 'es2020',
  },
});
