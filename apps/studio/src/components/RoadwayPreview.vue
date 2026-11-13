<script setup lang="ts">
import { computed } from 'vue';
import { roadwayDrawing, type RoadwayVariant } from '../../../../packages/map-adapter/src/svg-overlay.ts';
import type { RoadwayWidthResult } from '../../../../packages/story-core/src/roadway.ts';

const props = defineProps<{ result: RoadwayWidthResult; variant: RoadwayVariant }>();
const drawing = computed(() => roadwayDrawing(props.result, props.variant));
const colors: Record<string, string> = {
  'through-lane': '#56646b', 'center-turn-lane': '#69747a', 'bike-lane': '#267847',
  buffer: '#c8d1cd', sidewalk: '#e2ddd2', parking: '#77858b', median: '#b3c3ad', other: '#aab4b7',
};
const names: Record<string, string> = {
  'through-lane': 'Through lane', 'center-turn-lane': 'Center turn lane', 'bike-lane': 'Bicycle space',
  buffer: 'Buffer', sidewalk: 'Sidewalk', parking: 'Parking', median: 'Median', other: 'Other',
};
const format = (value: number | null) => value === null ? 'Unknown' : `${Number(value.toPrecision(10))} m`;
</script>

<template>
  <section class="roadway-preview" aria-label="Roadway preview">
    <h2>Top-down schematic</h2>
    <p v-if="result.status === 'infeasible'" role="alert">Infeasible: the widths or constraints need attention.</p>
    <ul v-if="result.status === 'infeasible'" aria-label="Width diagnostics">
      <li v-for="(diagnostic, index) in result.diagnostics" :key="index">
        {{ diagnostic.constraint }}{{ diagnostic.bandIds.length ? ` (${diagnostic.bandIds.join(', ')})` : '' }}:
        {{ diagnostic.message }}<template v-if="diagnostic.residualMeters !== null"> Residual: {{ format(diagnostic.residualMeters) }}.</template>
      </li>
    </ul>
    <p>Declared curb-to-curb: {{ format(result.pavement.availableMeters) }}.
      <template v-if="result.envelope">Declared total envelope: {{ format(result.envelope.availableMeters) }}.</template>
      <template v-else>Declared total envelope: Unknown.</template>
    </p>
    <template v-if="drawing">
      <p>Illustrated band total: {{ format(drawing.totalMeters) }}. The list follows bands from left to right; wider bands are numbered.</p>
      <svg viewBox="0 0 1080 420" role="img" aria-label="Numbered top-down roadway bands; details follow" xmlns="http://www.w3.org/2000/svg">
        <g v-for="item in drawing.bands" :key="item.band.id">
          <rect :x="item.x" y="30" :width="item.width" height="300" :fill="colors[item.band.kind]" stroke="#16262e" stroke-width="2" />
          <line v-if="item.band.kind === 'center-turn-lane' && item.width > 8" :x1="item.x + 4" y1="32" :x2="item.x + 4" y2="328" stroke="#f6d767" stroke-width="3" stroke-dasharray="14 10" />
          <line v-if="item.band.kind === 'buffer' && item.width > 12" :x1="item.x + item.width / 2" y1="32" :x2="item.x + item.width / 2" y2="328" stroke="#52626b" stroke-width="3" stroke-dasharray="8 8" />
          <text v-if="item.width >= 38" :x="item.x + item.width / 2" y="185" text-anchor="middle" fill="white" stroke="#16262e" stroke-width="4" paint-order="stroke" font-size="32" font-weight="bold">{{ item.band.direction === 'forward' ? '↑' : item.band.direction === 'reverse' ? '↓' : item.band.direction === 'both' ? '↕' : '•' }}</text>
          <text v-if="item.width >= 28" :x="item.x + item.width / 2" y="365" text-anchor="middle" fill="#16262e" font-size="24">{{ item.number }}</text>
        </g>
      </svg>
      <ol class="band-list">
        <li v-for="item in drawing.bands" :key="item.band.id">
          <strong>{{ names[item.band.kind] }}</strong><template v-if="item.band.label"> — {{ item.band.label }}</template>:
          {{ item.band.width.status === 'unknown' ? 'Unknown' : `${item.band.width.value} ${item.band.width.unit}` }}
          ({{ item.band.width.status }}); direction {{ item.band.direction }}; {{ item.band.location }}.
        </li>
      </ol>
    </template>
    <p v-else>Drawing unavailable because a band width is unknown or invalid.</p>
  </section>
</template>

<style scoped>
.roadway-preview { max-width: 100%; color: #16262e; }
svg { display: block; width: 100%; height: auto; }
.band-list li { overflow-wrap: anywhere; margin-block: 0.4em; }
</style>
