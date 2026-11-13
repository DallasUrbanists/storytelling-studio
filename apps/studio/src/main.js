import { createApp } from 'vue';
import { Quasar } from 'quasar';
import 'quasar/dist/quasar.css';
import BridgePreview from './pages/BridgePreview.vue';

createApp(BridgePreview).use(Quasar).mount('#app');
