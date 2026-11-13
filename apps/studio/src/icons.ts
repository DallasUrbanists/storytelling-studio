/** Inline system icons avoid network-loaded icon fonts in the local editor. */
const paths: Record<string, string> = {
  keyboard_arrow_down: 'M7 10l5 5 5-5z', arrow_drop_down: 'M7 10l5 5 5-5z',
  chevron_right: 'M9 6l6 6-6 6-1.4-1.4L12.2 12 7.6 7.4z', close: 'M6 6l12 12m0-12L6 18|stroke:currentColor;fill:none;stroke-width:2',
  cancel: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20M8 8l8 8m0-8-8 8|stroke:currentColor;fill:none;stroke-width:2',
  check: 'M4 12l5 5L20 6|stroke:currentColor;fill:none;stroke-width:2',
  error: 'M12 2L1 22h22L12 2m0 6v7m0 2v2|stroke:currentColor;fill:none;stroke-width:2',
  expand_more: 'M7 10l5 5 5-5z',
};
export const iconMapFn = (name: string) => paths[name] ? { icon: paths[name] } : undefined;
