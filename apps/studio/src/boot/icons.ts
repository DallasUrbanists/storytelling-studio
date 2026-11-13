import { defineBoot } from '@quasar/app-vite';
import { iconMapFn } from '../icons';
export default defineBoot(({ app }) => { app.config.globalProperties.$q.iconMapFn = iconMapFn; });
