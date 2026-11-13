<script setup>
import { ref } from 'vue';
import MapSurface from '../components/MapSurface.vue';

const frame = ref(0);
const variant = ref('landscape');
</script>

<template>
  <main class="q-pa-md">
    <h1 class="text-h4">Bridge diagnostic preview</h1>
    <p>Synthetic fixture; this is not the editor.</p>
    <div class="controls">
      <label for="frame">Frame (0–299)</label>
      <input id="frame" v-model.number="frame" type="number" min="0" max="299" step="1">
      <label for="variant">Output variant</label>
      <select id="variant" v-model="variant">
        <option value="landscape">Landscape</option>
        <option value="portrait">Portrait</option>
      </select>
    </div>
    <MapSurface :frame="frame" :variant="variant" />
  </main>
</template>

<style scoped>
.controls { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; margin-bottom: 1rem; }
</style>

