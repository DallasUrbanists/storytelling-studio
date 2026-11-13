import { openSandboxedBrowser } from '../../apps/renderer/src/sandboxed-browser.ts';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { arch, platform, release } from 'node:os';
import { isAbsolute, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import {
  compareEdges, comparePixels, decodePng, encodePng, orderedFrames, sha256, shuffledFrames,
  stateHash, tolerances, verifyCompletion, verifyContent,
} from './compare.mjs';
import { capture, faultCases, inspectContent, openHost, previewServer, verifyFault } from './browser.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(import.meta.url);
const help = `Usage: npm run test:render-contract
Runs the complete Gate B check in both full-size formats, including two fresh
host sessions, ordered boundary frames, 299,0,149,1,299 seeks, exact repeat RGBA,
cross-host image/edge comparisons, required-resource failures, and the D1-08
two-video full decode. Set GSTORY_CHROME to an installed absolute Chromium path.
Evidence is retained under .local/render-contract/RUN_ID/ and out/verification/.
Use npm run test:render-contract:unit for comparator and pinned CDP checks only.
The unit command does not establish Gate B or release editor work.`;

async function sourceManifest() {
  const files = ['package.json', 'package-lock.json'];
  const visit = async directory => {
    for (const entry of (await readdir(join(root, directory), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      if (['node_modules','dist','.quasar'].includes(entry.name)) continue;
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) await visit(path);
      else if (/\.(?:mjs|js|ts|tsx|vue|css|json|woff2|txt|html)$/.test(path)) files.push(path);
    }
  };
  for (const directory of ['apps/studio', 'apps/renderer', 'packages', 'tests/render-contract', 'tests/fixtures/synthetic-story']) await visit(directory);
  return Promise.all(files.sort().map(async path => ({ path, sha256: sha256(await readFile(join(root, path))) })));
}

async function run() {
  const runId = `D1-09-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}`;
  const output = join(root, '.local/render-contract', runId);
  await mkdir(join(output, 'tmp'), { recursive: true });
  await mkdir(join(output, 'frames'));
  const previous = { TEMP: process.env.TEMP, TMP: process.env.TMP, TMPDIR: process.env.TMPDIR };
  process.env.TEMP = process.env.TMP = process.env.TMPDIR = join(output, 'tmp');
  const receipt = {
    issue: 'D1-09', runId, status: 'running', gateB: 'not run', stage: 'source-inputs',
    startedAt: new Date().toISOString(), rendererMode: 'shared MapLibre/SVG; swangle; pixel ratio 1; concurrency 1',
    tolerances, variants: ['portrait', 'landscape'], formatsCompleted: 0,
    orderedFrames, shuffledFrames, freshSessionsPerHostAndFormat: 2,
    parity: 'not run', readiness: 'not run', videoGate: 'not run',
    frames: [], comparisons: [], faults: [], runtime: [],
    environment: { node: process.version, platform: platform(), arch: arch(), osRelease: release() },
    limitations: [
      'Synthetic inline-GeoJSON resource profile only; tile/sprite/glyph/media capture is unsupported.',
      'Unsupported tiled styles must fail preflight; this is not a production missing-tile readiness proof.',
      'No static-map fallback attempted; no geographically registered static fixture is supplied.',
      'Authored-edge distance uses a symmetric Euclidean one-pixel neighbourhood on isolated SVG raster edges.',
      'Human visual/playback review and coordinator acceptance are separate from these automated checks.',
    ],
  };
  const save = async () => {
    await writeFile(join(output, 'receipt.json.tmp'), `${JSON.stringify(receipt, null, 2)}\n`);
    await rename(join(output, 'receipt.json.tmp'), join(output, 'receipt.json'));
  };
  console.log(`Gate B evidence: ${relative(root, output)}`);
  let browser, vue, server, failure;
  const cleanup = async () => {
    const results = await Promise.allSettled([
      browser?.close({ silent: true }), vue?.close(), server?.closeServer(true),
    ]);
    browser = vue = server = undefined;
    const rejected = results.find(result => result.status === 'rejected');
    if (rejected) throw rejected.reason;
  };
  await save();
  try {
    receipt.source = await sourceManifest();
    receipt.sourceManifestSha256 = sha256(JSON.stringify(receipt.source));
    const fixture = join(root, 'tests/fixtures/synthetic-story');
    const bytes = await readFile(join(fixture, 'project.json'));
    const { parseProject } = await import('../../packages/project-schema/src/index.ts');
    const { evaluateFrame } = await import('../../packages/story-core/src/index.ts');
    const project = parseProject(JSON.parse(bytes));
    assert.equal(project.fps, 30);
    assert.equal(project.scenes.reduce((sum, scene) => sum + scene.durationFrames, 0), 300);
    receipt.project = { id: project.id, revision: `sha256:${sha256(bytes)}`, sha256: sha256(bytes),
      schemaVersion: project.schemaVersion, coreVersion: require('../../packages/story-core/package.json').version };
    await writeFile(join(output, 'project.json'), bytes);
    receipt.assets = [];
    for (const asset of project.assets) {
      assert.ok(asset.path && !isAbsolute(asset.path) && !asset.path.split(/[\\/]/).includes('..'), 'Invalid fixture asset path');
      assert.equal(sha256(await readFile(join(fixture, asset.path))), asset.sha256, `Resource bytes changed: ${asset.id}`);
      receipt.assets.push({ id: asset.id, path: asset.path, sha256: asset.sha256 });
    }
    receipt.assetManifestSha256 = sha256(JSON.stringify(receipt.assets));
    receipt.stage = 'pinned-tooling';
    receipt.versions = {};
    for (const name of ['@remotion/bundler', '@remotion/renderer', 'remotion', 'maplibre-gl', 'vue', 'quasar', 'vite']) {
      const version = require(`${name}/package.json`).version;
      receipt.versions[name] = version;
      if (name.includes('remotion')) assert.equal(version, '4.0.542');
    }
    assert.ok(process.env.GSTORY_CHROME && isAbsolute(process.env.GSTORY_CHROME),
      'Set GSTORY_CHROME to the absolute installed Chromium path');
    receipt.browserSha256 = sha256(await readFile(process.env.GSTORY_CHROME));
    const [{ bundle }, renderer] = await Promise.all([import('@remotion/bundler'), import('@remotion/renderer')]);
    const publicDir = join(output, 'public');
    await mkdir(join(publicDir, 'assets'), { recursive: true });
    for (const file of ['bridge-style.json', 'Inter-Regular.woff2', 'OFL-Inter.txt']) {
      await copyFile(join(fixture, 'assets', file), join(publicDir, 'assets', file));
    }
    const worker = require.resolve('maplibre-gl/dist/maplibre-gl-worker.mjs');
    receipt.workerSha256 = sha256(await readFile(worker));
    await copyFile(worker, join(publicDir, 'maplibre-gl-worker.mjs'));
    receipt.stage = 'bundle'; await save();
    const serveUrl = await bundle({ entryPoint: join(root, 'apps/renderer/src/index.tsx'),
      outDir: join(output, 'bundle'), publicDir, rootDir: root, enableCaching: false, gitSource: null });
    receipt.stage = 'host-setup'; await save();
    vue = await previewServer(join(output, 'vite-cache'));
    browser = await openSandboxedBrowser(process.env.GSTORY_CHROME);
    // Keep one actual render page alive throughout each seek sequence. Use the
    // pinned renderer's own setup and seek APIs rather than mocking React time.
    server = await renderer.RenderInternals.prepareServer({ webpackConfigOrServeUrl: serveUrl,
      port: null, remotionRoot: root, offthreadVideoThreads: 1, logLevel: 'error', indent: false,
      offthreadVideoCacheSizeInBytes: null, binariesDirectory: null, forceIPv4: true, sampleRate: 48000 });
    const compositions = await renderer.getCompositions(server.serveUrl, { puppeteerInstance: browser,
      inputProps: { project }, chromiumOptions: { gl: 'swangle' }, logLevel: 'error' });
    const baselines = new Map();
    const readImage = async file => decodePng(await readFile(join(output, file)));
    for (const variant of receipt.variants) {
      const composition = compositions.find(c => c.id === (variant === 'portrait' ? 'StoryPortrait' : 'StoryLandscape'));
      assert.ok(composition, `Missing ${variant} composition`);
      assert.deepEqual(composition.props.project, project);
      const { width, height } = project.outputVariants[variant];
      assert.deepEqual([composition.width, composition.height, composition.fps, composition.durationInFrames], [width, height, 30, 300]);
      const options = { browser, variant, project, vueUrl: new URL('/__parity', vue.resolvedUrls.local[0]).href,
        remotionServer: server, composition };
      for (let run = 0; run < 2; run++) {
        for (const host of ['vue', 'remotion']) {
          receipt.stage = 'parity'; receipt.current = { variant, run, host }; await save();
          const session = await openHost({ ...options, host });
          try {
            for (const [index, frame] of [...orderedFrames, ...shuffledFrames].entries()) {
              receipt.current = { variant, run, host, frame, index };
              const start = Date.now(), diagnostic = await session.seek(frame);
              const state = evaluateFrame(project, variant, frame);
              receipt.current = { ...receipt.current, diagnostic, expectedStateHash: stateHash(state) };
              await save();
              assert.equal(diagnostic.readiness ?? diagnostic.status, 'ready');
              assert.equal(diagnostic.stateHash, stateHash(state), 'Host canonical state hash diverged');
              if (host === 'remotion') assert.equal(diagnostic.renderReady, true);
              const content = await inspectContent(session.page);
              assert.equal(content.environment.pixelRatio, 1);
              if (index === 0) receipt.runtime.push({ variant, run, host, ...content.environment });
              const prefix = `frames/${variant}-${host}-${run}-${index}-${frame}`;
              const png = await capture(session.page, width, height);
              const overlay = await capture(session.page, width, height, true);
              await writeFile(join(output, `${prefix}.png`), png);
              await writeFile(join(output, `${prefix}-overlay.png`), overlay);
              const image = decodePng(png), overlayImage = decodePng(overlay);
              assert.deepEqual([image.width, image.height], [width, height]);
              const item = { variant, run, host, frame, index, file: `${prefix}.png`, overlay: `${prefix}-overlay.png`,
                pngSha256: sha256(png), rgbaSha256: sha256(image.rgba), overlayRgbaSha256: sha256(overlayImage.rgba),
                stateHash: diagnostic.stateHash, expectedStateHash: stateHash(state), diagnostic,
                elapsedMilliseconds: Date.now() - start, content };
              receipt.frames.push(item);
              await save();
              verifyContent(content, state);
              const key = `${variant}-${host}-${frame}`, baseline = baselines.get(key);
              if (baseline) {
                assert.equal(item.stateHash, baseline.stateHash);
                assert.ok(image.rgba.equals((await readImage(baseline.file)).rgba), 'Repeat decoded RGBA differs');
                assert.ok(overlayImage.rgba.equals((await readImage(baseline.overlay)).rgba), 'Repeat overlay pixels differ');
                receipt.comparisons.push({ kind: 'exact-repeat', baseline: baseline.file, current: item.file, passed: true });
              } else baselines.set(key, item);
              if (host === 'remotion') {
                const preview = baselines.get(`${variant}-vue-${frame}`);
                assert.equal(item.stateHash, preview.stateHash);
                const structureMatches = content.svg === preview.content.svg;
                const textBoundsMatch = isDeepStrictEqual(content.annotations, preview.content.annotations);
                const { diff, ...pixels } = comparePixels(await readImage(preview.file), image);
                const edges = compareEdges(await readImage(preview.overlay), overlayImage);
                const diffFile = `${prefix}-diff.png`;
                await writeFile(join(output, diffFile), encodePng(diff));
                receipt.comparisons.push({ kind: 'cross-host', preview: preview.file, rendered: item.file,
                  diffFile, pixels, edges, structureMatches, textBoundsMatch,
                  passed: pixels.passed && edges.passed && structureMatches && textBoundsMatch });
                // Persist a failing diff before throwing.
                await save();
                assert.ok(structureMatches, 'Authored shape/text/anchor structure differs');
                assert.ok(textBoundsMatch, 'Text bounds differ');
                assert.ok(pixels.passed, `Cross-host pixel tolerance failed: ${JSON.stringify(pixels)}`);
                assert.ok(edges.passed, `Authored edge displacement exceeds 1 pixel: ${JSON.stringify(edges)}`);
              }
              await save();
            }
            for (const asset of receipt.assets.filter(a => ['fixture-font', 'fixture-style'].includes(a.id))) {
              assert.ok(session.network.resources.some(r => r.id === asset.id && r.status === 200 && r.sha256 === asset.sha256),
                `Host did not load pinned bytes for ${asset.id}`);
            }
          } finally { await session.close(); }
        }
      }
      for (const host of ['vue', 'remotion']) for (const fault of faultCases) {
        receipt.stage = 'readiness-failure'; receipt.current = { variant, host, fault: fault.name }; await save();
        const session = await openHost({ ...options, host, fault });
        try {
          const diagnostic = await verifyFault(session, host, fault);
          receipt.faults.push({ variant, host, fault: fault.name, passed: true, diagnostic });
          await save();
        } finally { await session.close(); }
      }
      receipt.formatsCompleted++; await save();
    }
    receipt.parity = receipt.readiness = 'passed';
    await cleanup();
    receipt.stage = 'full-video-and-decode'; await save();
    const verification = join(root, 'out/verification');
    await mkdir(verification, { recursive: true });
    const before = new Set(await readdir(verification));
    const { runFixture } = await import('../../apps/renderer/src/render-job.ts');
    await runFixture(root, []);
    const created = (await readdir(verification)).filter(name => !before.has(name));
    assert.equal(created.length, 1, 'Expected one isolated D1-08 run');
    const videoDirectory = join(verification, created[0]);
    const videoReceipt = JSON.parse(await readFile(join(videoDirectory, 'receipt.json'), 'utf8'));
    receipt.videoReceipt = relative(root, join(videoDirectory, 'receipt.json')).replaceAll('\\', '/');
    assert.equal(videoReceipt.status, 'passed'); assert.equal(videoReceipt.videoGate, 'passed');
    assert.equal(videoReceipt.project.revision, receipt.project.revision);
    assert.equal(videoReceipt.outputs.length, 2);
    assert.deepEqual(videoReceipt.outputs.map(item => item.variant).sort(), ['landscape', 'portrait']);
    for (const item of videoReceipt.outputs) {
      assert.equal(item.decodedFrames, 300);
      assert.equal(sha256(await readFile(join(videoDirectory, item.file))), item.sha256);
    }
    receipt.videoGate = 'passed';
    assert.deepEqual(await sourceManifest(), receipt.source, 'Inputs changed during Gate B');
    verifyCompletion(receipt);
    receipt.gateB = receipt.status = 'passed'; receipt.stage = 'complete';
  } catch (error) {
    failure = error;
    receipt.status = 'failed'; receipt.gateB = 'not passed';
    receipt.error = { name: error.name, message: error.message, code: error.code ?? null, stack: error.stack };
  } finally {
    try { await cleanup(); } catch (error) {
      failure ??= error; receipt.status = 'failed'; receipt.gateB = 'not passed'; receipt.cleanupError = String(error);
    }
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    receipt.finishedAt = new Date().toISOString();
    receipt.elapsedMilliseconds = Date.parse(receipt.finishedAt) - Date.parse(receipt.startedAt);
    await save();
  }
  if (failure) throw failure;
}

const args = process.argv.slice(2);
if (args.length === 1 && ['--help', '-h'].includes(args[0])) console.log(help);
else if (args.length) { console.error('Unsupported arguments; use --help'); process.exitCode = 1; }
else await run().catch(error => { console.error(error.message); process.exitCode = 1; });

