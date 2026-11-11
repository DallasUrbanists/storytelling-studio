import { readdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
async function markdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && !['node_modules', '.git', '.local', '.worktrees'].includes(entry.name)) files.push(...await markdownFiles(path.join(directory, entry.name)));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(path.join(directory, entry.name));
  }
  return files;
}
function withoutFences(text) {
  return text.replace(/^ {0,3}(`{3,}|~{3,})[^\n]*\r?\n[\s\S]*?^ {0,3}\1[ \t]*$/gm, '');
}
function withoutInlineCode(text) {
  return text.replace(/(?<!`)(`+)(?!`)[\s\S]*?(?<!`)\1(?!`)/g, 'code');
}
function readDestination(text, offset) {
  const whitespace = text.slice(offset).match(/^[ \t]*(?:\r?\n[ \t]*)?/);
  offset += whitespace[0].length;
  if (text[offset] === '<') {
    const end = text.indexOf('>', offset + 1);
    return end !== -1 && !text.slice(offset, end).includes('\n') ? text.slice(offset + 1, end) : null;
  }
  const start = offset;
  let depth = 0;
  while (offset < text.length) {
    const char = text[offset];
    if (char === '\\' && offset + 1 < text.length) { offset += 2; continue; }
    if (/\s/.test(char)) break;
    if (char === '(') depth++;
    if (char === ')') { if (!depth) break; depth--; }
    offset++;
  }
  return offset > start && depth === 0 ? text.slice(start, offset) : null;
}
function headings(text) {
  const counts = new Map();
  const result = new Set();
  for (const match of withoutFences(text).matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
    const slug = match[1].toLowerCase().replace(/<[^>]*>/g, '').replace(/[^\p{L}\p{N}_\- ]/gu, '').replace(/ /g, '-');
    const count = counts.get(slug) || 0;
    counts.set(slug, count + 1);
    result.add(count ? `${slug}-${count}` : slug);
  }
  return result;
}
const files = await markdownFiles(root);
for (const file of files) {
  const text = await readFile(file, 'utf8');
  const prose = withoutInlineCode(withoutFences(text));
  const targets = [];
  for (const match of prose.matchAll(/\[[^\][]+\]\(/g)) {
    const target = readDestination(prose, match.index + match[0].length);
    if (target) targets.push(target);
  }
  const definitions = new Set();
  for (const match of prose.matchAll(/^ {0,3}\[([^\][]+)\]:/gm)) {
    definitions.add(match[1].trim().replace(/\s+/g, ' ').toLowerCase());
    const target = readDestination(prose, match.index + match[0].length);
    if (target) targets.push(target);
  }
  for (const match of prose.matchAll(/\[([^\][]+)\]\[([^\][]*)\]/g)) {
    const label = (match[2] || match[1]).trim().replace(/\s+/g, ' ').toLowerCase();
    if (!definitions.has(label)) errors.push(`${path.relative(root, file)}: undefined reference ${label}`);
  }
  for (const rawTarget of targets) {
    const target = rawTarget.replace(/^<|>$/g, '').replace(/\\([()\\])/g, '$1');
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(target)) continue;
    const [name, fragment] = target.split('#');
    const destination = path.resolve(path.dirname(file), decodeURIComponent(name || path.basename(file)));
    try {
      await access(destination);
      if (fragment && destination.endsWith('.md') && !headings(await readFile(destination, 'utf8')).has(decodeURIComponent(fragment))) throw new Error('missing heading');
    } catch { errors.push(`${path.relative(root, file)}: ${target}`); }
  }
}
const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const guide = await readFile(path.join(root, 'docs/contributor-guides/development.md'), 'utf8');
for (const match of guide.matchAll(/npm run ([a-z][a-z0-9:-]*)/g)) {
  if (!Object.hasOwn(manifest.scripts || {}, match[1])) errors.push(`development.md: missing script ${match[1]}`);
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Checked local links in ${files.length} Markdown files.`);
