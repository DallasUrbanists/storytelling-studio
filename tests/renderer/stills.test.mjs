import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { getCompositions, renderStill } from '@remotion/renderer';
import { openSandboxedBrowser } from '../../apps/renderer/src/sandboxed-browser.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));

function insideWorktree(path) {
  const absolute = resolve(root, path);
  const child = relative(root, absolute);
  assert.ok(child && !child.startsWith('..') && !isAbsolute(child),
    'Use a bundle directory inside this worktree');
  return absolute;
}

test('Remotion renders independent first/middle/last frames and rejects a missing font',
  { timeout: 180_000 }, async t => {
    // D1-08 owns the bundle/export command. This check also accepts a prepared bundle.
    const bundle = insideWorktree(process.env.GSTORY_REMOTION_BUNDLE ?? '.local/renderer-bundle');
    await access(join(bundle, 'index.html')).catch(() => {
      assert.fail('Prepare the renderer bundle with matching Remotion 4.0.542 tooling; see apps/renderer/README.md');
    });
    assert.ok(process.env.GSTORY_CHROME, 'Set GSTORY_CHROME to an installed Chromium executable');

    const output = join(root, '.local', 'd1-07-stills', randomUUID());
    const temporary = join(output, 'tmp');
    await mkdir(temporary, { recursive: true });
    process.env.TEMP = temporary;
    process.env.TMP = temporary;
    const receipt = { status: 'pending', frames: [], missingFont: 'not run' };
    let browser;
    t.after(async () => {
      try {
        await browser?.close({ silent: true });
      } finally {
        await writeFile(join(output, 'receipt.json'), JSON.stringify(receipt, null, 2));
      }
    });
    try {
      browser = await openSandboxedBrowser(process.env.GSTORY_CHROME);
      const options = {
        serveUrl: bundle, puppeteerInstance: browser,
        chromiumOptions: { gl: 'swangle' }, logLevel: 'error',
      };
      const compositions = await getCompositions(bundle, options);
      assert.deepEqual(compositions.map(c => c.id).sort(), ['StoryLandscape', 'StoryPortrait']);
      for (const id of ['StoryPortrait', 'StoryLandscape']) {
        const composition = compositions.find(c => c.id === id);
        const [width, height] = id === 'StoryPortrait' ? [1080, 1920] : [1920, 1080];
        assert.equal(composition.width, width);
        assert.equal(composition.height, height);
        assert.equal(composition.fps, 30);
        assert.equal(composition.durationInFrames, 300);
        const hashes = new Set();
        // Each renderStill call creates an independent render page; start at the last frame.
        for (const frame of [299, 0, 149]) {
          const outputFile = join(output, `${id}-${frame}.png`);
          await renderStill({ ...options, composition, frame, output: outputFile, imageFormat: 'png' });
          const png = await readFile(outputFile);
          assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
          assert.equal(png.readUInt32BE(16), width);
          assert.equal(png.readUInt32BE(20), height);
          const sha256 = createHash('sha256').update(png).digest('hex');
          hashes.add(sha256);
          receipt.frames.push({ id, frame, width, height, file: relative(output, outputFile), sha256 });
        }
        assert.equal(hashes.size, 3, `${id} must not render identical blank frames`);
        const outputFile = join(output, `${id}-missing-font.png`);
        const inputProps = {
          ...composition.defaultProps,
          resources: {
            ...composition.defaultProps.resources,
            font: { id: 'fixture-font', url: `${composition.defaultProps.resources.font.url}.missing` },
          },
        };
        await assert.rejects(renderStill({
          ...options, composition: { ...composition, props: inputProps }, inputProps,
          frame: 149, output: outputFile, imageFormat: 'png',
        }), /Frame 149 .*Resource "fixture-font"/s);
        await assert.rejects(access(outputFile), { code: 'ENOENT' });
      }
      receipt.missingFont = 'passed in both compositions';
      receipt.status = 'passed';
    } catch (error) {
      receipt.status = 'failed';
      receipt.error = error.message;
      throw error;
    } finally {
      console.log(`D1-07 still evidence: ${relative(root, output)}`);
    }
  });
