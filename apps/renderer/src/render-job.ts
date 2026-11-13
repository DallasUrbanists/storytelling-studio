import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { copyFile, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { arch, platform, release } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { promisify } from 'node:util';
import { parseProject } from '@gstory/project-schema';
import { evaluateFrame } from '@gstory/story-core';
import { hashFrameState } from './diagnostics.ts';

const execute = promisify(execFile);
const require = createRequire(import.meta.url);
const version = '4.0.542';
const representativeFrames = [0, 1, 149, 150, 299];
type Variant = 'portrait' | 'landscape';
type Options = { variants: Variant[]; frames: number[] | null };
type Evidence = Record<string, unknown>;

/** Reject ambiguous arguments before loading browser or media tooling. */
export function parseArguments(args: string[]): Options {
  let format: Variant | undefined;
  let frames: number[] | null = null;
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (flag === '--format' && format === undefined
        && (value === 'portrait' || value === 'landscape')) {
      format = value;
    } else if (flag === '--frames' && frames === null
        && typeof value === 'string' && /^(0|[1-9]\d*)(,(0|[1-9]\d*))*$/.test(value)) {
      frames = value.split(',').map(Number);
      assert.ok(frames.every(frame => Number.isSafeInteger(frame) && frame < 300),
        '--frames requires integer frame numbers from 0 through 299');
    } else {
      throw new Error(`Invalid or repeated argument ${flag}; use --help`);
    }
  }
  return { variants: format ? [format] : ['portrait', 'landscape'], frames };
}

function sha256(bytes: string | Uint8Array) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function packageInfo(name: string): Promise<{ version: string }> {
  return JSON.parse(await readFile(require.resolve(`${name}/package.json`), 'utf8'));
}

/** Resolve only the installed, pinned compositor; never download or use PATH binaries. */
async function mediaTools() {
  assert.equal(platform(), 'win32', 'This initial fixture verifier requires the approved Windows compositor');
  assert.equal(arch(), 'x64', 'This initial fixture verifier requires Windows x64');
  const name = '@remotion/compositor-win32-x64-msvc';
  assert.equal((await packageInfo(name)).version, version, 'Compositor version mismatch');
  const directory = dirname(require.resolve(`${name}/package.json`));
  return { ffmpeg: join(directory, 'ffmpeg.exe'), ffprobe: join(directory, 'ffprobe.exe') };
}

/** Check probed stream metadata and the independently decoded frame count. */
export function verifyMedia(probe: {
  streams: Array<{
    codec_type: string; codec_name: string; pix_fmt: string; width: number; height: number;
    avg_frame_rate: string; r_frame_rate: string; nb_read_frames: string; duration: string;
  }>;
}, width: number, height: number, decodedFrames: number) {
  const videos = probe.streams.filter(stream => stream.codec_type === 'video');
  assert.equal(videos.length, 1, 'Expected one video stream');
  const stream = videos[0];
  assert.equal(stream.codec_name, 'h264');
  assert.equal(stream.pix_fmt, 'yuv420p');
  assert.equal(stream.width, width);
  assert.equal(stream.height, height);
  for (const rate of [stream.avg_frame_rate, stream.r_frame_rate]) {
    const [numerator, denominator] = rate.split('/').map(Number);
    assert.ok(denominator > 0 && numerator / denominator === 30, `Unexpected frame rate ${rate}`);
  }
  assert.equal(Number(stream.nb_read_frames), 300, 'FFprobe must read all 300 frames');
  assert.equal(Number(stream.duration), 10, 'Video must last ten seconds');
  assert.equal(decodedFrames, 300, 'FFmpeg must independently decode all 300 frames');
  return stream;
}

/** Render only the synthetic bridge fixture, retaining failure evidence before returning. */
export async function runFixture(root: string, args: string[]) {
  const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}`;
  const output = join(root, 'out', 'verification', runId);
  const partial = join(output, 'partial');
  const temporary = join(output, 'tmp');
  await mkdir(output, { recursive: true });
  console.log(`D1-08 run: out/verification/${runId}/`);
  const started = Date.now();
  const receipt: Evidence = {
    issue: 'D1-08', runId, status: 'running', videoGate: 'not run', arguments: args,
    startedAt: new Date().toISOString(), outputs: [], frames: [],
    missingResources: [], playbackReview: 'not performed; requires human review',
    environment: {
      node: process.version, npm: process.env.npm_config_user_agent?.match(/npm\/(\S+)/)?.[1] ?? null,
      platform: platform(), arch: arch(), osRelease: release(),
    },
  };
  const save = async () => {
    await writeFile(join(output, 'receipt.json.tmp'), `${JSON.stringify(receipt, null, 2)}\n`);
    await rename(join(output, 'receipt.json.tmp'), join(output, 'receipt.json'));
  };
  await save();
  const oldTemp = process.env.TEMP;
  const oldTmp = process.env.TMP;
  let browser: Awaited<ReturnType<typeof import('@remotion/renderer')['openBrowser']>> | undefined;
  let failure: unknown;
  try {
    receipt.stage = 'arguments';
    const options = parseArguments(args);
    receipt.mode = options.frames ? 'diagnostic-png' : 'full-video';
    receipt.variants = options.variants;
    receipt.requestedFrames = options.frames ?? { start: 0, endInclusive: 299 };
    await Promise.all(['frames', 'videos', 'partial', 'tmp'].map(
      directory => mkdir(join(output, directory), { recursive: true })));
    process.env.TEMP = temporary;
    process.env.TMP = temporary;

    receipt.stage = 'source-revision';
    const source = await execute('git', ['rev-parse', 'HEAD'], { cwd: root });
    const diff = await execute('git', ['diff', '--no-ext-diff', '--no-textconv', '--binary', 'HEAD'],
      { cwd: root, maxBuffer: 16 * 1024 * 1024 });
    // Source hashes include new implementation files, which git diff omits until staged.
    const sourceFiles = [
      'scripts/render-fixture.mjs', 'apps/renderer/src/render-job.ts', 'package.json',
      'package-lock.json', 'apps/renderer/src/index.tsx', 'apps/renderer/src/StoryComposition.tsx',
      'apps/renderer/src/MapFrameHost.tsx',
    ];
    receipt.source = {
      commit: source.stdout.trim(), diffSha256: sha256(diff.stdout),
      files: await Promise.all(sourceFiles.map(async file => ({
        file, sha256: sha256(await readFile(join(root, file))),
      }))),
    };
    receipt.stage = 'fixture-assets';
    const fixtureRoot = join(root, 'tests', 'fixtures', 'synthetic-story');
    const projectBytes = await readFile(join(fixtureRoot, 'project.json'));
    const project = parseProject(JSON.parse(projectBytes.toString('utf8')));
    const projectHash = sha256(projectBytes);
    assert.equal(project.fps, 30);
    assert.equal(project.scenes.reduce((sum, scene) => sum + scene.durationFrames, 0), 300);
    receipt.project = {
      id: project.id, revision: `sha256:${projectHash}`, sha256: projectHash,
      schemaVersion: project.schemaVersion,
      coreVersion: JSON.parse(await readFile(join(root, 'packages/story-core/package.json'), 'utf8')).version,
    };
    const assets = [];
    for (const asset of project.assets) {
      const file = resolve(fixtureRoot, asset.path);
      const child = relative(fixtureRoot, file);
      assert.ok(child && !child.startsWith('..') && !isAbsolute(child), 'Asset escapes fixture');
      const bytes = await readFile(file).catch(error => {
        (receipt.missingResources as unknown[]).push({ id: asset.id, path: asset.path });
        throw error;
      });
      assert.equal(sha256(bytes), asset.sha256, `Asset hash mismatch: ${asset.id}`);
      assets.push({ id: asset.id, path: asset.path, sha256: asset.sha256, bytes: bytes.length });
    }
    receipt.assets = assets;
    receipt.assetManifestSha256 = sha256(JSON.stringify(assets));
    receipt.credits = 'Synthetic author drawing; Inter font license retained with fixture';
    receipt.rendererMode = 'MapLibre shared adapter; swangle; concurrency 1';
    // PNG capture and explicit BT.709 conversion avoid full-range JPEG output.
    const encoding = {
      codec: 'h264' as const, pixelFormat: 'yuv420p' as const,
      colorSpace: 'bt709' as const, imageFormat: 'png' as const,
      disableSharedMemoryCapture: true, concurrency: 1,
    };
    receipt.encoding = encoding;
    receipt.stage = 'tooling';
    const versions: Record<string, string> = {};
    for (const name of ['@remotion/bundler', '@remotion/renderer', 'remotion', 'maplibre-gl']) {
      versions[name] = (await packageInfo(name)).version;
      if (name !== 'maplibre-gl') assert.equal(versions[name], version, `${name} version mismatch`);
    }
    receipt.versions = versions;
    const tools = await mediaTools();
    receipt.mediaTools = {};
    for (const [name, file] of Object.entries(tools)) {
      const result = await execute(file, ['-version']);
      (receipt.mediaTools as Evidence)[name] = {
        version: result.stdout.split(/\r?\n/)[0], sha256: sha256(await readFile(file)),
      };
    }
    const browserPath = process.env.GSTORY_CHROME;
    assert.ok(browserPath && isAbsolute(browserPath), 'Set GSTORY_CHROME to an absolute installed Chromium path');
    assert.ok((await stat(browserPath)).isFile(), 'GSTORY_CHROME must identify a file');
    const { bundle } = await import('@remotion/bundler');
    const { getCompositions, openBrowser, renderMedia, renderStill } = await import('@remotion/renderer');
    const publicDir = join(output, 'public');
    await mkdir(join(publicDir, 'assets'), { recursive: true });
    for (const name of ['bridge-style.json', 'Inter-Regular.woff2', 'OFL-Inter.txt']) {
      await copyFile(join(fixtureRoot, 'assets', name), join(publicDir, 'assets', name));
    }
    const worker = require.resolve('maplibre-gl/dist/maplibre-gl-worker.mjs');
    await copyFile(worker, join(publicDir, 'maplibre-gl-worker.mjs'));
    receipt.workerSha256 = sha256(await readFile(worker));
    receipt.stage = 'bundle';
    const serveUrl = await bundle({
      entryPoint: join(root, 'apps', 'renderer', 'src', 'index.tsx'),
      outDir: join(output, 'bundle'), publicDir, rootDir: root,
      enableCaching: false, gitSource: null,
    });
    receipt.stage = 'browser';
    browser = await openBrowser('chrome', {
      browserExecutable: browserPath, chromiumOptions: { gl: 'swangle' }, logLevel: 'error',
    });
    const informationPage = await browser.newPage({
      context: () => null, logLevel: 'error', indent: false, pageIndex: 0,
      onBrowserLog: null, onLog: () => undefined,
    });
    try {
      receipt.browser = {
        userAgent: await informationPage.evaluate(() => navigator.userAgent),
        sha256: sha256(await readFile(browserPath)),
      };
    } finally {
      await informationPage.close();
    }
    const renderOptions = {
      serveUrl, puppeteerInstance: browser, browserExecutable: browserPath,
      chromiumOptions: { gl: 'swangle' as const }, logLevel: 'error' as const,
      timeoutInMilliseconds: 70_000, inputProps: { project },
    };
    const compositions = await getCompositions(serveUrl, renderOptions);
    for (const variant of options.variants) {
      const id = variant === 'portrait' ? 'StoryPortrait' : 'StoryLandscape';
      const composition = compositions.find(composition => composition.id === id);
      assert.ok(composition, `Missing composition ${id}`);
      const { width, height } = project.outputVariants[variant];
      assert.equal(composition.width, width);
      assert.equal(composition.height, height);
      assert.equal(composition.fps, 30);
      assert.equal(composition.durationInFrames, 300);
      const frames = options.frames ?? representativeFrames;
      for (const [index, frame] of frames.entries()) {
        receipt.stage = 'diagnostic-frame';
        receipt.currentRequest = { variant, frame };
        const name = `${variant}-${index}-${frame}.png`;
        const pending = join(partial, name);
        await renderStill({ ...renderOptions, composition, frame, output: pending, imageFormat: 'png' });
        const png = await readFile(pending);
        assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
        assert.equal(png.readUInt32BE(16), width);
        assert.equal(png.readUInt32BE(20), height);
        await rename(pending, join(output, 'frames', name));
        (receipt.frames as unknown[]).push({
          variant, frame, width, height, file: `frames/${name}`, sha256: sha256(png),
          stateHash: await hashFrameState(evaluateFrame(project, variant, frame)),
        });
        await save();
      }
      if (options.frames) continue;
      const pending = join(partial, `${variant}.mp4`);
      receipt.stage = 'video-render';
      receipt.currentRequest = { variant, start: 0, endInclusive: 299 };
      await renderMedia({
        ...renderOptions, composition, outputLocation: pending,
        ...encoding,
      });
      receipt.stage = 'media-probe';
      const probe = await execute(tools.ffprobe,
        ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', pending]);
      receipt.stage = 'full-decode';
      const decoded = await execute(tools.ffmpeg, [
        '-v', 'error', '-xerror', '-i', pending, '-map', '0:v:0', '-an',
        '-fps_mode', 'passthrough', '-c:v', 'rawvideo', '-f', 'null', '-',
        '-progress', 'pipe:1', '-nostats',
      ]);
      assert.equal(decoded.stderr.trim(), '', 'FFmpeg reported a decode error');
      const counts = [...decoded.stdout.matchAll(/^frame=(\d+)\s*$/gm)];
      assert.ok(counts.length, 'FFmpeg did not report decoded frame progress');
      const count = Number(counts.at(-1)![1]);
      const metadata = verifyMedia(JSON.parse(probe.stdout), width, height, count);
      const decodedSamples = [];
      for (const frame of representativeFrames) {
        receipt.stage = 'representative-decode';
        receipt.currentRequest = { variant, frame };
        const sample = await execute(tools.ffmpeg, [
          '-v', 'error', '-xerror', '-i', pending, '-vf', `trim=start_frame=${frame}:end_frame=${frame + 1}`,
          '-frames:v', '1', '-fps_mode', 'passthrough', '-pix_fmt', 'rgba',
          '-c:v', 'png', '-f', 'image2pipe', 'pipe:1',
        ], { encoding: 'buffer', maxBuffer: width * height * 4 + 1024 * 1024 });
        assert.equal(sample.stdout.subarray(0, 8).toString('hex'), '89504e470d0a1a0a',
          'Missing decoded representative PNG');
        assert.equal(sample.stdout.readUInt32BE(16), width);
        assert.equal(sample.stdout.readUInt32BE(20), height);
        assert.equal(sample.stderr.length, 0, 'FFmpeg reported a representative-frame decode error');
        const file = `decoded-${variant}-${frame}.png`;
        await writeFile(join(output, 'frames', file), sample.stdout);
        decodedSamples.push({ frame, pngSha256: sha256(sample.stdout), bytes: sample.stdout.length,
          file: `frames/${file}` });
      }
      assert.ok(new Set(decodedSamples.map(sample => sample.pngSha256)).size > 1,
        'Decoded representative frames must not all be identical');
      const bytes = await readFile(pending);
      await rename(pending, join(output, 'videos', `${variant}.mp4`));
      (receipt.outputs as unknown[]).push({
        variant, status: 'verified', file: `videos/${variant}.mp4`, sha256: sha256(bytes),
        bytes: bytes.length, metadata, decodedFrames: count, decodedSamples,
        visualComparison: 'not performed; lossy H.264 samples are not parity evidence',
      });
      await save();
    }
    receipt.status = 'passed';
    receipt.stage = 'complete';
    receipt.videoGate = options.frames ? 'not run (diagnostic PNGs only)'
      : options.variants.length === 2 ? 'passed' : 'not run (only one format verified)';
  } catch (error) {
    failure = error;
    receipt.status = 'failed';
    receipt.videoGate = 'not passed';
    receipt.error = error instanceof Error ? { name: error.name, message: error.message, stack: error.stack }
      : { message: String(error) };
  } finally {
    try {
      await browser?.close({ silent: true });
    } catch (error) {
      failure ??= error;
      receipt.status = 'failed';
      receipt.videoGate = 'not passed';
      receipt.cleanupError = String(error);
    }
    if (oldTemp === undefined) delete process.env.TEMP;
    else process.env.TEMP = oldTemp;
    if (oldTmp === undefined) delete process.env.TMP;
    else process.env.TMP = oldTmp;
    receipt.finishedAt = new Date().toISOString();
    receipt.elapsedMilliseconds = Date.now() - started;
    await save();
  }
  if (failure) throw failure;
}
