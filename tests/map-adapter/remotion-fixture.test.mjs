import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { bundle } from '@remotion/bundler';
import { getCompositions, renderStill } from '@remotion/renderer';
import { openSandboxedBrowser } from '../../apps/renderer/src/sandboxed-browser.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(import.meta.url);

test('existing Remotion hosts render the synthetic prerequisite in both formats',
  { timeout: 180_000 }, async t => {
    assert.ok(process.env.GSTORY_CHROME, 'Set GSTORY_CHROME to an installed Chromium executable');
    const output = join(root, '.local', 'd1-09-prerequisite', randomUUID());
    const publicDir = join(output, 'public');
    await mkdir(join(publicDir, 'assets'), { recursive: true });
    await mkdir(join(output, 'tmp'), { recursive: true });
    const previousTemp = process.env.TEMP, previousTmp = process.env.TMP;
    process.env.TEMP = process.env.TMP = join(output, 'tmp');
    const receipt = { status: 'pending', frames: [] };
    let browser;
    t.after(async () => {
      try {
        await browser?.close({ silent: true });
      } finally {
        if (previousTemp === undefined) delete process.env.TEMP;
        else process.env.TEMP = previousTemp;
        if (previousTmp === undefined) delete process.env.TMP;
        else process.env.TMP = previousTmp;
        await writeFile(join(output, 'receipt.json'), JSON.stringify(receipt, null, 2));
      }
    });
    try {
      for (const name of ['bridge-style.json', 'Inter-Regular.woff2', 'OFL-Inter.txt']) {
        await copyFile(join(root, 'tests/fixtures/synthetic-story/assets', name), join(publicDir, 'assets', name));
      }
      await copyFile(require.resolve('maplibre-gl/dist/maplibre-gl-worker.mjs'),
        join(publicDir, 'maplibre-gl-worker.mjs'));
      const serveUrl = await bundle({
        entryPoint: join(root, 'apps/renderer/src/index.tsx'),
        outDir: join(output, 'bundle'), publicDir, rootDir: root,
        enableCaching: false, gitSource: null,
      });
      browser = await openSandboxedBrowser(process.env.GSTORY_CHROME);
      const options = { serveUrl, puppeteerInstance: browser,
        chromiumOptions: { gl: 'swangle' }, logLevel: 'error' };
      const compositions = await getCompositions(serveUrl, options);
      for (const [id, width, height] of [
        ['StoryPortrait', 1080, 1920], ['StoryLandscape', 1920, 1080],
      ]) {
        const composition = compositions.find(c => c.id === id);
        assert.ok(composition, `Missing ${id}`);
        const project = composition.defaultProps.project;
        assert.equal(project.scenes[0].outsideDimming.opacity, 0.45);
        assert.deepEqual(project.scenes[0].annotations.find(a => a.id === 'fictional-point-label')
          .leaderLine.offset, [100, -70]);
        const file = `${id}-149.png`;
        await renderStill({ ...options, composition, frame: 149,
          output: join(output, file), imageFormat: 'png' });
        const png = await readFile(join(output, file));
        assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
        assert.equal(png.readUInt32BE(16), width);
        assert.equal(png.readUInt32BE(20), height);
        receipt.frames.push({ id, frame: 149, file, width, height,
          sha256: createHash('sha256').update(png).digest('hex') });
      }
      receipt.status = 'passed';
    } catch (error) {
      receipt.status = 'failed';
      receipt.error = error.message;
      throw error;
    } finally {
      console.log(`Synthetic prerequisite host evidence: ${relative(root, output)}`);
    }
  });
