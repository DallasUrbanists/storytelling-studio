import type { FrameState } from '../../story-core/src/index.ts';

const colors: Record<string, string> = { 'through-lane': '#4b5963', 'center-turn-lane': '#81714a', 'bike-lane': '#267847', buffer: '#a5b2a1', sidewalk: '#d8cfbc', parking: '#6d7379', median: '#718961', other: '#6c7880' };
const names: Record<string, string> = { 'through-lane': 'Through', 'center-turn-lane': 'Turn', 'bike-lane': 'Bicycle', buffer: 'Buffer', sidewalk: 'Sidewalk', parking: 'Parking', median: 'Median', other: 'Other' };

/** Draw roadway, research, caption and credit surfaces identically in both hosts. */
export function drawStoryPanels(parent: DocumentFragment, owner: Document, state: FrameState, font: string): void {
  const node = (tag: string, attrs: Record<string, string | number>, text?: string) => {
    const element = owner.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, String(value));
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const label = (x: number, y: number, text: string, size = 32, fill = '#16262e') => node('text', { x, y, 'font-family': font, 'font-size': size, fill }, text);
  const { width, height } = state.viewport;
  const wrap = (text: string, max = Math.floor((width - 160) / 18)): string[] => {
    const lines: string[] = []; let line = '';
    for (const word of text.split(/\s+/)) {
      if (line.length + word.length + 1 > max) { lines.push(line); line = ''; }
      line += (line ? ' ' : '') + word;
    }
    if (line) lines.push(line); return lines;
  };
  const creditLines = state.credit ? wrap(state.credit) : [];
  const captionLines = state.caption ? wrap(state.caption, Math.floor((width - 160) / 22)) : [];
  const footerHeight = creditLines.length * 38 + captionLines.length * 50 + 55;
  if (state.roadway) {
    const road = state.roadway;
    const group = node('g', { 'data-roadway': road.title });
    group.append(node('rect', { x: 0, y: 0, width, height, fill: '#f4f7f6' }));
    group.append(label(64, 95, road.title, 56));
    group.append(label(64, 145, 'Top-down schematic · ' + (road.progress === 0 ? 'Existing' : road.progress === 1 ? 'Proposed' : 'Reallocating space'), 32));
    group.append(label(64, 191, road.qualifier, 30));
    const top = 280, available = height - top - Math.max(260, footerHeight + 40);
    const maxWidth = Math.max(...road.segments.map(segment => segment.envelope));
    const scale = (width - 200) / maxWidth;
    for (const gap of road.gaps) {
      const y = top + gap.startMeters / road.extent * available;
      group.append(label(80, y + 38, 'Unspecified segment', 30));
    }
    for (const segment of road.segments) {
      const y = top + segment.start / road.extent * available;
      const length = (segment.end - segment.start) / road.extent * available;
      const left = (width - segment.envelope * scale) / 2;
      group.append(label(64, y - 16, `${segment.name} · ${segment.start}–${segment.end} m · curb ${segment.curbWidth.toFixed(2)} m`, 30));
      for (const band of segment.bands) {
        const x = left + band.left * scale, bandWidth = band.width * scale, xEnd = left + band.leftEnd * scale, endWidth = band.widthEnd * scale;
        if (Math.max(bandWidth, endWidth) < 0.01) continue;
        for (const [kind, opacity] of [[band.from, band.oldOpacity], [band.to, band.newOpacity]] as const) {
          if (!kind || opacity <= 0) continue;
          group.append(node('polygon', { points: [[x,y],[x+bandWidth,y],[xEnd+endWidth,y+length],[xEnd,y+length]].map(p => p.join(',')).join(' '), fill: colors[kind], opacity }));
          group.append(node('line', { x1: x + 2, x2: xEnd + 2, y1: y, y2: y + length, stroke: '#fff', 'stroke-width': 3, 'stroke-dasharray': kind === 'through-lane' ? '22 16' : 'none', opacity }));
          if (bandWidth > 55 && length > 150) {
            const text = label(0, 0, names[kind], 30, kind === 'sidewalk' || kind === 'buffer' ? '#16262e' : '#ffffff');
            text.setAttribute('transform', `translate(${x + bandWidth / 2},${y + length / 2}) rotate(-90)`);
            text.setAttribute('text-anchor', 'middle'); text.setAttribute('opacity', String(opacity)); group.append(text);
          }
        }
        if (bandWidth > 60) {
          const widthLabel = label(x + bandWidth / 2, y + 38, (Math.abs(band.width - band.widthEnd) > .01 ? band.width.toFixed(1) + '–' + band.widthEnd.toFixed(1) : band.width.toFixed(1)), 30, '#fff');
          widthLabel.setAttribute('text-anchor', 'middle'); widthLabel.setAttribute('stroke', '#16262e'); widthLabel.setAttribute('stroke-width', '1'); widthLabel.setAttribute('paint-order', 'stroke fill');
          group.append(widthLabel);
        }
      }
      group.append(node('rect', { x: left, y, width: segment.envelope * scale, height: length, fill: 'none', stroke: '#16262e', 'stroke-width': 3 }));
    }
    parent.append(group);
  }
  if (state.researchCard) {
    const lines = wrap(state.researchCard.qualifier);
    const h = 190 + lines.length * 42;
    parent.append(node('rect', { x: 64, y: 95, width: width - 128, height: h, rx: 10, fill: '#fff', opacity: 0.97 }));
    parent.append(label(96, 158, state.researchCard.status === 'approved' ? 'Derived estimate · reviewed snapshot' : 'Unverified research', 30));
    parent.append(label(96, 235, state.researchCard.text, 54));
    lines.forEach((line, i) => parent.append(label(96, 292 + i * 42, line, 32)));
  }
  const h = footerHeight;
  if (captionLines.length || creditLines.length) {
    parent.append(node('rect', { x: 0, y: height - h, width, height: h, fill: '#ffffff', opacity: 0.97 }));
    let y = height - h + 52;
    for (const line of captionLines) { parent.append(label(64, y, line, 40)); y += 50; }
    for (const line of creditLines) { parent.append(label(64, y, line, 30)); y += 38; }
  }
}
