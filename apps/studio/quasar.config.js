import { defineConfig } from '@quasar/app-vite';
import { fileURLToPath } from 'node:url';
export default defineConfig(() => ({
  boot: ['icons'], css: ['app.css'], extras: [],
  sourceFiles: { rootComponent: 'src/App.vue', router: 'src/router/index.ts' },
  framework: { plugins: [] },
  build: {
    target: { browser: ['es2022'], node: 'node24' }, vueRouterMode: 'hash',
    distDir: 'dist',
    extendViteConf(conf) {
      conf.resolve.alias = { ...conf.resolve.alias,
        '@gstory/project-schema': fileURLToPath(new URL('../../packages/project-schema/src/index.ts', import.meta.url)),
        '@gstory/story-core': fileURLToPath(new URL('../../packages/story-core/src/index.ts', import.meta.url)),
        '@gstory/map-adapter': fileURLToPath(new URL('../../packages/map-adapter/src/mount.ts', import.meta.url)),
      };
    },
  },
}));
