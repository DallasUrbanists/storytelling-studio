import type { Map as MapLibreMap } from 'maplibre-gl';
import type { FrameState } from '../../story-core/src/index.ts';
import { drawStoryPanels } from './story-panels.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';
type Position = FrameState['camera']['center'];

function element<K extends keyof SVGElementTagNameMap>(
  owner: Document,
  tag: K,
  attributes: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const node = owner.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) {
    node.setAttribute(name, String(value));
  }
  return node;
}

export function createOverlay(owner: Document, viewport: FrameState['viewport']): SVGSVGElement {
  const { width, height } = viewport;
  const svg = element(owner, 'svg', {
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
    'aria-hidden': 'true',
  });
  Object.assign(svg.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
  return svg;
}

export function drawOverlay(
  svg: SVGSVGElement,
  map: MapLibreMap,
  state: FrameState,
  fontFamily: string,
): void {
  const owner = svg.ownerDocument;
  const content = owner.createDocumentFragment();
  const project = ([longitude, latitude]: Position) => map.project([longitude, latitude]);
  const path = (coordinates: readonly Position[]) =>
    coordinates.map((coordinate, index) => {
      const { x, y } = project(coordinate);
      return `${index === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ');
  const drawLine = (group: SVGGElement, coordinates: readonly Position[], style?: FrameState['layers'][number]['style']) => {
    if (coordinates.length < 2) return;
    group.append(element(owner, 'path', {
      d: path(coordinates),
      fill: 'none',
      stroke: style?.stroke ?? '#0f766e',
      'stroke-width': style?.width ?? 4,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    }));
  };

  // One even-odd complement keeps the polygon body clear and dims its holes.
  // This scene effect sits above the basemap, below all ordered feature layers.
  if (state.outsideDimming) {
    const { geometry, opacity, featureRevisionId } = state.outsideDimming;
    const { width, height } = state.viewport;
    content.append(element(owner, 'path', {
      'data-outside-dimming': featureRevisionId,
      d: `M0,0 H${width} V${height} H0 Z `
        + (geometry.type === 'Polygon' ? geometry.coordinates : geometry.coordinates.flat()).map(ring => `${path(ring)} Z`).join(' '),
      fill: '#000000',
      'fill-opacity': opacity,
      'fill-rule': 'evenodd',
    }));
  }

  for (const layer of state.layers) {
    if (!layer.visible) continue;
    const group = element(owner, 'g', { 'data-layer': layer.id, opacity: layer.style?.opacity ?? 1 });
    const { geometry, trace } = layer;
    switch (geometry.type) {
      case 'Point': {
        const { x, y } = project(geometry.coordinates);
        group.append(element(owner, 'circle', {
          cx: x, cy: y, r: 7, fill: layer.style?.stroke ?? '#0f766e', stroke: 'white', 'stroke-width': 2,
        }));
        break;
      }
      case 'LineString':
        drawLine(group, trace?.coordinates ?? geometry.coordinates, layer.style);
        break;
      case 'MultiLineString':
        for (const coordinates of trace?.paths ?? geometry.coordinates) drawLine(group, coordinates, layer.style);
        break;
      case 'Polygon':
        group.append(element(owner, 'path', {
          d: geometry.coordinates.map(ring => `${path(ring)} Z`).join(' '),
          fill: layer.style?.fill ?? '#5eead4',
          'fill-opacity': layer.style?.fillOpacity ?? 0.26,
          'fill-rule': 'evenodd',
        }));
        drawLine(group, trace?.coordinates ?? geometry.coordinates[0], layer.style);
        break;
      case 'MultiPolygon':
        for (const [part, rings] of geometry.coordinates.entries()) {
          group.append(element(owner, 'path', { d: rings.map(ring => path(ring) + ' Z').join(' '),
            fill: layer.style?.fill ?? '#5eead4', 'fill-opacity': layer.style?.fillOpacity ?? 0.26, 'fill-rule': 'evenodd' }));
          drawLine(group, trace?.paths?.[part] ?? (trace ? [] : rings[0]), layer.style);
        }
        break;
    }
    content.append(group);
  }

  for (const annotation of state.annotations) {
    if (annotation.opacity === 0) continue;
    const { x, y } = project(annotation.anchor);
    const group = element(owner, 'g', {
      'data-annotation': annotation.id,
      opacity: annotation.opacity,
    });
    const [offsetX, offsetY] = annotation.leaderLine?.offset ?? [12, -12];
    if (annotation.leaderLine) {
      // Shared casing and ink fade with the dot and text as one annotation.
      for (const [stroke, width] of [['white', 6], ['#134e4a', 2]] as const) {
        group.append(element(owner, 'line', {
          x1: x, y1: y, x2: x + offsetX, y2: y + offsetY,
          stroke, 'stroke-width': width, 'stroke-linecap': 'round',
        }));
      }
    }
    group.append(element(owner, 'circle', {
      cx: x, cy: y, r: 5, fill: '#134e4a', stroke: 'white', 'stroke-width': 2,
    }));
    const text = element(owner, 'text', {
      x: x + offsetX,
      y: y + offsetY,
      'font-family': fontFamily,
      'font-size': annotation.fontSize ?? 30,
      fill: '#134e4a',
      stroke: 'white',
      'stroke-width': 4,
      'stroke-linejoin': 'round',
      'paint-order': 'stroke fill',
    });
    text.textContent = annotation.text;
    group.append(text);
    content.append(group);
  }

  drawStoryPanels(content, owner, state, fontFamily);
  svg.replaceChildren(content);
}
