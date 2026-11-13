import { createApp } from 'vue';
import { Quasar } from 'quasar';
import 'quasar/dist/quasar.css';
import BridgePreview from './pages/BridgePreview.vue';
import App from './App.vue';
import './studio.css';
import { iconMapFn } from './icons';

const app = createApp(['/bridge-preview','/__parity'].includes(location.pathname) ? BridgePreview : App);
app.use(Quasar);
app.config.globalProperties.$q.iconMapFn = iconMapFn;
app.mount('#app');
