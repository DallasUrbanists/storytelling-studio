<script setup>
import { ref } from 'vue';

defineProps({ areas: { type: Array, required: true } });
const emit = defineEmits(['select']);
const selected = ref('');
const rationale = ref('');
</script>

<template>
  <section>
    <h2>Study area</h2>
    <p>Only synthetic areas are available here. Changing the area clears derived inputs.</p>
    <label for="research-area">Synthetic area</label>
    <select id="research-area" v-model="selected">
      <option value="" disabled>Select an area</option>
      <option v-for="area in areas.filter(item => item.kind === 'synthetic')" :key="area.featureRevisionId" :value="area.featureRevisionId">
        {{ area.featureRevisionId }}
      </option>
    </select>
    <label for="area-rationale">Why did you select this area?</label>
    <textarea id="area-rationale" v-model="rationale" />
    <button type="button" :disabled="!selected || !rationale.trim()" @click="emit('select', { featureRevisionId: selected, selectionRationale: rationale })">
      Select area
    </button>
  </section>
</template>

